/**
 * Step Lifecycle Service
 * Manages AI SDK v5 multi-step streaming lifecycle
 *
 * Responsibilities:
 * - Create step records in database (prepareStep)
 * - Check and inject dynamic system messages
 * - Complete steps and update database (onStepFinish)
 * - Emit step events to clients
 * - Coordinate with token tracking for checkpoints
 *
 * Architecture:
 * - Uses AI SDK's native prepareStep and onStepFinish hooks
 * - Stateless (no step state beyond database)
 * - Event-driven (emits to observer)
 */

import { randomUUID } from "node:crypto";
import type { MessagePart, MessageRepository, SessionRepository } from "@sylphx/code-core";
import {
	checkAllTriggers,
	completeMessageStep,
	createMessageStep,
	updateStepParts,
} from "@sylphx/code-core";
import type { AppContext } from "../context.js";
import type { StreamEvent } from "./streaming.service.js";
import { recalculateTokensAtCheckpoint } from "./token-tracking.service.js";

/**
 * Prepare step before execution
 * Called by AI SDK's prepareStep hook
 *
 * Returns: Modified messages array with injected system messages (if any)
 */
export async function prepareStep(
	stepNumber: number,
	assistantMessageId: string,
	sessionId: string,
	messages: any[], // AI SDK ModelMessage[]
	steps: any[], // AI SDK previous steps
	sessionRepository: SessionRepository,
	messageRepository: MessageRepository,
	providerInstance: any,
	modelName: string,
	providerConfig: any,
	observer: {
		next: (event: StreamEvent) => void;
	},
	stepIdMap: Map<number, string>, // Track generated step IDs
): Promise<{ messages?: any[] } | {}> {
	try {
		// 1. Reload session to get latest state
		const currentSession = await sessionRepository.getSessionById(sessionId);
		if (!currentSession) {
			console.warn(`[StepLifecycle] Session ${sessionId} not found`);
			return {};
		}


		// 2. Calculate context token usage for triggers
		let contextTokens: { current: number; max: number } | undefined;
		try {
			let totalTokens = 0;
			for (const message of currentSession.messages) {
				if (message.usage) {
					totalTokens += message.usage.totalTokens;
				}
			}

			const modelDetails = await providerInstance.getModelDetails(modelName, providerConfig);
			const maxContextLength = modelDetails?.contextLength;

			if (maxContextLength && totalTokens > 0) {
				contextTokens = {
					current: totalTokens,
					max: maxContextLength,
				};
			}
		} catch (error) {
			console.error("[StepLifecycle] Failed to calculate context tokens:", error);
		}

		// 3. Check all triggers for this step
		const triggerResults = await checkAllTriggers(
			currentSession,
			messageRepository,
			sessionRepository,
			contextTokens,
		);

		// 4. Build SystemMessage array from trigger results (may be empty)
		const systemMessages =
			triggerResults.length > 0
				? triggerResults.map((trigger) => ({
						type: trigger.messageType || "unknown",
						content: trigger.message,
						timestamp: Date.now(),
					}))
				: [];

		// 4.5. Queue message injection DISABLED
		// ARCHITECTURE CHANGE: Queue processing moved to post-stream (stream-orchestrator.ts)
		// Reason: AI SDK's prepareStep continue flag doesn't work reliably in 5.x
		// New approach: After stream completes, check queue and trigger new stream recursively
		// This ensures ALL queued messages are sent together in one new stream
		let queuedUserMessage: any = null;

		// 5. Create step record in database with provider/model
		// IMPORTANT: Set provider/model at creation time for real-time UI sync
		// Use UUID for step ID to avoid collision issues with manual loop
		const stepId = randomUUID();

		// Store stepId in map for completeStep to use
		stepIdMap.set(stepNumber, stepId);

		try {
			await createMessageStep(
				sessionRepository.getDatabase(),
				assistantMessageId,
				stepNumber,
				undefined, // metadata
				undefined, // todoSnapshot (deprecated)
				systemMessages.length > 0 ? systemMessages : undefined,
				currentSession.provider, // provider from session
				currentSession.model, // model from session
				stepId, // Pass explicit UUID
			);
		} catch (stepError) {
			console.error("[StepLifecycle] Failed to create step:", stepError);
			throw stepError; // CRITICAL: Must propagate - can't continue without step record
		}

		// 6. Emit step-start event for UI
		observer.next({
			type: "step-start",
			stepId,
			stepIndex: stepNumber,
			todoSnapshot: [],
			systemMessages: systemMessages.length > 0 ? systemMessages : undefined,
			provider: currentSession.provider,
			model: currentSession.model,
		});

		// 7. Inject system messages and/or queued messages
		// Get base messages (from last step or initial messages)
		const baseMessages = steps.length > 0 ? steps[steps.length - 1].messages : messages;
		let modifiedMessages = baseMessages;

		// 7a. Inject system messages if present
		if (systemMessages.length > 0) {
			// Combine system messages (already wrapped in <system_message> tags)
			const combinedContent = systemMessages.map((sm) => sm.content).join("\n\n");

			// Append to last message to avoid consecutive user messages
			const lastMessage = modifiedMessages[modifiedMessages.length - 1];
			if (lastMessage && lastMessage.role === "user") {
				// Append system message to last user message
				const lastContent = lastMessage.content;
				const updatedContent = Array.isArray(lastContent)
					? [
							...lastContent,
							{
								type: "text" as const,
								text: `\n\n${combinedContent}`,
							},
						]
					: [{ type: "text" as const, text: combinedContent }];

				modifiedMessages = [
					...modifiedMessages.slice(0, -1),
					{ ...lastMessage, content: updatedContent },
				];
			} else {
				// Fallback: add as separate user message
				modifiedMessages = [
					...modifiedMessages,
					{
						role: "user" as const,
						content: [{ type: "text" as const, text: combinedContent }],
					},
				];
			}
		}

		// 7b. Queue injection REMOVED (now handled post-stream)

		// Return modified messages if any changes were made
		if (modifiedMessages !== baseMessages) {
			return {
				messages: modifiedMessages,
			};
		}

		return {}; // No modifications needed
	} catch (error) {
		console.error("[StepLifecycle] Error in prepareStep:", error);
		// Don't crash the stream, just skip modifications
		return {};
	}
}

