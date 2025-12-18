/**
 * Session API
 * Client-side functions for interacting with sessions via Lens
 *
 * ARCHITECTURE: lens-react v5 API
 * ===============================
 * - await client.xxx({ input }) → Vanilla JS Promise (this file)
 * - client.xxx.useQuery({ input }) → React hook (components)
 */

import type { ProviderId } from "@sylphx/code-core";
import { getClient, type CodeClient } from "../lens.js";

// Infer Session type from client
type Session = NonNullable<Awaited<ReturnType<CodeClient["getSession"]>>>;

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
export async function getRecentSessions(
	limit: number = 100,
): Promise<SessionListItem[]> {
	const client = getClient();
	// Use vanilla client call
	const result = await client.listSessions({ args: { limit } });

	// Transform to SessionListItem format
	return (result as Session[]).map((session) => ({
		id: session.id,
		title: session.title || "Untitled",
		provider: (session.provider || "anthropic") as ProviderId,
		model: session.model || "",
		modelId: session.modelId,
		agentId: session.agentId,
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
		messageCount: 0, // Message count not available in list query
	}));
}

/**
 * Get last active session
 * @returns Last session or null if no sessions exist
 */
export async function getLastSession(): Promise<Session | null> {
	const client = getClient();
	// Use vanilla client call
	return await client.getLastSession({}) as Session | null;
}
