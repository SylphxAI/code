/**
 * useCurrentSession Hook
 * Provides current session data via Live Query
 *
 * ARCHITECTURE: Live Query Pattern
 * =================================
 * Uses useQuery(client.getSession({ id })) - data updates automatically via emit.
 * No manual fetch, no event callbacks needed.
 *
 * Server uses emit API to push streaming updates:
 * - emit.delta("textContent", ...) for text streaming
 * - emit.set("currentTool", ...) for tool status
 * - emit.merge({ streamingStatus: ... }) for status changes
 *
 * Client just reads session fields - all updates are automatic!
 *
 * For session navigation, we still use currentSessionId signal.
 */

import { useQuery, useCurrentSessionId } from "@sylphx/code-client";

export function useCurrentSession() {
	const currentSessionId = useCurrentSessionId();

	// Live Query: Subscribe to session with streaming state
	// Server uses emit API to update, Lens syncs automatically
	// Use skip when no valid session ID (Apollo/GraphQL pattern)
	const shouldQuery = Boolean(currentSessionId && currentSessionId !== "temp-session");
	const { data: session, loading: isLoading, error } = useQuery(
		(client) => client.getSession,
		{ id: currentSessionId ?? "" },
		{ skip: !shouldQuery }
	);

	// Derive isStreaming from session state
	// streamingStatus is updated by server via emit API
	const isStreaming = session?.streamingStatus === "streaming" ||
		session?.streamingStatus === "waiting_input" ||
		session?.isTextStreaming ||
		session?.isReasoningStreaming ||
		!!session?.currentTool;

	return {
		currentSession: session ?? null,
		currentSessionId,
		isStreaming,
		isLoading,
		error,
	};
}

/**
 * Re-export useCurrentSessionId from code-client for convenience
 */
export { useCurrentSessionId } from "@sylphx/code-client";
