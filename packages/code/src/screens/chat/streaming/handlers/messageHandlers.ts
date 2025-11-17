/**
 * Message Event Handlers
 * Handles user, assistant, and system message creation and step events
 */

import {
	currentSession,
	eventBus,
	getCurrentSessionId,
	get as getSignal,
	set as setSignal,
} from "@sylphx/code-client";
import type { Message, MessagePart } from "@sylphx/code-core";
import { createLogger } from "@sylphx/code-core";
import type { StreamEvent } from "@sylphx/code-server";
import type { EventHandlerContext } from "../types.js";
import { updateActiveMessageContent } from "../utils.js";

// Create debug logger
const logMessage = createLogger("subscription:message");

// ============================================================================
// Message Events
// ============================================================================

export function handleUserMessageCreated(
	event: Extract<StreamEvent, { type: "user-message-created" }>,
	_context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();
	const currentSession = getSignal(currentSession);

	logMessage("User message created:", event.messageId);

	if (!currentSession || currentSession.id !== currentSessionId) {
		logMessage("Session mismatch! expected:", currentSessionId, "got:", currentSession?.id);
		return;
	}

	// Check if message already exists (prevent duplicates from multiple event emissions)
	const messageExists = currentSession.messages.some((m) => m.id === event.messageId);
	if (messageExists) {
		logMessage("Message already exists, skipping:", event.messageId);
		return;
	}

	// Find and replace optimistic message (temp-user-*)
	const optimisticIndex = currentSession.messages.findIndex(
		(m) => m.role === "user" && m.id.startsWith("temp-user-"),
	);

	let updatedMessages: Message[];

	if (optimisticIndex !== -1) {
		// Replace optimistic message ID with server's ID
		updatedMessages = currentSession.messages.map((msg, idx) =>
			idx === optimisticIndex ? { ...msg, id: event.messageId } : msg,
		);
		logMessage("Replaced optimistic message with server ID:", event.messageId);
	} else {
		// No optimistic message found (shouldn't happen), add new message
		updatedMessages = [
			...currentSession.messages,
			{
				id: event.messageId,
				role: "user",
				content: [{ type: "text", content: event.content, status: "completed" }],
				timestamp: Date.now(),
				status: "completed",
			},
		];
		logMessage("Added user message (no optimistic found), total:", updatedMessages.length);
	}

	setSignal(currentSession, {
		...currentSession,
		messages: updatedMessages,
	});
}

export function handleAssistantMessageCreated(
	event: Extract<StreamEvent, { type: "assistant-message-created" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();
	const currentSession = getSignal(currentSession);

	context.streamingMessageIdRef.current = event.messageId;
	logMessage("Message created:", event.messageId, "session:", currentSessionId);

	// Start streaming UI
	context.setIsStreaming(true);

	// Emit streaming:started event for store coordination
	if (currentSessionId) {
		eventBus.emit("streaming:started", {
			sessionId: currentSessionId,
			messageId: event.messageId,
		});
	}

	if (!currentSession || currentSession.id !== currentSessionId) {
		logMessage("Session mismatch! expected:", currentSessionId, "got:", currentSession?.id);
		return;
	}

	// Check if message already exists (prevent duplicates)
	const messageExists = currentSession.messages.some((m) => m.id === event.messageId);
	if (messageExists) {
		logMessage("Message already exists, skipping:", event.messageId);
		return;
	}

	// Add new assistant message to session
	const newMessage = {
		id: event.messageId,
		role: "assistant",
		content: [],
		timestamp: Date.now(),
		status: "active",
	};

	setSignal(currentSession, {
		...currentSession,
		messages: [...currentSession.messages, newMessage],
	});

	logMessage("Added assistant message, total:", currentSession.messages.length + 1);
}

export function handleSystemMessageCreated(
	event: Extract<StreamEvent, { type: "system-message-created" }>,
	_context: EventHandlerContext,
) {
	const currentSession = getSignal(currentSession);

	logMessage("System message created:", event.messageId);

	if (!currentSession) {
		return;
	}

	// NOTE: Don't check session ID match - during session creation, currentSessionId
	// may be updated before currentSession, causing race condition.
	// Since this event comes from the subscription which is already filtered by session,
	// we can trust it belongs to the current session.

	// Check if message already exists (prevent duplicates)
	const messageExists = currentSession.messages?.some((m) => m.id === event.messageId);
	if (messageExists) {
		logMessage("System message already exists, skipping:", event.messageId);
		return;
	}

	// Add new system message to session (completed, not streaming)
	const newMessage = {
		id: event.messageId,
		role: "system",
		content: [{ type: "text", content: event.content }],
		timestamp: Date.now(),
		status: "completed",
	};

	const updatedMessages = [...currentSession.messages, newMessage];

	setSignal(currentSession, {
		...currentSession,
		messages: updatedMessages,
	});

	logMessage("Added system message, total:", currentSession.messages.length + 1);
}

// ============================================================================
// Step Events
// ============================================================================

export function handleStepStart(
	event: Extract<StreamEvent, { type: "step-start" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();
	const currentSession = getSignal(currentSession);

	logMessage(
		"Step started:",
		event.stepId,
		"index:",
		event.stepIndex,
		"provider:",
		event.provider,
		"model:",
		event.model,
		"systemMessages:",
		event.systemMessages?.length || 0,
	);

	// Create/update steps array in optimistic message
	if (currentSession && context.streamingMessageIdRef.current) {
		const updatedMessages = currentSession.messages.map((msg) => {
			if (msg.id !== context.streamingMessageIdRef.current) return msg;

			// Initialize steps array if not exists
			const steps = msg.steps || [];

			// Check if step already exists (avoid duplicates)
			const existingStepIndex = steps.findIndex((s) => s.stepIndex === event.stepIndex);

			if (existingStepIndex === -1) {
				// Add new step with provider/model
				const newStep = {
					id: event.stepId,
					stepIndex: event.stepIndex,
					parts: [],
					status: "active" as const,
					provider: event.provider,
					model: event.model,
				};

				return {
					...msg,
					steps: [...steps, newStep],
				};
			}

			return msg;
		});

		setSignal(currentSession, {
			...currentSession,
			messages: updatedMessages,
		});
	}

	// If there are system messages, add them to the active message content
	if (event.systemMessages && event.systemMessages.length > 0) {
		logMessage("Adding", event.systemMessages.length, "system messages to active message");

		updateActiveMessageContent(currentSessionId, context.streamingMessageIdRef.current, (prev) => {
			// Add each system message as a 'system-message' part
			const systemMessageParts = event.systemMessages?.map(
				(sm) =>
					({
						type: "system-message" as const,
						content: sm.content,
						messageType: sm.type,
						timestamp: sm.timestamp,
						status: "completed" as const,
					}) as MessagePart,
			);

			return [...prev, ...systemMessageParts];
		});
	}
}

export function handleStepComplete(
	event: Extract<StreamEvent, { type: "step-complete" }>,
	_context: EventHandlerContext,
) {
	logMessage("Step completed:", event.stepId, "duration:", event.duration, "ms");
}
