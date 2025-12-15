/**
 * Token Tracking Service
 * Real-time token calculation and tracking during streaming
 *
 * Responsibilities:
 * - Initialize token tracker with baseline
 * - Update tokens incrementally from text deltas
 * - Emit token update events to clients
 * - Checkpoint recalculation on step completion
 *
 * Architecture:
 * - NO database cache (volatile state)
 * - Content-based caching (in TokenCalculator)
 * - Optimistic updates during streaming
 * - Accurate recalculation at checkpoints
 */

import type { MessageRepository } from "@sylphx/code-core";
import {
	buildModelMessages,
	calculateBaseContextTokens,
	calculateModelMessagesTokens,
	createLogger,
	getModel,
	StreamingTokenTracker,
	TokenCalculator,
} from "@sylphx/code-core";
import type { AppContext } from "../context.js";

const log = createLogger("token-tracking");

/**
 * Initialize token tracking for a session
 * Calculates baseline (base context + existing messages)
 */
export async function initializeTokenTracking(
	sessionId: string,
	session: {
		model: string;
		agentId: string;
		enabledRuleIds: string[];
		messages: any[];
	},
	messageRepository: MessageRepository,
	cwd: string,
	appContext: AppContext,
): Promise<{ tracker: StreamingTokenTracker; baseContextTokens: number }> {
	log("initializeTokenTracking START sessionId=%s model=%s agentId=%s messages=%d",
		sessionId, session.model, session.agentId, session.messages?.length || 0);

	const calculator = new TokenCalculator(session.model);

	// Calculate base context tokens (dynamic, no cache)
	const baseContextTokens = await calculateBaseContextTokens(
		session.model,
		session.agentId,
		session.enabledRuleIds,
		cwd,
	);
	log("initializeTokenTracking baseContextTokens=%d", baseContextTokens);

	// Calculate existing message tokens
	let messagesTokens = 0;
	if (session.messages && session.messages.length > 0) {
		const modelEntity = getModel(session.model);
		const modelCapabilities = modelEntity?.capabilities;
		const fileRepo = messageRepository.getFileRepository();

		const modelMessages = await buildModelMessages(session.messages, modelCapabilities, fileRepo);

		messagesTokens = await calculateModelMessagesTokens(modelMessages, session.model);
		log("initializeTokenTracking messagesTokens=%d (from %d messages)", messagesTokens, session.messages.length);
	}

	const baselineTotal = baseContextTokens + messagesTokens;
	log("initializeTokenTracking baselineTotal=%d (base=%d + messages=%d)",
		baselineTotal, baseContextTokens, messagesTokens);

	const tokenTracker = new StreamingTokenTracker(calculator, baselineTotal);

	// Emit initial baseline tokens immediately when streaming starts
	// This ensures status bar shows tokens even during "Thinking..." phase
	try {
		const channel = `session-stream:${sessionId}`;
		const event = {
			type: "session-tokens-updated" as const,
			sessionId,
			totalTokens: baselineTotal,
			baseContextTokens,
			outputTokens: 0, // No output tokens yet (just baseline)
		};
		log("initializeTokenTracking EMIT channel=%s event=%o", channel, event);
		await appContext.eventStream.publish(channel, event);
		log("initializeTokenTracking EMIT SUCCESS");
	} catch (error) {
		log("initializeTokenTracking EMIT FAILED error=%o", error);
	}

	log("initializeTokenTracking END baselineTotal=%d", baselineTotal);
	return { tracker: tokenTracker, baseContextTokens };
}

/**
 * Update tokens from streaming text delta
 * Emits optimistic update event immediately
 */
export async function updateTokensFromDelta(
	tokenTracker: StreamingTokenTracker,
	deltaText: string,
	sessionId: string,
	baseContextTokens: number,
	appContext: AppContext,
): Promise<void> {
	try {
		// Add delta to tracker (optimistic, not persisted)
		const currentTotal = await tokenTracker.addDelta(deltaText);
		const outputTokens = tokenTracker.getStreamingDelta();

		// Emit immediate update (optimistic value, not SSOT)
		await appContext.eventStream.publish(`session-stream:${sessionId}`, {
			type: "session-tokens-updated" as const,
			sessionId,
			totalTokens: currentTotal,
			baseContextTokens: baseContextTokens,
			outputTokens, // Current streaming output tokens for status indicator
		});
	} catch (error) {
		// Non-critical - don't interrupt streaming
		log("updateTokensFromDelta FAILED error=%o", error);
	}
}

/**
 * Recalculate tokens at checkpoint (step completion)
 * Provides accurate count and resets tracker baseline
 */
