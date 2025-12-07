/**
 * Session query operations
 * Handles complex read queries for sessions
 */
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { Session as SessionType } from "../../types/session.types.js";
import type { PaginatedResult, SessionMetadata } from "./types.js";
/**
 * Get session by ID with all related data
 */
export declare function getSessionById(db: LibSQLDatabase, sessionId: string): Promise<SessionType | null>;
/**
 * Get recent sessions metadata ONLY (cursor-based pagination)
 * DATA ON DEMAND: Returns only id, title, provider, model, created, updated
 * NO messages, NO todos - client fetches those separately when needed
 *
 * CURSOR-BASED PAGINATION: More efficient than offset for large datasets
 * - Cursor = updated timestamp of last item
 * - Works even with concurrent updates
 */
export declare function getRecentSessionsMetadata(db: LibSQLDatabase, limit?: number, cursor?: number): Promise<PaginatedResult<SessionMetadata>>;
/**
 * Get recent sessions with full data (for backward compatibility)
 * DEPRECATED: Use getRecentSessionsMetadata + getSessionById instead
 */
export declare function getRecentSessions(db: LibSQLDatabase, limit?: number, offset?: number): Promise<SessionType[]>;
/**
 * Get most recently updated session (for headless mode continuation)
 * Returns the last active session
 */
export declare function getLastSession(db: LibSQLDatabase): Promise<SessionType | null>;
//# sourceMappingURL=session-query.d.ts.map