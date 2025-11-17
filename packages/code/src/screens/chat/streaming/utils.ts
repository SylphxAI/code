/**
 * Stream Event Handler Utilities
 * Shared helper functions used across all event handlers
 */

import { currentSession, setCurrentSession } from "@sylphx/code-client";
import type { MessagePart } from "@sylphx/code-core";
import { createLogger } from "@sylphx/code-core";

const logContent = createLogger("subscription:content");

/**
 * Helper to update active message content in SessionStore
 * Exported for use in error handlers and cleanup
 * Uses immutable updates (no Immer middleware)
 *
 * ARCHITECTURE: Updates current step's parts, not message.content
 * - Message has steps[] array, each step has parts[] array
 * - UI renders from msg.steps[].parts (MessageList.tsx line 300-302)
 * - This function updates the LAST (current) step's parts array
 */
export function updateActiveMessageContent(
	currentSessionId: string | null,
	messageId: string | null | undefined,
	updater: (prev: MessagePart[]) => MessagePart[],
) {
	const session = currentSession();

	if (!session || session.id !== currentSessionId) {
		logContent("Session mismatch! expected:", currentSessionId, "got:", session?.id);
		return;
	}

	// Find message by ID if provided, otherwise find any active message
	// When messageId is provided, find by ID regardless of status (allows updating parts after status change)
	const activeMessage = messageId
		? session.messages.find((m) => m.id === messageId)
		: session.messages.find((m) => m.status === "active");

	if (!activeMessage) {
		logContent(
			"No active message found! messages:",
			session.messages.length,
			"messageId:",
			messageId,
		);
		return;
	}

	// FIX: Update current step's parts array, not msg.content
	// Find the last (current) step - this is where streaming content goes
	const updatedMessages = session.messages.map((msg) => {
		if (msg.id !== activeMessage.id) return msg;

		// Get current step (last step in array)
		const steps = msg.steps || [];
		if (steps.length === 0) {
			logContent("No steps found! Creating default step. messageId:", msg.id);
			// Shouldn't happen (step-start creates step), but handle gracefully
			return {
				...msg,
				steps: [
					{
						id: "step-0",
						stepIndex: 0,
						parts: updater([]),
						status: "active" as const,
					},
				],
			};
		}

		const currentStepIndex = steps.length - 1;
		const _currentStep = steps[currentStepIndex];

		// Update current step's parts
		const updatedSteps = steps.map((step, idx) =>
			idx === currentStepIndex ? { ...step, parts: updater(step.parts || []) } : step,
		);

		return { ...msg, steps: updatedSteps };
	});

	// Update signal with new session object
	setCurrentSession({
		...session,
		messages: updatedMessages,
	});
}
