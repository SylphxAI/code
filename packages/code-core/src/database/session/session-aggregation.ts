/**
 * Session aggregation and statistics operations
 * Handles counting sessions, messages, and other stats
 */

import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { sessions } from "../schema.js";

/**
 * Get session count
 * Efficient: No need to load sessions into memory
 */
export async function getSessionCount(db: LibSQLDatabase): Promise<number> {
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)` })
		.from(sessions);

	return count;
}
