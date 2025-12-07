/**
 * Compact Service
 * Server-side session compaction with AI summarization
 *
 * ARCHITECTURE:
 * - Server-only logic (no client dependencies)
 * - Multi-client sync via tRPC events
 * - Atomic operations with rollback
 * - Detailed progress tracking
 */
import type { SessionRepository } from "../database/session-repository.js";
import type { Session } from "../types/session.types.js";
/**
 * Compact result with detailed information
 */
export interface CompactResult {
    success: boolean;
    newSessionId?: string;
    summary?: string;
    oldSessionId?: string;
    oldSessionTitle?: string;
    messageCount?: number;
    error?: string;
}
/**
 * Progress callback for real-time updates
 */
export type ProgressCallback = (status: string, detail?: string) => void;
/**
 * Compact a session: summarize and create new session
 *
 * @param sessionRepository - Database repository
 * @param sessionId - Session to compact
 * @param providerConfig - Provider configuration (with API keys)
 * @param onProgress - Optional progress callback for real-time updates
 * @returns CompactResult with new session info
 *
 * TRANSACTION FLOW:
 * 1. Validate session exists and has messages
 * 2. Generate AI summary (with streaming progress)
 * 3. Create new session atomically
 * 4. Mark old session as compacted
 * 5. Rollback on any failure
 */
export declare function compactSession(sessionRepository: SessionRepository, sessionId: string, providerConfig: Record<string, any>, onProgress?: ProgressCallback): Promise<CompactResult>;
/**
 * Check if a session should be compacted
 * Based on message count and token usage
 *
 * @param session - Session to check
 * @param thresholds - Optional custom thresholds
 * @returns Whether session should be compacted
 */
export declare function shouldCompactSession(session: Session, thresholds?: {
    minMessages?: number;
    maxMessages?: number;
}): boolean;
//# sourceMappingURL=compact-service.d.ts.map