/**
 * Content Event Handlers
 * Handles reasoning, text, and file content streaming
 */

import { createLogger } from "@sylphx/code-core";
import type { StreamEvent } from "@sylphx/code-server";
import type { EventHandlerContext } from "../types.js";
import { updateActiveMessageContent } from "../utils.js";
import { getCurrentSessionId } from "../../../../session-state.js";

// Create debug logger
const logContent = createLogger("subscription:content");

// ============================================================================
// Reasoning Events
// ============================================================================

export function handleReasoningStart(
	_event: Extract<StreamEvent, { type: "reasoning-start" }>,
	context: EventHandlerContext,
) {
	// Skip if replaying events for an existing step
	if (context.skipContentForStepRef.current) {
		return;
	}

	const currentSessionId = getCurrentSessionId();

	logContent("Reasoning start, session:", currentSessionId);
	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) => {
			// Idempotency: Don't add duplicate reasoning part during event replay
			// Check if there's already a completed reasoning part (replay scenario)
			const hasCompletedReasoning = prev.some((p) => p.type === "reasoning" && p.status === "completed");
			if (hasCompletedReasoning) {
				logContent("Completed reasoning part already exists, skipping duplicate");
				return prev;
			}
			// Also skip if there's an active reasoning (duplicate start event)
			const hasActiveReasoning = prev.some((p) => p.type === "reasoning" && p.status === "active");
			if (hasActiveReasoning) {
				return prev;
			}
			return [
				...prev,
				{
					type: "reasoning" as const,
					content: "",
					status: "active" as const,
					startTime: Date.now(),
				},
			];
		},
		true, // skipIfCompleted
	);
}

export function handleReasoningDelta(
	event: Extract<StreamEvent, { type: "reasoning-delta" }>,
	context: EventHandlerContext,
) {
	// Skip if replaying events for an existing step
	if (context.skipContentForStepRef.current) {
		return;
	}

	const currentSessionId = getCurrentSessionId();

	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) => {
			// Only append to active reasoning part
			const activeReasoningIndex = prev.findIndex(
				(p) => p.type === "reasoning" && p.status === "active",
			);
			if (activeReasoningIndex === -1) {
				// No active reasoning - skip (replay scenario where reasoning is already completed)
				return prev;
			}
			const newParts = [...prev];
			const reasoningPart = newParts[activeReasoningIndex];
			if (reasoningPart && reasoningPart.type === "reasoning") {
				newParts[activeReasoningIndex] = {
					...reasoningPart,
					content: reasoningPart.content + event.text,
				};
			}
			return newParts;
		},
		true, // skipIfCompleted
	);
}

export function handleReasoningEnd(
	event: Extract<StreamEvent, { type: "reasoning-end" }>,
	context: EventHandlerContext,
) {
	// Skip if replaying events for an existing step
	if (context.skipContentForStepRef.current) {
		return;
	}

	const currentSessionId = getCurrentSessionId();

	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) => {
			const newParts = [...prev];
			const lastReasoningIndex = newParts
				.map((p, i) => ({ p, i }))
				.reverse()
				.find(({ p }) => p.type === "reasoning" && p.status === "active")?.i;

			if (lastReasoningIndex !== undefined) {
				const reasoningPart = newParts[lastReasoningIndex];
				if (reasoningPart && reasoningPart.type === "reasoning") {
					newParts[lastReasoningIndex] = {
						...reasoningPart,
						status: "completed" as const,
						duration: event.duration,
					};
				}
			}
			return newParts;
		},
		true, // skipIfCompleted
	);
}

// ============================================================================
// Text Events
// ============================================================================

export function handleTextStart(
	_event: Extract<StreamEvent, { type: "text-start" }>,
	context: EventHandlerContext,
) {
	// Skip if replaying events for an existing step
	if (context.skipContentForStepRef.current) {
		return;
	}

	const currentSessionId = getCurrentSessionId();

	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) => {
			// Idempotency: Don't add duplicate text part during event replay
			const hasText = prev.some((p) => p.type === "text");
			if (hasText) {
				return prev;
			}
			return [...prev, { type: "text" as const, content: "", status: "active" as const }];
		},
		true, // skipIfCompleted
	);
}

export function handleTextDelta(
	event: Extract<StreamEvent, { type: "text-delta" }>,
	context: EventHandlerContext,
) {
	// Skip if replaying events for an existing step
	if (context.skipContentForStepRef.current) {
		return;
	}

	const currentSessionId = getCurrentSessionId();

	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) => {
			const newParts = [...prev];
			const lastPart = newParts[newParts.length - 1];

			if (lastPart && lastPart.type === "text" && lastPart.status === "active") {
				// Append to existing active text
				newParts[newParts.length - 1] = {
					type: "text",
					content: lastPart.content + event.text,
					status: "active" as const,
				};
			} else {
				// Idempotency: Skip if completed text already exists (replay scenario)
				const hasCompletedText = prev.some((p) => p.type === "text" && p.status === "completed");
				if (hasCompletedText) {
					return prev;
				}
				// Create new text part (normal case)
				newParts.push({
					type: "text",
					content: event.text,
					status: "active" as const,
				});
			}

			return newParts;
		},
		true, // skipIfCompleted
	);
}

export function handleTextEnd(
	_event: Extract<StreamEvent, { type: "text-end" }>,
	context: EventHandlerContext,
) {
	// Skip if replaying events for an existing step
	if (context.skipContentForStepRef.current) {
		return;
	}

	const currentSessionId = getCurrentSessionId();

	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) => {
			const newParts = [...prev];
			const lastTextIndex = newParts
				.map((p, i) => ({ p, i }))
				.reverse()
				.find(({ p }) => p.type === "text" && p.status === "active")?.i;

			if (lastTextIndex !== undefined) {
				const textPart = newParts[lastTextIndex];
				if (textPart && textPart.type === "text") {
					newParts[lastTextIndex] = {
						...textPart,
						status: "completed" as const,
					};
				}
			}

			return newParts;
		},
		true, // skipIfCompleted
	);
}

// ============================================================================
// File Events
// ============================================================================

export function handleFile(
	event: Extract<StreamEvent, { type: "file" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();

	logContent("File received, mediaType:", event.mediaType, "size:", event.base64.length);
	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) => {
			// Idempotency: Don't add duplicate file with same base64 during event replay
			const existingFile = prev.find(
				(p) => p.type === "file" && p.base64 === event.base64,
			);
			if (existingFile) {
				return prev;
			}
			return [
				...prev,
				{
					type: "file" as const,
					relativePath: "", // Not provided in stream event
					size: Math.round((event.base64.length * 3) / 4), // Approximate from base64
					mediaType: event.mediaType,
					base64: event.base64,
					status: "completed" as const,
				},
			];
		},
		true, // skipIfCompleted
	);
}
