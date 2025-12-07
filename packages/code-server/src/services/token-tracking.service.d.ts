/**
 * Token Tracking Service
 * Real-time token calculation and tracking during streaming
 *
 * Responsibilities:
 * - Initialize token tracker with baseline
 * - Update tokens incrementally from text deltas
 * - Emit token update events to clients
 * - Checkpoint recalculation on step completion
 *
 * Architecture:
 * - NO database cache (volatile state)
 * - Content-based caching (in TokenCalculator)
 * - Optimistic updates during streaming
 * - Accurate recalculation at checkpoints
 */
import type { MessageRepository } from "@sylphx/code-core";
import { StreamingTokenTracker } from "@sylphx/code-core";
import type { AppContext } from "../context.js";
/**
 * Initialize token tracking for a session
 * Calculates baseline (base context + existing messages)
 */
export declare function initializeTokenTracking(sessionId: string, session: {
    model: string;
    agentId: string;
    enabledRuleIds: string[];
    messages: any[];
}, messageRepository: MessageRepository, cwd: string, appContext: AppContext): Promise<{
    tracker: StreamingTokenTracker;
    baseContextTokens: number;
}>;
/**
 * Update tokens from streaming text delta
 * Emits optimistic update event immediately
 */
export declare function updateTokensFromDelta(tokenTracker: StreamingTokenTracker, deltaText: string, sessionId: string, baseContextTokens: number, appContext: AppContext): Promise<void>;
/**
 * Recalculate tokens at checkpoint (step completion)
 * Provides accurate count and resets tracker baseline
 */
export declare function recalculateTokensAtCheckpoint(sessionId: string, _stepNumber: number, sessionRepository: any, messageRepository: MessageRepository, tokenTracker: StreamingTokenTracker, appContext: AppContext, cwd: string): Promise<void>;
/**
 * Final token calculation after streaming completes
 * Ensures accurate final count is sent to all clients
 */
export declare function calculateFinalTokens(sessionId: string, sessionRepository: any, messageRepository: MessageRepository, appContext: AppContext, cwd: string): Promise<void>;
//# sourceMappingURL=token-tracking.service.d.ts.map