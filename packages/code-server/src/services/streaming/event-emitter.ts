/**
 * Event Emitter
 * Centralized event emission helpers for streaming service
 *
 * Uses StreamPublisher interface for direct eventStream publishing.
 * No more tRPC Observable/Observer pattern.
 */

import type { SessionStatus, TokenUsage } from "@sylphx/code-core";
import type { StreamPublisher } from "./types.js";

/**
 * Emit session-created event
 */
export function emitSessionCreated(
	publisher: StreamPublisher,
	sessionId: string,
	provider: string,
	model: string,
): void {
	publisher.emit({
		type: "session-created",
		sessionId,
		provider,
		model,
	});
}

/**
 * Emit session-updated event (model-level)
 * Sends full session model for optimistic updates and real-time sync
 */
export function emitSessionUpdated(
	publisher: StreamPublisher,
	sessionId: string,
	session: {
		id: string;
		title?: string;
		status?: SessionStatus;
		totalTokens?: number;
		baseContextTokens?: number;
		provider?: string;
		model?: string;
		updatedAt?: number;
	},
): void {
	publisher.emit({
		type: "session-updated",
		sessionId,
		session,
	});
}


/**
 * Emit system-message-created event
 */
export function emitSystemMessageCreated(
	publisher: StreamPublisher,
	messageId: string,
	content: string,
): void {
	publisher.emit({
		type: "system-message-created",
		messageId,
		content,
	});
}

/**
 * Emit message-updated event (model-level)
 * Sends full message model for optimistic updates and real-time sync
 */
export function emitMessageUpdated(
	publisher: StreamPublisher,
	messageId: string,
	message: {
		id: string;
		status?: "active" | "completed" | "error" | "abort";
		usage?: TokenUsage;
		finishReason?: string;
		content?: any[];
	},
): void {
	publisher.emit({
		type: "message-updated",
		messageId,
		message,
	});
}

/**
 * Emit error event
 */
export function emitError(publisher: StreamPublisher, error: string): void {
	publisher.emit({
		type: "error",
		error,
	});
}

/**
 * Emit text-start event
 */
export function emitTextStart(publisher: StreamPublisher): void {
	publisher.emit({ type: "text-start" });
}

/**
 * Emit text-delta event
 */
export function emitTextDelta(publisher: StreamPublisher, text: string): void {
	publisher.emit({ type: "text-delta", text });
}

/**
 * Emit text-end event
 */
export function emitTextEnd(publisher: StreamPublisher): void {
	publisher.emit({ type: "text-end" });
}

/**
 * Emit reasoning-start event
 */
export function emitReasoningStart(publisher: StreamPublisher): void {
	publisher.emit({ type: "reasoning-start" });
}

/**
 * Emit reasoning-delta event
 */
export function emitReasoningDelta(publisher: StreamPublisher, text: string): void {
	publisher.emit({ type: "reasoning-delta", text });
}

/**
 * Emit reasoning-end event
 */
export function emitReasoningEnd(publisher: StreamPublisher, duration: number): void {
	publisher.emit({ type: "reasoning-end", duration });
}

// ============================================================================
// Inline Action Events (streaming XML tags)
// ============================================================================

/**
 * Emit title-start event
 */
export function emitTitleStart(publisher: StreamPublisher): void {
	publisher.emit({ type: "title-start" });
}

/**
 * Emit title-delta event
 */
export function emitTitleDelta(publisher: StreamPublisher, text: string): void {
	publisher.emit({ type: "title-delta", text });
}

/**
 * Emit title-end event
 */
export function emitTitleEnd(publisher: StreamPublisher): void {
	publisher.emit({ type: "title-end" });
}

/**
 * Emit suggestions-start event
 */
export function emitSuggestionsStart(publisher: StreamPublisher): void {
	publisher.emit({ type: "suggestions-start" });
}

/**
 * Emit suggestion-start event
 */
export function emitSuggestionStart(publisher: StreamPublisher, index: number): void {
	publisher.emit({ type: "suggestion-start", index });
}

/**
 * Emit suggestion-delta event
 */
export function emitSuggestionDelta(
	publisher: StreamPublisher,
	index: number,
	text: string,
): void {
	publisher.emit({ type: "suggestion-delta", index, text });
}

/**
 * Emit suggestion-end event
 */
export function emitSuggestionEnd(publisher: StreamPublisher, index: number): void {
	publisher.emit({ type: "suggestion-end", index });
}

/**
 * Emit suggestions-end event
 */
export function emitSuggestionsEnd(publisher: StreamPublisher): void {
	publisher.emit({ type: "suggestions-end" });
}

/**
 * Emit tool-call event
 */
export function emitToolCall(
	publisher: StreamPublisher,
	toolCallId: string,
	toolName: string,
	input: any,
	startTime: number,
): void {
	publisher.emit({ type: "tool-call", toolCallId, toolName, input, startTime });
}

/**
 * Emit tool-input-start event
 */
export function emitToolInputStart(
	publisher: StreamPublisher,
	toolCallId: string,
	startTime: number,
): void {
	publisher.emit({ type: "tool-input-start", toolCallId, startTime });
}

/**
 * Emit tool-input-delta event
 */
export function emitToolInputDelta(
	publisher: StreamPublisher,
	toolCallId: string,
	inputTextDelta: string,
): void {
	publisher.emit({ type: "tool-input-delta", toolCallId, inputTextDelta });
}

/**
 * Emit tool-input-end event
 */
export function emitToolInputEnd(
	publisher: StreamPublisher,
	toolCallId: string,
): void {
	publisher.emit({ type: "tool-input-end", toolCallId });
}

/**
 * Emit tool-result event
 */
export function emitToolResult(
	publisher: StreamPublisher,
	toolCallId: string,
	toolName: string,
	result: any,
	duration: number,
): void {
	publisher.emit({
		type: "tool-result",
		toolCallId,
		toolName,
		result,
		duration,
	});
}

/**
 * Emit tool-error event
 */
export function emitToolError(
	publisher: StreamPublisher,
	toolCallId: string,
	toolName: string,
	error: string,
	duration: number,
): void {
	publisher.emit({
		type: "tool-error",
		toolCallId,
		toolName,
		error,
		duration,
	});
}

/**
 * Emit file event
 */
export function emitFile(
	publisher: StreamPublisher,
	mediaType: string,
	base64: string,
): void {
	publisher.emit({ type: "file", mediaType, base64 });
}

/**
 * Emit ask-question-start event
 * Broadcasts to all clients that ask tool is waiting for user input
 */
export function emitAskQuestionStart(
	publisher: StreamPublisher,
	sessionId: string,
	toolCallId: string,
	question: string,
	options: Array<{
		label: string;
		value?: string;
		description?: string;
		freeText?: boolean;
		placeholder?: string;
	}>,
	multiSelect?: boolean,
	preSelected?: string[],
): void {
	publisher.emit({
		type: "ask-question-start",
		sessionId,
		toolCallId,
		question,
		options,
		multiSelect,
		preSelected,
	});
}

/**
 * Emit ask-question-answered event
 * Broadcasts to all clients that question has been answered
 */
export function emitAskQuestionAnswered(
	publisher: StreamPublisher,
	sessionId: string,
	toolCallId: string,
	answer: string,
): void {
	publisher.emit({
		type: "ask-question-answered",
		sessionId,
		toolCallId,
		answer,
	});
}
