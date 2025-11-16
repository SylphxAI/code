/**
 * Session search operations
 * Handles searching and filtering sessions
 */

import { and, desc, inArray, like, lt, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { ProviderId } from "../../config/ai-config.js";
import type { Session as SessionType } from "../../types/session.types.js";
import { messages, sessions } from "../schema.js";
import type { PaginatedResult, SessionMetadata } from "./types.js";

/**
 * Search sessions by title (metadata only, cursor-based)
 * DATA ON DEMAND: Returns only metadata, no messages
 * CURSOR-BASED PAGINATION: Efficient for large result sets
 */
export async function searchSessionsMetadata(
	db: LibSQLDatabase,
	query: string,
	limit = 20,
	cursor?: number,
): Promise<PaginatedResult<SessionMetadata>> {
	const conditions = [like(sessions.title, `%${query}%`)];
	if (cursor) {
		conditions.push(lt(sessions.updated, cursor));
	}

	const queryBuilder = db
		.select()
		.from(sessions)
		.where(and(...conditions))
		.orderBy(desc(sessions.updated))
		.limit(limit + 1);

	const sessionRecords = await queryBuilder;

	const hasMore = sessionRecords.length > limit;
	const sessionsToReturn = hasMore ? sessionRecords.slice(0, limit) : sessionRecords;
	const nextCursor = hasMore ? sessionsToReturn[sessionsToReturn.length - 1].updated : null;

	// Get message counts
	const sessionIds = sessionsToReturn.map((s) => s.id);
	const messageCounts =
		sessionIds.length > 0
			? await db
					.select({
						sessionId: messages.sessionId,
						count: sql<number>`count(*)`,
					})
					.from(messages)
					.where(inArray(messages.sessionId, sessionIds))
					.groupBy(messages.sessionId)
			: [];

	const countMap = new Map(messageCounts.map((m) => [m.sessionId, m.count]));

	return {
		sessions: sessionsToReturn.map((s) => ({
			id: s.id,
			title: s.title || undefined,
			provider: s.provider as ProviderId,
			model: s.model,
			agentId: s.agentId,
			created: s.created,
			updated: s.updated,
			messageCount: countMap.get(s.id) || 0,
		})),
		nextCursor,
	};
}

/**
 * Search sessions by title (full data)
 * DEPRECATED: Use searchSessionsMetadata + getSessionById instead
 */
export async function searchSessionsByTitle(
	db: LibSQLDatabase,
	getSessionById: (sessionId: string) => Promise<SessionType | null>,
	query: string,
	limit = 20,
): Promise<SessionType[]> {
	const sessionRecords = await db
		.select()
		.from(sessions)
		.where(like(sessions.title, `%${query}%`))
		.orderBy(desc(sessions.updated))
		.limit(limit);

	const fullSessions = await Promise.all(
		sessionRecords.map((session) => getSessionById(session.id)),
	);

	return fullSessions.filter((s): s is SessionType => s !== null);
}
