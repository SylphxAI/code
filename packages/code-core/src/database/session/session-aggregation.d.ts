/**
 * Session aggregation and statistics operations
 * Handles counting sessions, messages, and other stats
 */
import type { LibSQLDatabase } from "drizzle-orm/libsql";
/**
 * Get session count
 * Efficient: No need to load sessions into memory
 */
export declare function getSessionCount(db: LibSQLDatabase): Promise<number>;
//# sourceMappingURL=session-aggregation.d.ts.map