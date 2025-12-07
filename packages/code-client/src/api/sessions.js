/**
 * Session API
 * Client-side functions for interacting with sessions via Lens
 *
 * Uses the new Lens client with flat namespace pattern:
 * - client.listSessions.fetch({ limit }) → Promise
 * - client.getLastSession.fetch() → Promise
 */
import { getClient } from "../lens.js";
/**
 * Get recent sessions from server
 * @param limit - Maximum number of sessions to retrieve
 * @returns Array of session metadata (lightweight, no messages/todos)
 */
export async function getRecentSessions(limit = 100) {
    const client = getClient();
    const result = await client.listSessions.fetch({ input: { limit } });
    // Transform to SessionMetadata format
    return result.map((session) => ({
        id: session.id,
        title: session.title || "Untitled",
        provider: session.provider || "",
        model: session.model || "",
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages?.length || 0,
    }));
}
/**
 * Get last active session
 * @returns Last session or null if no sessions exist
 */
export async function getLastSession() {
    const client = getClient();
    return await client.getLastSession.fetch({});
}
//# sourceMappingURL=sessions.js.map