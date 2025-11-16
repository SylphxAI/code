/**
 * Ask Tool Event Handlers
 * Handlers for ask-question-start and ask-question-answered events
 */

import type { StreamEvent } from "@sylphx/code-server";
import type { EventHandler } from "../types.js";
import { getCurrentSessionId } from "@sylphx/code-client";

/**
 * Handle ask-question-start event
 * Sets pendingInput to display question UI and stores context for answer submission
 */
export const handleAskQuestionStart: EventHandler<
	Extract<StreamEvent, { type: "ask-question-start" }>
> = (event, context) => {
	const currentSessionId = getCurrentSessionId();

	// Only process if event is for current session
	if (event.sessionId !== currentSessionId) {
		return;
	}

	const { setPendingInput, askToolContextRef } = context;

	// Store ask tool context for answer submission
	if (askToolContextRef) {
		askToolContextRef.current = {
			sessionId: event.sessionId,
			toolCallId: event.toolCallId,
		};
	}

	// Set pendingInput to show question UI
	setPendingInput({
		type: "selection",
		questions: [
			{
				question: event.question,
				header: "Ask", // Short label for chip
				options: event.options.map((opt) => ({
					label: opt.label,
					description: opt.description || "",
				})),
				multiSelect: event.multiSelect || false,
			},
		],
	});
};

/**
 * Handle ask-question-answered event
 * Clears pendingInput and ask tool context after answer is submitted
 */
export const handleAskQuestionAnswered: EventHandler<
	Extract<StreamEvent, { type: "ask-question-answered" }>
> = (event, context) => {
	const currentSessionId = getCurrentSessionId();

	// Only process if event is for current session
	if (event.sessionId !== currentSessionId) {
		return;
	}

	const { setPendingInput, askToolContextRef } = context;

	// Clear ask tool context
	if (askToolContextRef) {
		askToolContextRef.current = null;
	}

	// Clear pendingInput - answer was submitted
	setPendingInput(null);

	// Optional: Could show brief "Answer submitted" message
	// For now, just clear
};
