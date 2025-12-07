/**
 * Message Persistence Service
 * Handles all database operations for messages during streaming
 *
 * Responsibilities:
 * - Create user messages with frozen file content
 * - Create assistant messages
 * - Update message status
 * - Create system messages (e.g., abort notifications)
 * - Emit message-level events
 */
import type { MessagePart, MessageRepository } from "@sylphx/code-core";
import type { StreamEvent } from "./streaming.service.js";
/**
 * Create user message with frozen content
 * Files are read once and frozen as base64 for immutable history
 */
export declare function createUserMessage(sessionId: string, frozenContent: MessagePart[], messageRepository: MessageRepository, observer: {
    next: (event: StreamEvent) => void;
}): Promise<{
    messageId: string;
    messageText: string;
}>;
/**
 * Create assistant message (before streaming starts)
 * Returns message ID for step creation
 */
export declare function createAssistantMessage(sessionId: string, messageRepository: MessageRepository, observer: {
    next: (event: StreamEvent) => void;
}): Promise<string>;
/**
 * Update message status after streaming completes
 */
export declare function updateMessageStatus(messageId: string, status: "active" | "completed" | "error" | "abort", finishReason: string | undefined, usage: any | undefined, messageRepository: MessageRepository, observer: {
    next: (event: StreamEvent) => void;
}): Promise<void>;
/**
 * Create system message to notify LLM about abort
 * Only for USER-INITIATED abort (via ESC key)
 */
export declare function createAbortNotificationMessage(sessionId: string, aiConfig: any, messageRepository: MessageRepository, observer: {
    next: (event: StreamEvent) => void;
}): Promise<void>;
//# sourceMappingURL=message-persistence.service.d.ts.map