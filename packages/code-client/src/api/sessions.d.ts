/**
 * Session API
 * Client-side functions for interacting with sessions via Lens
 *
 * Uses the new Lens client with flat namespace pattern:
 * - client.listSessions.fetch({ limit }) → Promise
 * - client.getLastSession.fetch() → Promise
 */
import type { ProviderId } from "@sylphx/code-core";
import type { Session } from "../lens.js";
/**
 * Session metadata for listing (lightweight, no messages/todos)
 */
export interface SessionListItem {
    id: string;
    title: string;
    provider: ProviderId;
    model: string;
    modelId?: string;
    agentId: string;
    createdAt: number;
    updatedAt: number;
    messageCount: number;
}
/**
 * Get recent sessions from server
 * @param limit - Maximum number of sessions to retrieve
 * @returns Array of session metadata (lightweight, no messages/todos)
 */
export declare function getRecentSessions(limit?: number): Promise<SessionListItem[]>;
/**
 * Get last active session
 * @returns Last session or null if no sessions exist
 */
export declare function getLastSession(): Promise<Session | null>;
//# sourceMappingURL=sessions.d.ts.map