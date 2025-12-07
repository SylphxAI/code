/**
 * Event Emitter
 * Centralized event emission helpers for streaming service
 */
import type { SessionStatus, TokenUsage } from "@sylphx/code-core";
import type { Observer } from "@trpc/server/observable";
import type { StreamEvent } from "./types.js";
/**
 * Emit session-created event
 */
export declare function emitSessionCreated(observer: Observer<StreamEvent, unknown>, sessionId: string, provider: string, model: string): void;
/**
 * Emit session-updated event (model-level)
 * Sends full session model for optimistic updates and real-time sync
 */
export declare function emitSessionUpdated(observer: Observer<StreamEvent, unknown>, sessionId: string, session: {
    id: string;
    title: string;
    status?: SessionStatus;
    totalTokens?: number;
    baseContextTokens?: number;
    provider?: string;
    model?: string;
    updatedAt?: number;
}): void;
/**
 * @deprecated Use emitSessionUpdated with full session model
 * Emit session-status-updated event
 * Updates unified progress indicator (status text, duration, tokens)
 */
export declare function emitSessionStatusUpdated(observer: Observer<StreamEvent, unknown>, sessionId: string, status: SessionStatus): void;
/**
 * Emit user-message-created event
 */
export declare function emitUserMessageCreated(observer: Observer<StreamEvent, unknown>, messageId: string, content: string): void;
/**
 * Emit assistant-message-created event
 */
export declare function emitAssistantMessageCreated(observer: Observer<StreamEvent, unknown>, messageId: string): void;
/**
 * Emit system-message-created event
 */
export declare function emitSystemMessageCreated(observer: Observer<StreamEvent, unknown>, messageId: string, content: string): void;
/**
 * Emit message-updated event (model-level)
 * Sends full message model for optimistic updates and real-time sync
 */
export declare function emitMessageUpdated(observer: Observer<StreamEvent, unknown>, messageId: string, message: {
    id: string;
    status?: "active" | "completed" | "error" | "abort";
    usage?: TokenUsage;
    finishReason?: string;
    content?: any[];
}): void;
/**
 * @deprecated Use emitMessageUpdated with full message model
 * Emit message-status-updated event
 */
export declare function emitMessageStatusUpdated(observer: Observer<StreamEvent, unknown>, messageId: string, status: "active" | "completed" | "error" | "abort", finishReason?: string, usage?: TokenUsage): void;
/**
 * Emit error event
 */
export declare function emitError(observer: Observer<StreamEvent, unknown>, error: string): void;
/**
 * Emit text-start event
 */
export declare function emitTextStart(observer: Observer<StreamEvent, unknown>): void;
/**
 * Emit text-delta event
 */
export declare function emitTextDelta(observer: Observer<StreamEvent, unknown>, text: string): void;
/**
 * Emit text-end event
 */
export declare function emitTextEnd(observer: Observer<StreamEvent, unknown>): void;
/**
 * Emit reasoning-start event
 */
export declare function emitReasoningStart(observer: Observer<StreamEvent, unknown>): void;
/**
 * Emit reasoning-delta event
 */
export declare function emitReasoningDelta(observer: Observer<StreamEvent, unknown>, text: string): void;
/**
 * Emit reasoning-end event
 */
export declare function emitReasoningEnd(observer: Observer<StreamEvent, unknown>, duration: number): void;
/**
 * Emit tool-call event
 */
export declare function emitToolCall(observer: Observer<StreamEvent, unknown>, toolCallId: string, toolName: string, input: any, startTime: number): void;
/**
 * Emit tool-input-start event
 */
export declare function emitToolInputStart(observer: Observer<StreamEvent, unknown>, toolCallId: string, startTime: number): void;
/**
 * Emit tool-input-delta event
 */
export declare function emitToolInputDelta(observer: Observer<StreamEvent, unknown>, toolCallId: string, inputTextDelta: string): void;
/**
 * Emit tool-input-end event
 */
export declare function emitToolInputEnd(observer: Observer<StreamEvent, unknown>, toolCallId: string): void;
/**
 * Emit tool-result event
 */
export declare function emitToolResult(observer: Observer<StreamEvent, unknown>, toolCallId: string, toolName: string, result: any, duration: number): void;
/**
 * Emit tool-error event
 */
export declare function emitToolError(observer: Observer<StreamEvent, unknown>, toolCallId: string, toolName: string, error: string, duration: number): void;
/**
 * Emit file event
 */
export declare function emitFile(observer: Observer<StreamEvent, unknown>, mediaType: string, base64: string): void;
/**
 * Emit ask-question-start event
 * Broadcasts to all clients that ask tool is waiting for user input
 */
export declare function emitAskQuestionStart(observer: Observer<StreamEvent, unknown>, sessionId: string, toolCallId: string, question: string, options: Array<{
    label: string;
    value?: string;
    description?: string;
    freeText?: boolean;
    placeholder?: string;
}>, multiSelect?: boolean, preSelected?: string[]): void;
/**
 * Emit ask-question-answered event
 * Broadcasts to all clients that question has been answered
 */
export declare function emitAskQuestionAnswered(observer: Observer<StreamEvent, unknown>, sessionId: string, toolCallId: string, answer: string): void;
//# sourceMappingURL=event-emitter.d.ts.map