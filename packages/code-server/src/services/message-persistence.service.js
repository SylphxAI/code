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
/**
 * Create user message with frozen content
 * Files are read once and frozen as base64 for immutable history
 */
export async function createUserMessage(sessionId, frozenContent, messageRepository, observer) {
    // Add user message to session (with frozen content)
    const userMessageId = await messageRepository.addMessage({
        sessionId,
        role: "user",
        content: frozenContent,
    });
    // Extract text content for display (omit file details)
    const userMessageText = frozenContent
        .map((part) => {
        if (part.type === "text")
            return part.content;
        if (part.type === "file" && "relativePath" in part)
            return `@${part.relativePath}`;
        return "";
    })
        .filter(Boolean)
        .join("");
    // Emit user-message-created event
    observer.next({
        type: "user-message-created",
        messageId: userMessageId,
        content: userMessageText,
    });
    return { messageId: userMessageId, messageText: userMessageText };
}
/**
 * Create assistant message (before streaming starts)
 * Returns message ID for step creation
 */
export async function createAssistantMessage(sessionId, messageRepository, observer) {
    // Create assistant message in database BEFORE stream (need ID for prepareStep)
    const assistantMessageId = await messageRepository.addMessage({
        sessionId,
        role: "assistant",
        content: [], // Empty content initially
        status: "active",
    });
    // Emit assistant message created event
    observer.next({
        type: "assistant-message-created",
        messageId: assistantMessageId,
    });
    return assistantMessageId;
}
/**
 * Update message status after streaming completes
 */
export async function updateMessageStatus(messageId, status, finishReason, usage, messageRepository, observer) {
    try {
        await messageRepository.updateMessageStatus(messageId, status, finishReason);
        // Emit message-updated event (model-level: partial message with changed fields)
        // Frontend subscription will merge this with existing message
        observer.next({
            type: "message-updated",
            messageId: messageId,
            message: {
                id: messageId,
                status: status,
                usage: usage,
                finishReason: finishReason,
            },
        });
    }
    catch (dbError) {
        console.error("[MessagePersistence] Failed to update message status:", dbError);
        // Continue - not critical for user experience
    }
}
/**
 * Create system message to notify LLM about abort
 * Only for USER-INITIATED abort (via ESC key)
 */
export async function createAbortNotificationMessage(sessionId, aiConfig, messageRepository, observer) {
    if (!aiConfig.notifyLLMOnAbort) {
        return; // Feature disabled
    }
    try {
        const systemMessageId = await messageRepository.addMessage({
            sessionId,
            role: "system",
            content: [
                {
                    type: "text",
                    content: "Previous assistant message was aborted by user.",
                    status: "completed",
                },
            ],
            status: "completed",
        });
        // Emit system-message-created event
        observer.next({
            type: "system-message-created",
            messageId: systemMessageId,
            content: "Previous assistant message was aborted by user.",
        });
    }
    catch (systemMessageError) {
        console.error("[MessagePersistence] Failed to create abort notification system message:", systemMessageError);
        // Continue - not critical for user experience
    }
}
//# sourceMappingURL=message-persistence.service.js.map