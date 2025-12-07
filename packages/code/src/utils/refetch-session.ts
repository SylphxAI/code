/**
 * Session Refetch Utility
 * Refetches session from server and updates client state
 */

import type { CodeClient } from "@sylphx/code-client";
import { updateCurrentSession } from "../session-state.js";

/**
 * Refetch current session from server and update local state
 * Used when session data changes on server (e.g., todos updated by tool)
 * @param client - Lens client (passed from React hook useLensClient)
 * @param sessionId - Session ID to refetch
 */
export async function refetchCurrentSession(client: CodeClient, sessionId: string): Promise<void> {
	console.log("[refetchCurrentSession] Refetching session:", sessionId);
	// Lens flat namespace: client.getSession.fetch({ input })
	const session = await client.getSession.fetch({ input: { id: sessionId } });

	console.log("[refetchCurrentSession] Session fetched. Todos count:", session?.todos?.length || 0);
	if (session) {
		// Cast to code-core Session type (lens Session is a subset)
		updateCurrentSession(session as any);
		console.log("[refetchCurrentSession] Session updated in store");
	}
}
