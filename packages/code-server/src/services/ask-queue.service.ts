/**
 * Ask Queue Service
 * Server-side per-session ask queue management for multi-client sync
 *
 * ARCHITECTURE:
 * - Server manages one queue per session (not global)
 * - Ask tool execution creates pending ask in session
 * - Any connected client can answer
 * - All clients receive events via eventStream subscription
 * - Restorable from message parts
 *
 * Uses direct eventStream publishing (no Observer pattern)
 */

import type { AppContext } from "../context.js";

export interface AskQuestion {
	id: string; // Unique ID for this ask (toolCallId)
	sessionId: string;
	question: string;
	options: Array<{
		label: string;
		value?: string;
		description?: string;
		freeText?: boolean;
		placeholder?: string;
	}>;
	multiSelect?: boolean;
	preSelected?: string[];
	resolve: (answer: string) => void;
	reject: (reason: Error) => void;
	createdAt: number;
}

/**
 * Per-session ask queues
 * Map<sessionId, AskQuestion[]>
 */
const sessionAskQueues = new Map<string, AskQuestion[]>();

/**
 * Currently processing ask per session
 * Map<sessionId, AskQuestion>
 */
const processingAsks = new Map<string, AskQuestion>();

/**
 * AppContext reference for eventStream publishing
 */
let appContextRef: AppContext | null = null;

/**
 * Initialize ask queue service with app context
 * Must be called before using the service
 */
export function initializeAskQueue(appContext: AppContext): void {
	appContextRef = appContext;
}

/**
 * Publish ask-question-start event to eventStream
 */
function publishAskQuestionStart(
	sessionId: string,
	ask: AskQuestion,
): void {
	if (!appContextRef) {
		console.error("[AskQueue] AppContext not initialized");
		return;
	}

	appContextRef.eventStream
		.publish(`session-stream:${sessionId}`, {
			type: "ask-question-start",
			sessionId,
			toolCallId: ask.id,
			question: ask.question,
			options: ask.options,
			multiSelect: ask.multiSelect,
			preSelected: ask.preSelected,
		})
		.catch((err) => {
			console.error("[AskQueue] Failed to publish ask-question-start:", err);
		});
}

/**
 * Publish ask-question-answered event to eventStream
 */
function publishAskQuestionAnswered(
	sessionId: string,
	toolCallId: string,
	answer: string,
): void {
	if (!appContextRef) {
		console.error("[AskQueue] AppContext not initialized");
		return;
	}

	appContextRef.eventStream
		.publish(`session-stream:${sessionId}`, {
			type: "ask-question-answered",
			sessionId,
			toolCallId,
			answer,
		})
		.catch((err) => {
			console.error("[AskQueue] Failed to publish ask-question-answered:", err);
		});
}

/**
 * Add ask question to session queue and start processing
 * Returns promise that resolves when user answers
 */
export async function enqueueAsk(
	sessionId: string,
	toolCallId: string,
	question: string,
	options: AskQuestion["options"],
	multiSelect?: boolean,
	preSelected?: string[],
): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const askQuestion: AskQuestion = {
			id: toolCallId,
			sessionId,
			question,
			options,
			multiSelect,
			preSelected,
			resolve,
			reject,
			createdAt: Date.now(),
		};

		// Add to queue
		const queue = sessionAskQueues.get(sessionId) || [];
		queue.push(askQuestion);
		sessionAskQueues.set(sessionId, queue);

		// Start processing if not already processing
		if (!processingAsks.has(sessionId)) {
			processNextAsk(sessionId);
		}
	});
}

/**
 * Process next ask in session queue
 */
function processNextAsk(sessionId: string): void {
	const queue = sessionAskQueues.get(sessionId) || [];
	if (queue.length === 0) {
		processingAsks.delete(sessionId);
		return;
	}

	const ask = queue.shift()!;
	sessionAskQueues.set(sessionId, queue);
	processingAsks.set(sessionId, ask);

	// Publish ask-question-start to eventStream
	publishAskQuestionStart(sessionId, ask);
}

/**
 * Answer the current ask for a session
 * Called when any client provides an answer
 */
export function answerAsk(sessionId: string, toolCallId: string, answer: string): void {
	const processingAsk = processingAsks.get(sessionId);

	if (!processingAsk || processingAsk.id !== toolCallId) {
		console.warn(`[AskQueue] No matching ask found for ${toolCallId} in session ${sessionId}`);
		return;
	}

	// Resolve the promise (returns answer to LLM)
	processingAsk.resolve(answer);

	// Publish ask-question-answered to eventStream
	publishAskQuestionAnswered(sessionId, toolCallId, answer);

	// Remove from processing and process next
	processingAsks.delete(sessionId);
	processNextAsk(sessionId);
}

/**
 * Get current processing ask for a session (for late joiners)
 */
export function getProcessingAsk(sessionId: string): AskQuestion | undefined {
	return processingAsks.get(sessionId);
}

/**
 * Clear all asks for a session (on session end)
 * Rejects all pending promises to prevent memory leaks
 */
export function clearSessionAsks(sessionId: string): void {
	// Reject all pending asks in queue
	const queue = sessionAskQueues.get(sessionId) || [];
	for (const ask of queue) {
		ask.reject(new Error("Session ended"));
	}

	// Reject processing ask if exists
	const processingAsk = processingAsks.get(sessionId);
	if (processingAsk) {
		processingAsk.reject(new Error("Session ended"));
	}

	// Clear all maps
	sessionAskQueues.delete(sessionId);
	processingAsks.delete(sessionId);
}
