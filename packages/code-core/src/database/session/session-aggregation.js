/**
 * Session aggregation and statistics operations
 * Handles counting sessions, messages, and other stats
 */
import { sql } from "drizzle-orm";
import { sessions } from "../schema.js";
/**
 * Get session count
 * Efficient: No need to load sessions into memory
 */
export async function getSessionCount(db) {
    const [{ count }] = await db.select({ count: sql `count(*)` }).from(sessions);
    return count;
}
//# sourceMappingURL=session-aggregation.js.map