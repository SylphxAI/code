/**
 * Event Emitter
 * Centralized event emission helpers for streaming service
 */

import type { Observer } from "@trpc/server/observable";
import type { StreamEvent } from "./types.js";
import type { TokenUsage } from "@sylphx/code-core";

/**
 * Emit session-created event
 */
export function emitSessionCreated(
	observer: Observer<StreamEvent, unknown>,
	sessionId: string,
	provider: string,
	model: string,
): void {
	observer.next({
		type: "session-created",
		sessionId,
		provider,
		model,
	});
}

/**
 * Emit user-message-created event
 */
export function emitUserMessageCreated(
	observer: Observer<StreamEvent, unknown>,
	messageId: string,
	content: string,
): void {
	observer.next({
		type: "user-message-created",
		messageId,
		content,
	});
}

/**
 * Emit assistant-message-created event
 */
export function emitAssistantMessageCreated(
	observer: Observer<StreamEvent, unknown>,
	messageId: string,
): void {
	observer.next({
		type: "assistant-message-created",
		messageId,
	});
}

/**
 * Emit system-message-created event
 */
export function emitSystemMessageCreated(
	observer: Observer<StreamEvent, unknown>,
	messageId: string,
	content: string,
): void {
	observer.next({
		type: "system-message-created",
		messageId,
		content,
	});
}

/**
 * Emit message-status-updated event
 */
export function emitMessageStatusUpdated(
	observer: Observer<StreamEvent, unknown>,
	messageId: string,
	status: "active" | "completed" | "error" | "abort",
	finishReason?: string,
	usage?: TokenUsage,
): void {
	observer.next({
		type: "message-status-updated",
		messageId,
		status,
		usage,
		finishReason,
	});
}

/**
 * Emit error event
 */
export function emitError(observer: Observer<StreamEvent, unknown>, error: string): void {
	observer.next({
		type: "error",
		error,
	});
}

/**
 * Emit text-start event
 */
export function emitTextStart(observer: Observer<StreamEvent, unknown>): void {
	observer.next({ type: "text-start" });
}

/**
 * Emit text-delta event
 */
export function emitTextDelta(observer: Observer<StreamEvent, unknown>, text: string): void {
	observer.next({ type: "text-delta", text });
}

/**
 * Emit text-end event
 */
export function emitTextEnd(observer: Observer<StreamEvent, unknown>): void {
	observer.next({ type: "text-end" });
}

/**
 * Emit reasoning-start event
 */
export function emitReasoningStart(observer: Observer<StreamEvent, unknown>): void {
	observer.next({ type: "reasoning-start" });
}

/**
 * Emit reasoning-delta event
 */
export function emitReasoningDelta(observer: Observer<StreamEvent, unknown>, text: string): void {
	observer.next({ type: "reasoning-delta", text });
}

/**
 * Emit reasoning-end event
 */
export function emitReasoningEnd(observer: Observer<StreamEvent, unknown>, duration: number): void {
	observer.next({ type: "reasoning-end", duration });
}

/**
 * Emit tool-call event
 */
export function emitToolCall(
	observer: Observer<StreamEvent, unknown>,
	toolCallId: string,
	toolName: string,
	input: any,
): void {
	observer.next({ type: "tool-call", toolCallId, toolName, input });
}

/**
 * Emit tool-input-start event
 */
export function emitToolInputStart(
	observer: Observer<StreamEvent, unknown>,
	toolCallId: string,
): void {
	observer.next({ type: "tool-input-start", toolCallId });
}

/**
 * Emit tool-input-delta event
 */
export function emitToolInputDelta(
	observer: Observer<StreamEvent, unknown>,
	toolCallId: string,
	inputTextDelta: string,
): void {
	observer.next({ type: "tool-input-delta", toolCallId, inputTextDelta });
}

/**
 * Emit tool-input-end event
 */
export function emitToolInputEnd(
	observer: Observer<StreamEvent, unknown>,
	toolCallId: string,
): void {
	observer.next({ type: "tool-input-end", toolCallId });
}

/**
 * Emit tool-result event
 */
export function emitToolResult(
	observer: Observer<StreamEvent, unknown>,
	toolCallId: string,
	toolName: string,
	result: any,
	duration: number,
): void {
	observer.next({
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
	observer: Observer<StreamEvent, unknown>,
	toolCallId: string,
	toolName: string,
	error: string,
	duration: number,
): void {
	observer.next({
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
	observer: Observer<StreamEvent, unknown>,
	mediaType: string,
	base64: string,
): void {
	observer.next({ type: "file", mediaType, base64 });
}