export async function recalculateTokensAtCheckpoint(
	sessionId: string,
	_stepNumber: number,
	sessionRepository: any,
	messageRepository: MessageRepository,
	tokenTracker: StreamingTokenTracker,
	appContext: AppContext,
	cwd: string,
): Promise<void> {
	log("recalculateTokensAtCheckpoint START sessionId=%s", sessionId);
	try {
		// Refetch updated session (has latest messages after step completion)
		const updatedSession = await sessionRepository.getSessionById(sessionId);
		if (!updatedSession) {
			log("recalculateTokensAtCheckpoint FAILED session not found");
			return;
		}

		// Recalculate base context (dynamic - can change mid-session)
		const recalculatedBaseContext = await calculateBaseContextTokens(
			updatedSession.model,
			updatedSession.agentId,
			updatedSession.enabledRuleIds,
			cwd,
		);

		// Recalculate messages tokens using current model's tokenizer
		let recalculatedMessages = 0;
		if (updatedSession.messages && updatedSession.messages.length > 0) {
			const modelEntity = getModel(updatedSession.model);
			const modelCapabilities = modelEntity?.capabilities;
			const fileRepo = messageRepository.getFileRepository();

			const modelMessages = await buildModelMessages(
				updatedSession.messages,
				modelCapabilities,
				fileRepo,
			);

			recalculatedMessages = await calculateModelMessagesTokens(
				modelMessages,
				updatedSession.model,
			);
		}

		const totalTokens = recalculatedBaseContext + recalculatedMessages;
		log("recalculateTokensAtCheckpoint totalTokens=%d (base=%d + messages=%d)",
			totalTokens, recalculatedBaseContext, recalculatedMessages);

		// Emit to all clients (multi-client real-time sync)
		const channel = `session-stream:${sessionId}`;
		const event = {
			type: "session-tokens-updated" as const,
			sessionId,
			totalTokens,
			baseContextTokens: recalculatedBaseContext,
		};
		log("recalculateTokensAtCheckpoint EMIT channel=%s", channel);
		await appContext.eventStream.publish(channel, event);

		// Reset tracker with new baseline (for next streaming chunk)
		tokenTracker.reset(totalTokens);
		log("recalculateTokensAtCheckpoint END");
	} catch (error) {
		log("recalculateTokensAtCheckpoint FAILED error=%o", error);
	}
}

/**
 * Final token calculation after streaming completes
 * Ensures accurate final count is sent to all clients
 */
export async function calculateFinalTokens(
	sessionId: string,
	sessionRepository: any,
	messageRepository: MessageRepository,
	appContext: AppContext,
	cwd: string,
): Promise<void> {
	log("calculateFinalTokens START sessionId=%s", sessionId);
	try {
		// Refetch final session state
		const finalSession = await sessionRepository.getSessionById(sessionId);
		if (!finalSession) {
			log("calculateFinalTokens FAILED session not found");
			throw new Error("Session not found for final token calculation");
		}
		log("calculateFinalTokens session loaded messages=%d", finalSession.messages?.length || 0);

		// Recalculate base context (dynamic - reflects current agent/rules)
		const finalBaseContext = await calculateBaseContextTokens(
			finalSession.model,
			finalSession.agentId,
			finalSession.enabledRuleIds,
			cwd,
		);
		log("calculateFinalTokens finalBaseContext=%d", finalBaseContext);

		// Recalculate messages tokens using current model's tokenizer
		let finalMessages = 0;
		if (finalSession.messages && finalSession.messages.length > 0) {
			const modelEntity = getModel(finalSession.model);
			const modelCapabilities = modelEntity?.capabilities;
			const fileRepo = messageRepository.getFileRepository();

			const modelMessages = await buildModelMessages(
				finalSession.messages,
				modelCapabilities,
				fileRepo,
			);

			finalMessages = await calculateModelMessagesTokens(modelMessages, finalSession.model);
			log("calculateFinalTokens finalMessages=%d", finalMessages);
		}

		const finalTotal = finalBaseContext + finalMessages;
		log("calculateFinalTokens finalTotal=%d (base=%d + messages=%d)",
			finalTotal, finalBaseContext, finalMessages);

		// Persist token data to database (critical for accurate cumulative count!)
		// Without this, each new message would start token counting from 0
		log("calculateFinalTokens PERSIST to database...");
		await sessionRepository.updateSessionTokens(sessionId, {
			totalTokens: finalTotal,
			baseContextTokens: finalBaseContext,
		});
		log("calculateFinalTokens PERSIST SUCCESS");

		// Emit event with calculated token data (send data on needed)
		// Token updates go to streaming channel
		// All clients receive token data immediately without additional API calls
		const channel = `session-stream:${sessionId}`;
		const event = {
			type: "session-tokens-updated" as const,
			sessionId,
			totalTokens: finalTotal,
			baseContextTokens: finalBaseContext,
		};
		log("calculateFinalTokens EMIT channel=%s event=%o", channel, event);
		await appContext.eventStream.publish(channel, event);
		log("calculateFinalTokens EMIT SUCCESS");

		log("calculateFinalTokens END finalTotal=%d", finalTotal);
	} catch (error) {
		log("calculateFinalTokens FAILED error=%o", error);
	}
}
