/**
 * Ask Manager Service
 * Manages pending Ask tool questions in client-server architecture
 *
 * Flow:
 * 1. Ask tool calls createPendingAsk() → Returns Promise + emits stream event
 * 2. Client receives ask-question event, displays UI
 * 3. User answers, client calls answerAsk mutation
 * 4. Mutation calls resolvePendingAsk() → Resolves Promise
 * 5. Ask tool continues with answer
 */
/**
 * Global map of pending Ask tool questions
 * Key: questionId
 */
const pendingAsks = new Map();
/**
 * Configuration
 */
const ASK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
/**
 * Create pending Ask and return Promise
 * Call this from Ask tool when it needs user input
 *
 * @returns Promise that resolves when user answers
 */
export async function createPendingAsk(sessionId, questionId, questions) {
    return new Promise((resolve, reject) => {
        // Create timeout
        const timeout = setTimeout(() => {
            pendingAsks.delete(questionId);
            reject(new Error(`Ask tool timeout: No answer received within ${ASK_TIMEOUT_MS / 1000}s`));
        }, ASK_TIMEOUT_MS);
        // Store pending ask
        pendingAsks.set(questionId, {
            questionId,
            sessionId,
            questions,
            resolve,
            reject,
            timeout,
            createdAt: Date.now(),
        });
    });
}
/**
 * Resolve pending Ask
 * Called by answerAsk mutation when client provides answer
 *
 * @returns true if resolved, false if not found
 */
export async function resolvePendingAsk(questionId, answers) {
    const pending = pendingAsks.get(questionId);
    if (!pending) {
        return false;
    }
    // Clear timeout
    clearTimeout(pending.timeout);
    // Resolve Promise
    pending.resolve(answers);
    // Remove from map
    pendingAsks.delete(questionId);
    return true;
}
/**
 * Reject pending Ask
 * Called when session aborts or errors
 */
export async function rejectPendingAsk(questionId, error) {
    const pending = pendingAsks.get(questionId);
    if (!pending) {
        return false;
    }
    // Clear timeout
    clearTimeout(pending.timeout);
    // Reject Promise
    pending.reject(error);
    // Remove from map
    pendingAsks.delete(questionId);
    return true;
}
/**
 * Get all pending asks for a session
 * Useful for cleanup when session aborts
 */
export function getPendingAsksForSession(sessionId) {
    const questionIds = [];
    for (const [questionId, pending] of pendingAsks.entries()) {
        if (pending.sessionId === sessionId) {
            questionIds.push(questionId);
        }
    }
    return questionIds;
}
/**
 * Cleanup stale pending asks
 * Called periodically to prevent memory leaks
 */
function cleanupStalePendingAsks() {
    const now = Date.now();
    const staleThreshold = ASK_TIMEOUT_MS + 60000; // Timeout + 1 min buffer
    for (const [questionId, pending] of pendingAsks.entries()) {
        if (now - pending.createdAt > staleThreshold) {
            clearTimeout(pending.timeout);
            pending.reject(new Error("Ask tool stale - cleaned up"));
            pendingAsks.delete(questionId);
        }
    }
}
// Start cleanup interval
setInterval(cleanupStalePendingAsks, CLEANUP_INTERVAL_MS);
/**
 * Get pending asks count (for debugging/monitoring)
 */
export function getPendingAsksCount() {
    return pendingAsks.size;
}
//# sourceMappingURL=ask-manager.service.js.map