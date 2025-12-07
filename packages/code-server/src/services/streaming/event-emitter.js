/**
 * Event Emitter
 * Centralized event emission helpers for streaming service
 */
/**
 * Emit session-created event
 */
export function emitSessionCreated(observer, sessionId, provider, model) {
    observer.next({
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
export function emitSessionUpdated(observer, sessionId, session) {
    observer.next({
        type: "session-updated",
        sessionId,
        session,
    });
}
/**
 * @deprecated Use emitSessionUpdated with full session model
 * Emit session-status-updated event
 * Updates unified progress indicator (status text, duration, tokens)
 */
export function emitSessionStatusUpdated(observer, sessionId, status) {
    observer.next({
        type: "session-status-updated",
        sessionId,
        status,
    });
}
/**
 * Emit user-message-created event
 */
export function emitUserMessageCreated(observer, messageId, content) {
    observer.next({
        type: "user-message-created",
        messageId,
        content,
    });
}
/**
 * Emit assistant-message-created event
 */
export function emitAssistantMessageCreated(observer, messageId) {
    observer.next({
        type: "assistant-message-created",
        messageId,
    });
}
/**
 * Emit system-message-created event
 */
export function emitSystemMessageCreated(observer, messageId, content) {
    observer.next({
        type: "system-message-created",
        messageId,
        content,
    });
}
/**
 * Emit message-updated event (model-level)
 * Sends full message model for optimistic updates and real-time sync
 */
export function emitMessageUpdated(observer, messageId, message) {
    observer.next({
        type: "message-updated",
        messageId,
        message,
    });
}
/**
 * @deprecated Use emitMessageUpdated with full message model
 * Emit message-status-updated event
 */
export function emitMessageStatusUpdated(observer, messageId, status, finishReason, usage) {
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
export function emitError(observer, error) {
    observer.next({
        type: "error",
        error,
    });
}
/**
 * Emit text-start event
 */
export function emitTextStart(observer) {
    observer.next({ type: "text-start" });
}
/**
 * Emit text-delta event
 */
export function emitTextDelta(observer, text) {
    observer.next({ type: "text-delta", text });
}
/**
 * Emit text-end event
 */
export function emitTextEnd(observer) {
    observer.next({ type: "text-end" });
}
/**
 * Emit reasoning-start event
 */
export function emitReasoningStart(observer) {
    observer.next({ type: "reasoning-start" });
}
/**
 * Emit reasoning-delta event
 */
export function emitReasoningDelta(observer, text) {
    observer.next({ type: "reasoning-delta", text });
}
/**
 * Emit reasoning-end event
 */
export function emitReasoningEnd(observer, duration) {
    observer.next({ type: "reasoning-end", duration });
}
/**
 * Emit tool-call event
 */
export function emitToolCall(observer, toolCallId, toolName, input, startTime) {
    observer.next({ type: "tool-call", toolCallId, toolName, input, startTime });
}
/**
 * Emit tool-input-start event
 */
export function emitToolInputStart(observer, toolCallId, startTime) {
    observer.next({ type: "tool-input-start", toolCallId, startTime });
}
/**
 * Emit tool-input-delta event
 */
export function emitToolInputDelta(observer, toolCallId, inputTextDelta) {
    observer.next({ type: "tool-input-delta", toolCallId, inputTextDelta });
}
/**
 * Emit tool-input-end event
 */
export function emitToolInputEnd(observer, toolCallId) {
    observer.next({ type: "tool-input-end", toolCallId });
}
/**
 * Emit tool-result event
 */
export function emitToolResult(observer, toolCallId, toolName, result, duration) {
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
export function emitToolError(observer, toolCallId, toolName, error, duration) {
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
export function emitFile(observer, mediaType, base64) {
    observer.next({ type: "file", mediaType, base64 });
}
/**
 * Emit ask-question-start event
 * Broadcasts to all clients that ask tool is waiting for user input
 */
export function emitAskQuestionStart(observer, sessionId, toolCallId, question, options, multiSelect, preSelected) {
    observer.next({
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
export function emitAskQuestionAnswered(observer, sessionId, toolCallId, answer) {
    observer.next({
        type: "ask-question-answered",
        sessionId,
        toolCallId,
        answer,
    });
}
//# sourceMappingURL=event-emitter.js.map