/**
 * Session Refetch Utility
 * Refetches session from server and updates client state
 */

import type { LensClient } from "@lens/client";
import { updateCurrentSession } from "@sylphx/code-client";

/**
 * Refetch current session from server and update local state
 * Used when session data changes on server (e.g., todos updated by tool)
 * @param client - Lens client (passed from React hook useLensClient)
 * @param sessionId - Session ID to refetch
 */
export async function refetchCurrentSession(client: LensClient<any, any>, sessionId: string): Promise<void> {
	console.log("[refetchCurrentSession] Refetching session:", sessionId);
	// Lens flat namespace: client.getSession()
	const session = await client.getSession({ id: sessionId });

	console.log("[refetchCurrentSession] Session fetched. Todos count:", session?.todos?.length || 0);
	if (session) {
		updateCurrentSession(session);
		console.log("[refetchCurrentSession] Session updated in store");
	}
}
