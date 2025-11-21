/**
 * Tool Event Handlers
 * Handles tool call lifecycle including input streaming
 */

import { getCurrentSessionId } from "@sylphx/code-client";
import type { StreamEvent } from "@sylphx/code-server";
import type { EventHandlerContext } from "../types.js";
import { updateActiveMessageContent } from "../utils.js";

// ============================================================================
// Tool Events
// ============================================================================

export function handleToolCall(
	event: Extract<StreamEvent, { type: "tool-call" }>,
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
			// Check if tool part already exists (from tool-input-start)
			const existingToolPart = prev.find((p) => p.type === "tool" && p.toolId === event.toolCallId);

			if (existingToolPart && existingToolPart.type === "tool") {
				// Idempotency: Skip if tool is already completed (replay scenario)
				if (existingToolPart.status === "completed") {
					return prev;
				}
				// Update existing tool part with name (input already set by tool-input-end)
				return prev.map((p) =>
					p.type === "tool" && p.toolId === event.toolCallId ? { ...p, name: event.toolName } : p,
				);
			} else {
				// Idempotency: Skip if there's already a completed tool with same name (different toolId but same tool)
				// This handles cases where toolId might differ between live and replay
				const hasCompletedSameTool = prev.some(
					(p) => p.type === "tool" && p.name === event.toolName && p.status === "completed",
				);
				if (hasCompletedSameTool) {
					return prev;
				}
				// No streaming - create new tool part with complete input
				return [
					...prev,
					{
						type: "tool" as const,
						toolId: event.toolCallId,
						name: event.toolName,
						status: "active" as const,
						input: event.input,
						startTime: event.startTime,
					},
				];
			}
		},
		true, // skipIfCompleted
	);
}

export function handleToolInputStart(
	event: Extract<StreamEvent, { type: "tool-input-start" }>,
	context: EventHandlerContext,
) {
	// Skip if replaying events for an existing step
	if (context.skipContentForStepRef.current) {
		return;
	}

	const currentSessionId = getCurrentSessionId();

	// Create tool part with empty input (will be populated by deltas)
	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) => {
			// Idempotency: Don't add duplicate tool part during event replay
			const existingTool = prev.find((p) => p.type === "tool" && p.toolId === event.toolCallId);
			if (existingTool) {
				return prev;
			}
			// Also check if there are any completed tools (replay scenario)
			// If step already has completed tools, skip adding new ones
			const hasCompletedTools = prev.some((p) => p.type === "tool" && p.status === "completed");
			if (hasCompletedTools) {
				return prev;
			}
			return [
				...prev,
				{
					type: "tool" as const,
					toolId: event.toolCallId,
					name: "", // Will be set when tool-call completes
					status: "active" as const,
					input: "", // Will be populated by deltas as JSON string
					startTime: event.startTime,
				},
			];
		},
		true, // skipIfCompleted
	);
}

export function handleToolInputDelta(
	event: Extract<StreamEvent, { type: "tool-input-delta" }>,
	context: EventHandlerContext,
) {
	// Skip if replaying events for an existing step
	if (context.skipContentForStepRef.current) {
		return;
	}

	const currentSessionId = getCurrentSessionId();

	// Update tool input as it streams in
	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) => {
			const newParts = [...prev];
			// Find the tool part by toolId
			const toolPart = newParts.find(
				(p) => p.type === "tool" && p.toolId === event.toolCallId && p.status === "active",
			);

			if (toolPart && toolPart.type === "tool") {
				// Accumulate input as JSON text string
				const currentInput = typeof toolPart.input === "string" ? toolPart.input : "";
				toolPart.input = currentInput + event.inputTextDelta;
			}

			return newParts;
		},
		true, // skipIfCompleted
	);
}

export function handleToolInputEnd(
	event: Extract<StreamEvent, { type: "tool-input-end" }>,
	context: EventHandlerContext,
) {
	// Skip if replaying events for an existing step
	if (context.skipContentForStepRef.current) {
		return;
	}

	const currentSessionId = getCurrentSessionId();

	// Parse accumulated JSON input
	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) => {
			const newParts = [...prev];
			const toolPart = newParts.find(
				(p) => p.type === "tool" && p.toolId === event.toolCallId && p.status === "active",
			);

			if (toolPart && toolPart.type === "tool") {
				try {
					// Parse accumulated JSON string
					const inputText = typeof toolPart.input === "string" ? toolPart.input : "";
					toolPart.input = inputText ? JSON.parse(inputText) : {};
				} catch (_e) {
					console.error("[handleToolInputEnd] Failed to parse tool input:", toolPart.input);
					toolPart.input = {};
				}
			}

			return newParts;
		},
		true, // skipIfCompleted
	);
}

export function handleToolResult(
	event: Extract<StreamEvent, { type: "tool-result" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();

	// NOTE: Don't use skipIfCompleted here - tool-result needs to update even for completed messages
	// during event replay. This is idempotent (updates existing tool part with same result).
	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) =>
			prev.map((part) =>
				part.type === "tool" && part.toolId === event.toolCallId
					? {
							...part,
							status: "completed" as const,
							duration: event.duration,
							result: event.result,
						}
					: part,
			),
		false, // Don't skip for completed - result updates are idempotent
	);

	// Refetch session if updateTodos tool completed (todos were updated in database)
	if (event.toolName === "updateTodos" && currentSessionId) {
		import("../../../utils/refetch-session.js").then(({ refetchCurrentSession }) => {
			refetchCurrentSession(currentSessionId).catch((err) => {
				console.error("[handleToolResult] Failed to refetch session after updateTodos:", err);
			});
		});
	}
}

export function handleToolError(
	event: Extract<StreamEvent, { type: "tool-error" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();

	// NOTE: Don't use skipIfCompleted here - tool-error needs to update even for completed messages
	// during event replay. This is idempotent (updates existing tool part with same error).
	updateActiveMessageContent(
		currentSessionId,
		context.streamingMessageIdRef.current,
		(prev) =>
			prev.map((part) =>
				part.type === "tool" && part.toolId === event.toolCallId
					? {
							...part,
							status: "error" as const,
							error: event.error,
							duration: event.duration,
						}
					: part,
			),
		false, // Don't skip for completed - error updates are idempotent
	);
}
