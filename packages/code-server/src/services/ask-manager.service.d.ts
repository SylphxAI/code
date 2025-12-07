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
 * Create pending Ask and return Promise
 * Call this from Ask tool when it needs user input
 *
 * @returns Promise that resolves when user answers
 */
export declare function createPendingAsk(sessionId: string, questionId: string, questions: Array<{
    question: string;
    header: string;
    multiSelect: boolean;
    options: Array<{
        label: string;
        description: string;
    }>;
}>): Promise<Record<string, string | string[]>>;
/**
 * Resolve pending Ask
 * Called by answerAsk mutation when client provides answer
 *
 * @returns true if resolved, false if not found
 */
export declare function resolvePendingAsk(questionId: string, answers: Record<string, string | string[]>): Promise<boolean>;
/**
 * Reject pending Ask
 * Called when session aborts or errors
 */
export declare function rejectPendingAsk(questionId: string, error: Error): Promise<boolean>;
/**
 * Get all pending asks for a session
 * Useful for cleanup when session aborts
 */
export declare function getPendingAsksForSession(sessionId: string): string[];
/**
 * Get pending asks count (for debugging/monitoring)
 */
export declare function getPendingAsksCount(): number;
//# sourceMappingURL=ask-manager.service.d.ts.map