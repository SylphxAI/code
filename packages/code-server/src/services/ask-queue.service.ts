/**
 * Ask Queue Service
 * Server-side per-session ask queue management for multi-client sync
 *
 * ARCHITECTURE:
 * - Server manages one queue per session (not global)
 * - Ask tool execution creates pending ask in session
 * - Any connected client can answer
 * - All clients receive events via stream
 * - Restorable from message parts
 */

import type { Observer } from "@trpc/server/observable";
import type { StreamEvent } from "./streaming/types.js";
import { emitAskQuestionStart, emitAskQuestionAnswered } from "./streaming/event-emitter.js";

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
 * Stream observers per session for broadcasting events
 * Map<sessionId, Observer[]>
 */
const sessionObservers = new Map<string, Observer<StreamEvent, unknown>[]>();

/**
 * Register observer for session to receive ask events
 */
export function registerAskObserver(
	sessionId: string,
	observer: Observer<StreamEvent, unknown>,
): void {
	const observers = sessionObservers.get(sessionId) || [];
	observers.push(observer);
	sessionObservers.set(sessionId, observers);

	// If there's a processing ask for this session, immediately broadcast it
	const processingAsk = processingAsks.get(sessionId);
	if (processingAsk) {
		emitAskQuestionStart(
			observer,
			sessionId,
			processingAsk.id,
			processingAsk.question,
			processingAsk.options,
			processingAsk.multiSelect,
			processingAsk.preSelected,
		);
	}
}

/**
 * Unregister observer for session
 */
export function unregisterAskObserver(
	sessionId: string,
	observer: Observer<StreamEvent, unknown>,
): void {
	const observers = sessionObservers.get(sessionId) || [];
	const filtered = observers.filter((obs) => obs !== observer);
	if (filtered.length === 0) {
		sessionObservers.delete(sessionId);
	} else {
		sessionObservers.set(sessionId, filtered);
	}
}

/**
 * Broadcast event to all observers of a session
 */
function broadcastToSession(
	sessionId: string,
	emitFn: (observer: Observer<StreamEvent, unknown>) => void,
): void {
	const observers = sessionObservers.get(sessionId) || [];
	for (const observer of observers) {
		emitFn(observer);
	}
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
	return new Promise<string>((resolve) => {
		const askQuestion: AskQuestion = {
			id: toolCallId,
			sessionId,
			question,
			options,
			multiSelect,
			preSelected,
			resolve,
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

	// Broadcast ask-question-start to all clients watching this session
	broadcastToSession(sessionId, (observer) =>
		emitAskQuestionStart(
			observer,
			sessionId,
			ask.id,
			ask.question,
			ask.options,
			ask.multiSelect,
			ask.preSelected,
		),
	);
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

	// Broadcast ask-question-answered to all clients
	broadcastToSession(sessionId, (observer) =>
		emitAskQuestionAnswered(observer, sessionId, toolCallId, answer),
	);

	// Remove from processing and process next
	processingAsks.delete(sessionId);
	processNextAsk(sessionId);
}

/**
 * Get current processing ask for a session (for restore)
 */
export function getCurrentAsk(sessionId: string): AskQuestion | null {
	return processingAsks.get(sessionId) || null;
}

/**
 * Get queue length for a session
 */
export function getQueueLength(sessionId: string): number {
	const queue = sessionAskQueues.get(sessionId) || [];
	const processing = processingAsks.has(sessionId) ? 1 : 0;
	return queue.length + processing;
}

/**
 * Clear all asks for a session (on session end)
 */
export function clearSessionAsks(sessionId: string): void {
	sessionAskQueues.delete(sessionId);
	processingAsks.delete(sessionId);
	sessionObservers.delete(sessionId);
}
