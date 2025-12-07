/**
 * Session Refetch Utility
 * Refetches session from server and updates client state
 *
 * ARCHITECTURE: lens-react v5 API
 * ===============================
 * - await client.xxx({ input }) → Vanilla JS Promise (this file)
 * - client.xxx.useQuery({ input }) → React hook (components)
 */

import type { CodeClient } from "@sylphx/code-client";
import { updateCurrentSession } from "../session-state.js";

/**
 * Refetch current session from server and update local state
 * Used when session data changes on server (e.g., todos updated by tool)
 * @param client - Lens client for vanilla API calls
 * @param sessionId - Session ID to refetch
 */
export async function refetchCurrentSession(client: CodeClient, sessionId: string): Promise<void> {
	console.log("[refetchCurrentSession] Refetching session:", sessionId);
	// Use vanilla client call
	const session = await client.getSession({ input: { id: sessionId } });

	console.log("[refetchCurrentSession] Session fetched. Todos count:", session?.todos?.length || 0);
	if (session) {
		// Cast to code-core Session type (lens Session is a subset)
		updateCurrentSession(session as any);
		console.log("[refetchCurrentSession] Session updated in store");
	}
}