/**
 * Complete step after execution
 * Called by AI SDK's onStepFinish hook
 */
export async function completeStep(
	stepNumber: number,
	assistantMessageId: string,
	sessionId: string,
	stepResult: any, // AI SDK StepResult
	currentStepParts: MessagePart[],
	sessionRepository: SessionRepository,
	messageRepository: MessageRepository,
	tokenTracker: any, // StreamingTokenTracker
	appContext: AppContext,
	observer: {
		next: (event: StreamEvent) => void;
	},
	session: { provider: string; model: string },
	cwd: string,
	stepIdMap: Map<number, string>, // Retrieve generated step ID
): Promise<number> {
	const stepStartTime = Date.now();
	try {
		// Retrieve stepId from map (generated in prepareStep)
		const stepId = stepIdMap.get(stepNumber);
		if (!stepId) {
			throw new Error(`Step ID not found for step ${stepNumber}`);
		}

		// Update tool results with AI SDK's wrapped format
		if (stepResult.toolResults && stepResult.toolResults.length > 0) {
			for (const toolResult of stepResult.toolResults) {
				const toolPart = currentStepParts.find(
					(p) => p.type === "tool" && p.toolId === toolResult.toolCallId,
				);

				if (toolPart && toolPart.type === "tool") {
					toolPart.result = toolResult.result;
				}
			}
		}

		// Update step parts (now with wrapped tool results)
		try {
			await updateStepParts(sessionRepository.getDatabase(), stepId, currentStepParts);
		} catch (dbError) {
			console.error(`[StepLifecycle] Failed to update step ${stepNumber} parts:`, dbError);
		}

		// Complete step
		try {
			await completeMessageStep(sessionRepository.getDatabase(), stepId, {
				status: "completed",
				finishReason: stepResult.finishReason,
				usage: stepResult.usage,
				provider: session.provider,
				model: session.model,
			});
		} catch (dbError) {
			console.error(`[StepLifecycle] Failed to complete step ${stepNumber}:`, dbError);
		}

		// Emit step-complete event
		const duration = Date.now() - stepStartTime;
		observer.next({
			type: "step-complete",
			stepId,
			usage: stepResult.usage || {
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
			},
			duration,
			finishReason: stepResult.finishReason || "unknown",
		});

		// Token checkpoint recalculation (Dynamic Recalculation)
		// ARCHITECTURE: NO database cache - all tokens calculated dynamically
		// Real-time updates during streaming were optimistic (in-memory)
		// This checkpoint recalculates accurate values and emits to all clients
		// CRITICAL: Uses MODEL messages (buildModelMessages) for accurate counting
		await recalculateTokensAtCheckpoint(
			sessionId,
			stepNumber,
			sessionRepository,
			messageRepository,
			tokenTracker,
			appContext,
			cwd,
		);

		return stepNumber;
	} catch (error) {
		console.error("[StepLifecycle] Error in completeStep:", error);
		return stepNumber;
	}
}
