/**
 * Error and Status Event Handlers
 * Handles error events and message status updates
 */

import {
	currentSession,
	getCurrentSessionId,
	setCurrentSession,
} from "@sylphx/code-client";
import type { MessagePart } from "@sylphx/code-core";
import { createLogger } from "@sylphx/code-core";
import type { StreamEvent } from "@sylphx/code-server";
import type { EventHandlerContext } from "../types.js";
import { updateActiveMessageContent } from "../utils.js";

// Create debug logger
const logContent = createLogger("subscription:content");

// ============================================================================
// Error Events
// ============================================================================

export function handleError(
	event: Extract<StreamEvent, { type: "error" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();

	logContent("Error event received:", event.error);

	updateActiveMessageContent(currentSessionId, context.streamingMessageIdRef.current, (prev) => {
		const newContent = [
			...prev,
			{
				type: "error",
				error: event.error,
				status: "completed",
			} as MessagePart,
		];
		logContent("Updated content with error, total parts:", newContent.length);
		return newContent;
	});

	// Stop streaming UI indicator on error
	context.setIsStreaming(false);
	context.setStreamingStartTime(null);
	context.setStreamingOutputTokens(0);
}

/**
 * Handle message-updated event (MODEL-LEVEL EVENT)
 *
 * Receives partial message with changed fields from server.
 * Merges changes with existing message state.
 *
 * Model-level architecture:
 * - Server emits message-updated with partial message (only changed fields)
 * - Client merges partial message with existing message
 * - Update strategies (delta/patch/value) handle transmission optimization
 * - All clients receive same model-level event → multi-client sync
 */
export function handleMessageUpdated(
	event: Extract<StreamEvent, { type: "message-updated" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();
	const currentSessionValue = currentSession.value;

	context.addLog(`[StreamEvent] Message updated (model-level): ${event.messageId}`, event.message);

	// Update message in session (merge partial message with existing)
	if (currentSessionValue?.messages.some((m) => m.id === event.messageId)) {
		const updatedMessages = currentSessionValue.messages.map((msg) =>
			msg.id === event.messageId
				? {
						...msg,
						...event.message, // Merge partial message fields
					}
				: msg,
		);

		setCurrentSession({
			...currentSessionValue,
			messages: updatedMessages,
		});
	}

	// If this is the currently streaming message, clean up streaming state
	if (context.streamingMessageIdRef.current === event.messageId && event.message.status) {
		// Mark all active parts with the final status
		// For reasoning parts without duration, calculate elapsed time
		updateActiveMessageContent(currentSessionId, event.messageId, (prev) =>
			prev.map((part) => {
				if (part.status !== "active") return part;

				const updatedPart = { ...part, status: event.message.status! };

				// If reasoning part without duration, calculate elapsed time
				if (part.type === "reasoning" && !part.duration && part.startTime) {
					updatedPart.duration = Date.now() - part.startTime;
				}

				return updatedPart;
			}),
		);

		// Clear streaming state (only if message completed/error/abort)
		if (["completed", "error", "abort"].includes(event.message.status!)) {
			context.streamingMessageIdRef.current = null;
			context.setIsStreaming(false);
			context.setStreamingStartTime(null);
			context.setStreamingOutputTokens(0);
		}
	}
}
