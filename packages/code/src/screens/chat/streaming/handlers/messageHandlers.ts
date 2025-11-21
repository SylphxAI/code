/**
 * Message Event Handlers
 * Handles user, assistant, and system message creation and step events
 */

import {
	currentSession,
	eventBus,
	getCurrentSessionId,
	setCurrentSession,
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
	const currentSessionValue = currentSession.value;

	logMessage("User message created:", event.messageId);

	if (!currentSessionValue || currentSessionValue.id !== currentSessionId) {
		logMessage("Session mismatch! expected:", currentSessionId, "got:", currentSessionValue?.id);
		return;
	}

	// Check if message already exists (prevent duplicates from multiple event emissions)
	const messageExists = currentSessionValue.messages.some((m) => m.id === event.messageId);
	if (messageExists) {
		logMessage("Message already exists, skipping:", event.messageId);
		return;
	}

	// Find and replace optimistic message (temp-user-*)
	const optimisticIndex = currentSessionValue.messages.findIndex(
		(m) => m.role === "user" && m.id.startsWith("temp-user-"),
	);

	let updatedMessages: Message[];

	if (optimisticIndex !== -1) {
		// Replace optimistic message ID with server's ID
		updatedMessages = currentSessionValue.messages.map((msg, idx) =>
			idx === optimisticIndex ? { ...msg, id: event.messageId } : msg,
		);
		logMessage("Replaced optimistic message with server ID:", event.messageId);
	} else {
		// No optimistic message found (shouldn't happen), add new message
		updatedMessages = [
			...currentSessionValue.messages,
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

	setCurrentSession( {
		...currentSessionValue,
		messages: updatedMessages,
	});
}

export function handleAssistantMessageCreated(
	event: Extract<StreamEvent, { type: "assistant-message-created" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();
	const currentSessionValue = currentSession.value;

	logMessage("Message created:", event.messageId, "session:", currentSessionId);

	if (!currentSessionValue || currentSessionValue.id !== currentSessionId) {
		logMessage("Session mismatch! expected:", currentSessionId, "got:", currentSessionValue?.id);
		return;
	}

	// Check if message already exists (prevent duplicates during event replay)
	const messageExists = currentSessionValue.messages.some((m) => m.id === event.messageId);
	if (messageExists) {
		logMessage("Message already exists, skipping:", event.messageId);
		context.streamingMessageIdRef.current = event.messageId;
		return;
	}

	// Check for optimistic assistant message (temp-assistant-*) to reconcile
	const optimisticIndex = currentSessionValue.messages.findIndex(
		(m) => m.role === "assistant" && m.id.startsWith("temp-assistant-") && m.status === "active",
	);

	if (optimisticIndex !== -1) {
		// RECONCILE: Replace optimistic ID with server's real ID
		const updatedMessages = currentSessionValue.messages.map((msg, idx) =>
			idx === optimisticIndex ? { ...msg, id: event.messageId } : msg,
		);

		setCurrentSession({
			...currentSessionValue,
			messages: updatedMessages,
		});

		context.streamingMessageIdRef.current = event.messageId;
		logMessage("Reconciled optimistic assistant message with server ID:", event.messageId);
	} else {
		// No optimistic message found - add new one (fallback)
		const newMessage = {
			id: event.messageId,
			role: "assistant",
			content: [],
			timestamp: Date.now(),
			status: "active",
		};

		setCurrentSession({
			...currentSessionValue,
			messages: [...currentSessionValue.messages, newMessage],
		});

		context.streamingMessageIdRef.current = event.messageId;
		logMessage("Added assistant message (no optimistic), total:", currentSessionValue.messages.length + 1);
	}

	// Emit streaming:started event for store coordination
	if (currentSessionId) {
		eventBus.emit("streaming:started", {
			sessionId: currentSessionId,
			messageId: event.messageId,
		});
	}
}

export function handleSystemMessageCreated(
	event: Extract<StreamEvent, { type: "system-message-created" }>,
	_context: EventHandlerContext,
) {
	const currentSessionValue = currentSession.value;

	logMessage("System message created:", event.messageId);

	if (!currentSessionValue) {
		return;
	}

	// NOTE: Don't check session ID match - during session creation, currentSessionId
	// may be updated before currentSession, causing race condition.
	// Since this event comes from the subscription which is already filtered by session,
	// we can trust it belongs to the current session.

	// Check if message already exists (prevent duplicates)
	const messageExists = currentSessionValue.messages?.some((m) => m.id === event.messageId);
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

	const updatedMessages = [...currentSessionValue.messages, newMessage];

	setCurrentSession( {
		...currentSessionValue,
		messages: updatedMessages,
	});

	logMessage("Added system message, total:", currentSessionValue.messages.length + 1);
}

// ============================================================================
// Step Events
// ============================================================================

export function handleStepStart(
	event: Extract<StreamEvent, { type: "step-start" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();
	const currentSessionValue = currentSession.value;

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

	// Track current step index for content events
	context.currentStepIndexRef.current = event.stepIndex;

	// Create/update steps array in optimistic message
	if (currentSessionValue && context.streamingMessageIdRef.current) {
		const targetMsg = currentSessionValue.messages.find(
			(m) => m.id === context.streamingMessageIdRef.current,
		);

		// IDEMPOTENCY: Skip if message is already completed (event replay scenario)
		if (targetMsg?.status === "completed") {
			logMessage("Skipping step-start for completed message:", context.streamingMessageIdRef.current);
			context.skipContentForStepRef.current = true;
			return;
		}

		const updatedMessages = currentSessionValue.messages.map((msg) => {
			if (msg.id !== context.streamingMessageIdRef.current) return msg;

			// Initialize steps array if not exists
			const steps = msg.steps || [];

			// Check if step already exists (avoid duplicates)
			const existingStepIndex = steps.findIndex((s) => s.stepIndex === event.stepIndex);

			if (existingStepIndex === -1) {
				// New step - don't skip content events
				context.skipContentForStepRef.current = false;

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

			// Step already exists - skip content events for this step (replay scenario)
			logMessage("Step already exists, skipping content for step:", event.stepIndex);
			context.skipContentForStepRef.current = true;
			return msg;
		});

		setCurrentSession( {
			...currentSessionValue,
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
	context: EventHandlerContext,
) {
	logMessage("Step completed:", event.stepId, "duration:", event.duration, "ms");
	// Reset skip flag for next step
	context.skipContentForStepRef.current = false;
	context.currentStepIndexRef.current = null;

	// Accumulate output tokens from this step
	if (event.usage?.completionTokens) {
		context.setStreamingOutputTokens((prev) => prev + event.usage.completionTokens);
	}
}
