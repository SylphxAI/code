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
import { emitAskQuestionAnswered, emitAskQuestionStart } from "./streaming/event-emitter.js";
/**
 * Per-session ask queues
 * Map<sessionId, AskQuestion[]>
 */
const sessionAskQueues = new Map();
/**
 * Currently processing ask per session
 * Map<sessionId, AskQuestion>
 */
const processingAsks = new Map();
/**
 * Stream observers per session for broadcasting events
 * Map<sessionId, Observer[]>
 */
const sessionObservers = new Map();
/**
 * Register observer for session to receive ask events
 */
export function registerAskObserver(sessionId, observer) {
    const observers = sessionObservers.get(sessionId) || [];
    observers.push(observer);
    sessionObservers.set(sessionId, observers);
    // If there's a processing ask for this session, immediately broadcast it
    const processingAsk = processingAsks.get(sessionId);
    if (processingAsk) {
        emitAskQuestionStart(observer, sessionId, processingAsk.id, processingAsk.question, processingAsk.options, processingAsk.multiSelect, processingAsk.preSelected);
    }
}
/**
 * Unregister observer for session
 */
export function unregisterAskObserver(sessionId, observer) {
    const observers = sessionObservers.get(sessionId) || [];
    const filtered = observers.filter((obs) => obs !== observer);
    if (filtered.length === 0) {
        sessionObservers.delete(sessionId);
    }
    else {
        sessionObservers.set(sessionId, filtered);
    }
}
/**
 * Broadcast event to all observers of a session
 */
function broadcastToSession(sessionId, emitFn) {
    const observers = sessionObservers.get(sessionId) || [];
    for (const observer of observers) {
        emitFn(observer);
    }
}
/**
 * Add ask question to session queue and start processing
 * Returns promise that resolves when user answers
 */
export async function enqueueAsk(sessionId, toolCallId, question, options, multiSelect, preSelected) {
    return new Promise((resolve, reject) => {
        const askQuestion = {
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
function processNextAsk(sessionId) {
    const queue = sessionAskQueues.get(sessionId) || [];
    if (queue.length === 0) {
        processingAsks.delete(sessionId);
        return;
    }
    const ask = queue.shift();
    sessionAskQueues.set(sessionId, queue);
    processingAsks.set(sessionId, ask);
    // Broadcast ask-question-start to all clients watching this session
    broadcastToSession(sessionId, (observer) => emitAskQuestionStart(observer, sessionId, ask.id, ask.question, ask.options, ask.multiSelect, ask.preSelected));
}
/**
 * Answer the current ask for a session
 * Called when any client provides an answer
 */
export function answerAsk(sessionId, toolCallId, answer) {
    const processingAsk = processingAsks.get(sessionId);
    if (!processingAsk || processingAsk.id !== toolCallId) {
        console.warn(`[AskQueue] No matching ask found for ${toolCallId} in session ${sessionId}`);
        return;
    }
    // Resolve the promise (returns answer to LLM)
    processingAsk.resolve(answer);
    // Broadcast ask-question-answered to all clients
    broadcastToSession(sessionId, (observer) => emitAskQuestionAnswered(observer, sessionId, toolCallId, answer));
    // Remove from processing and process next
    processingAsks.delete(sessionId);
    processNextAsk(sessionId);
}
/**
 * Clear all asks for a session (on session end)
 * Rejects all pending promises to prevent memory leaks
 */
export function clearSessionAsks(sessionId) {
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
    sessionObservers.delete(sessionId);
}
//# sourceMappingURL=ask-queue.service.js.map