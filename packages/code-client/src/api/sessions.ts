/**
 * Session API
 * Client-side functions for interacting with sessions via Lens
 */

import type { Session, SessionMetadata } from "@sylphx/code-core";
import { getLensClient } from "../lens-provider.js";
import type { API } from "@sylphx/code-api";

/**
 * Get recent sessions from server
 * @param limit - Maximum number of sessions to retrieve
 * @returns Array of session metadata (lightweight, no messages/todos)
 */
export async function getRecentSessions(limit: number = 100): Promise<SessionMetadata[]> {
	const client = getLensClient<API>();
	const result = await client.session.getRecent.query({ limit });
	return result.sessions;
}

/**
 * Get last active session
 * @returns Last session or null if no sessions exist
 */
export async function getLastSession(): Promise<Session | null> {
	const client = getLensClient<API>();
	return await client.session.getLast.query({});
}
