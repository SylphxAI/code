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

import type { AppContext } from "../context.js";
import type { MessageRepository } from "@sylphx/code-core";
import {
	TokenCalculator,
	StreamingTokenTracker,
	calculateModelMessagesTokens,
	buildModelMessages,
	calculateBaseContextTokens,
	getModel,
} from "@sylphx/code-core";

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
): Promise<StreamingTokenTracker> {
	const calculator = new TokenCalculator(session.model);

	// Calculate base context tokens (dynamic, no cache)
	const baseContextTokens = await calculateBaseContextTokens(
		session.model,
		session.agentId,
		session.enabledRuleIds,
		cwd,
	);

	// Calculate existing message tokens
	let messagesTokens = 0;
	if (session.messages && session.messages.length > 0) {
		const modelEntity = getModel(session.model);
		const modelCapabilities = modelEntity?.capabilities;
		const fileRepo = messageRepository.getFileRepository();

		const modelMessages = await buildModelMessages(
			session.messages,
			modelCapabilities,
			fileRepo,
		);

		messagesTokens = await calculateModelMessagesTokens(modelMessages, session.model);
	}

	const baselineTotal = baseContextTokens + messagesTokens;
	const tokenTracker = new StreamingTokenTracker(calculator, baselineTotal);

	return tokenTracker;
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

		// Emit immediate update (optimistic value, not SSOT)
		// User requirement: "反正有任何異動都要即刻通知client去實時更新"
		await appContext.eventStream.publish(`session:${sessionId}`, {
			type: "session-tokens-updated" as const,
			sessionId,
			totalTokens: currentTotal,
			baseContextTokens: baseContextTokens,
		});
	} catch (error) {
		// Non-critical - don't interrupt streaming
		console.error("[TokenTracking] Failed to update from delta:", error);
	}
}

/**
 * Recalculate tokens at checkpoint (step completion)
 * Provides accurate count and resets tracker baseline
 */
export async function recalculateTokensAtCheckpoint(
	sessionId: string,
	stepNumber: number,
	sessionRepository: any,
	messageRepository: MessageRepository,
	tokenTracker: StreamingTokenTracker,
	appContext: AppContext,
	cwd: string,
): Promise<void> {
	try {
		// Refetch updated session (has latest messages after step completion)
		const updatedSession = await sessionRepository.getSessionById(sessionId);
		if (!updatedSession) {
			console.error("[TokenTracking] Session not found for checkpoint");
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

		// Emit to all clients (multi-client real-time sync)
		await appContext.eventStream.publish(`session:${sessionId}`, {
			type: "session-tokens-updated" as const,
			sessionId,
			totalTokens,
			baseContextTokens: recalculatedBaseContext,
		});


		// Reset tracker with new baseline (for next streaming chunk)
		tokenTracker.reset(totalTokens);
	} catch (error) {
		console.error("[TokenTracking] Failed to recalculate at checkpoint:", error);
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
	try {
		// Refetch final session state
		const finalSession = await sessionRepository.getSessionById(sessionId);
		if (!finalSession) {
			throw new Error("Session not found for final token calculation");
		}

		// Recalculate base context (dynamic - reflects current agent/rules)
		const finalBaseContext = await calculateBaseContextTokens(
			finalSession.model,
			finalSession.agentId,
			finalSession.enabledRuleIds,
			cwd,
		);

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

			finalMessages = await calculateModelMessagesTokens(
				modelMessages,
				finalSession.model,
			);
		}

		const finalTotal = finalBaseContext + finalMessages;

		// Emit event with calculated token data (send data on needed)
		// Publish to session-specific channel (same as other streaming events)
		// All clients receive token data immediately without additional API calls
		await appContext.eventStream.publish(`session:${sessionId}`, {
			type: "session-tokens-updated" as const,
			sessionId,
			totalTokens: finalTotal,
			baseContextTokens: finalBaseContext,
		});

	} catch (error) {
		console.error("[TokenTracking] Failed to calculate final tokens:", error);
	}
}
