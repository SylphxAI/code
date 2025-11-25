/**
 * Session API
 * Client-side functions for interacting with sessions via Lens
 *
 * Uses the new Lens client with flat namespace pattern
 */

import type { Session, SessionMetadata } from "@sylphx/code-core";
import { getLensClientGlobal as getLensClient } from "../lens-client-global.js";

/**
 * Get recent sessions from server
 * @param limit - Maximum number of sessions to retrieve
 * @returns Array of session metadata (lightweight, no messages/todos)
 */
export async function getRecentSessions(
	limit: number = 100,
): Promise<SessionMetadata[]> {
	const client = getLensClient();
	// New Lens uses flat namespace: client.listSessions() not client.queries.listSessions()
	const result = await (client as any).listSessions({ limit });
	// Transform to SessionMetadata format
	return result.map((session: any) => ({
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
export async function getLastSession(): Promise<Session | null> {
	const client = getLensClient();
	// New Lens uses flat namespace: client.getLastSession() not client.queries.getLastSession()
	return await (client as any).getLastSession({});
}
