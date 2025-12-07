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
export interface AskQuestion {
    id: string;
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
 * Register observer for session to receive ask events
 */
export declare function registerAskObserver(sessionId: string, observer: Observer<StreamEvent, unknown>): void;
/**
 * Unregister observer for session
 */
export declare function unregisterAskObserver(sessionId: string, observer: Observer<StreamEvent, unknown>): void;
/**
 * Add ask question to session queue and start processing
 * Returns promise that resolves when user answers
 */
export declare function enqueueAsk(sessionId: string, toolCallId: string, question: string, options: AskQuestion["options"], multiSelect?: boolean, preSelected?: string[]): Promise<string>;
/**
 * Answer the current ask for a session
 * Called when any client provides an answer
 */
export declare function answerAsk(sessionId: string, toolCallId: string, answer: string): void;
/**
 * Clear all asks for a session (on session end)
 * Rejects all pending promises to prevent memory leaks
 */
export declare function clearSessionAsks(sessionId: string): void;
//# sourceMappingURL=ask-queue.service.d.ts.map