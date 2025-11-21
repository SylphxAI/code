/**
 * Session Refetch Utility
 * Refetches session from server and updates client state
 */

import { getTRPCClient } from "@sylphx/code-client";
import { updateCurrentSession } from "@sylphx/code-client";

/**
 * Refetch current session from server and update local state
 * Used when session data changes on server (e.g., todos updated by tool)
 */
export async function refetchCurrentSession(sessionId: string): Promise<void> {
	console.log("[refetchCurrentSession] Refetching session:", sessionId);
	const client = getTRPCClient();

	// @ts-expect-error - tRPC router types not fully resolved
	const session = await client.session.getById.query({ sessionId });

	console.log("[refetchCurrentSession] Session fetched. Todos count:", session?.todos?.length || 0);
	if (session) {
		updateCurrentSession(session);
		console.log("[refetchCurrentSession] Session updated in store");
	}
}
