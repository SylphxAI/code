/**
 * Session search operations
 * Handles searching and filtering sessions
 */
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { Session as SessionType } from "../../types/session.types.js";
import type { PaginatedResult, SessionMetadata } from "./types.js";
/**
 * Search sessions by title (metadata only, cursor-based)
 * DATA ON DEMAND: Returns only metadata, no messages
 * CURSOR-BASED PAGINATION: Efficient for large result sets
 */
export declare function searchSessionsMetadata(db: LibSQLDatabase, query: string, limit?: number, cursor?: number): Promise<PaginatedResult<SessionMetadata>>;
/**
 * Search sessions by title (full data)
 * DEPRECATED: Use searchSessionsMetadata + getSessionById instead
 */
export declare function searchSessionsByTitle(db: LibSQLDatabase, getSessionById: (sessionId: string) => Promise<SessionType | null>, query: string, limit?: number): Promise<SessionType[]>;
//# sourceMappingURL=session-search.d.ts.map