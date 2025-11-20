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
export async function createUserMessage(
	sessionId: string,
	frozenContent: MessagePart[],
	messageRepository: MessageRepository,
	observer: {
		next: (event: StreamEvent) => void;
	},
): Promise<{ messageId: string; messageText: string }> {
	// Add user message to session (with frozen content)
	const userMessageId = await messageRepository.addMessage({
		sessionId,
		role: "user",
		content: frozenContent,
	});

	// Extract text content for display (omit file details)
	const userMessageText = frozenContent
		.map((part) => {
			if (part.type === "text") return part.content;
			if (part.type === "file" && "relativePath" in part) return `@${part.relativePath}`;
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
export async function createAssistantMessage(
	sessionId: string,
	messageRepository: MessageRepository,
	observer: {
		next: (event: StreamEvent) => void;
	},
): Promise<string> {
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
export async function updateMessageStatus(
	messageId: string,
	status: "active" | "completed" | "error" | "abort",
	finishReason: string | undefined,
	usage: any | undefined,
	messageRepository: MessageRepository,
	observer: {
		next: (event: StreamEvent) => void;
	},
): Promise<void> {
	try {
		await messageRepository.updateMessageStatus(messageId, status, finishReason);

		// Emit message-status-updated event (unified status change event)
		observer.next({
			type: "message-status-updated",
			messageId: messageId,
			status: status,
			usage: usage,
			finishReason: finishReason,
		});
	} catch (dbError) {
		console.error("[MessagePersistence] Failed to update message status:", dbError);
		// Continue - not critical for user experience
	}
}

/**
 * Create system message to notify LLM about abort
 * Only for USER-INITIATED abort (via ESC key)
 */
export async function createAbortNotificationMessage(
	sessionId: string,
	aiConfig: any,
	messageRepository: MessageRepository,
	observer: {
		next: (event: StreamEvent) => void;
	},
): Promise<void> {
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
	} catch (systemMessageError) {
		console.error(
			"[MessagePersistence] Failed to create abort notification system message:",
			systemMessageError,
		);
		// Continue - not critical for user experience
	}
}
