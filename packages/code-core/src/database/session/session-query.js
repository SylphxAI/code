/**
 * Session query operations
 * Handles complex read queries for sessions
 */
import { desc, eq, inArray, lt, sql } from "drizzle-orm";
import { messages, sessions } from "../schema.js";
import { getSessionMessages, getSessionTodos, parseSessionRow } from "./session-parser.js";
/**
 * Get session by ID with all related data
 */
export async function getSessionById(db, sessionId) {
    // Get session metadata
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!session) {
        return null;
    }
    // Get messages with all parts, attachments, usage
    const sessionMessages = await getSessionMessages(db, sessionId);
    // Get todos
    const sessionTodos = await getSessionTodos(db, sessionId);
    // Build return object
    const result = {
        id: session.id,
        title: session.title || undefined,
        provider: session.provider,
        model: session.model,
        agentId: session.agentId,
        enabledRuleIds: session.enabledRuleIds || [],
        messages: sessionMessages,
        todos: sessionTodos,
        nextTodoId: session.nextTodoId,
        flags: session.flags || undefined,
        baseContextTokens: session.baseContextTokens || undefined,
        totalTokens: session.totalTokens || undefined,
        created: session.created,
        updated: session.updated,
    };
    return result;
}
/**
 * Get recent sessions metadata ONLY (cursor-based pagination)
 * DATA ON DEMAND: Returns only id, title, provider, model, created, updated
 * NO messages, NO todos - client fetches those separately when needed
 *
 * CURSOR-BASED PAGINATION: More efficient than offset for large datasets
 * - Cursor = updated timestamp of last item
 * - Works even with concurrent updates
 */
export async function getRecentSessionsMetadata(db, limit = 20, cursor) {
    // Build query with cursor
    const queryBuilder = db
        .select()
        .from(sessions)
        .orderBy(desc(sessions.updated))
        .limit(limit + 1); // Fetch one extra to determine if there's a next page
    if (cursor) {
        queryBuilder.where(lt(sessions.updated, cursor));
    }
    let sessionRecords;
    try {
        sessionRecords = await queryBuilder;
    }
    catch (_error) {
        // JSON parse error in corrupted session data - fix corrupted records
        console.warn("[getRecentSessionsMetadata] Detected corrupted JSON, auto-repairing...");
        // Query with raw SQL to bypass Drizzle's JSON parsing
        // Note: Raw SQL needed here to skip JSON validation on corrupted data
        const rawSessions = await db.all(sql `
        SELECT * FROM sessions
        ${cursor ? sql `WHERE ${sessions.updated} < ${cursor}` : sql ``}
        ORDER BY ${sessions.updated} DESC
        LIMIT ${limit + 1}
      `);
        // Manually parse and fix corrupted records
        sessionRecords = [];
        for (const raw of rawSessions) {
            const parsed = await parseSessionRow(raw, db);
            if (parsed) {
                sessionRecords.push(parsed);
            }
        }
    }
    // Check if there are more results
    const hasMore = sessionRecords.length > limit;
    const sessionsToReturn = hasMore ? sessionRecords.slice(0, limit) : sessionRecords;
    const nextCursor = hasMore ? sessionsToReturn[sessionsToReturn.length - 1].updated : null;
    // Get message counts for all sessions in one query (OPTIMIZED!)
    const sessionIds = sessionsToReturn.map((s) => s.id);
    const messageCounts = await db
        .select({
        sessionId: messages.sessionId,
        count: sql `count(*)`,
    })
        .from(messages)
        .where(inArray(messages.sessionId, sessionIds))
        .groupBy(messages.sessionId);
    // Create lookup map
    const countMap = new Map(messageCounts.map((m) => [m.sessionId, m.count]));
    return {
        sessions: sessionsToReturn.map((s) => ({
            id: s.id,
            title: s.title || undefined,
            provider: s.provider,
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
 * Get recent sessions with full data (for backward compatibility)
 * DEPRECATED: Use getRecentSessionsMetadata + getSessionById instead
 */
export async function getRecentSessions(db, limit = 20, offset = 0) {
    // Get session metadata only (no messages yet - lazy loading!)
    const sessionRecords = await db
        .select()
        .from(sessions)
        .orderBy(desc(sessions.updated))
        .limit(limit)
        .offset(offset);
    // For each session, load messages, todos, etc.
    const fullSessions = await Promise.all(sessionRecords.map((session) => getSessionById(db, session.id)));
    return fullSessions.filter((s) => s !== null);
}
/**
 * Get most recently updated session (for headless mode continuation)
 * Returns the last active session
 */
export async function getLastSession(db) {
    // Get most recent session by updated timestamp
    const [lastSession] = await db.select().from(sessions).orderBy(desc(sessions.updated)).limit(1);
    if (!lastSession) {
        return null;
    }
    // Load full session data
    return getSessionById(db, lastSession.id);
}
//# sourceMappingURL=session-query.js.map