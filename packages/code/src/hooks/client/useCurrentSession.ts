/**
 * useCurrentSession Hook
 * Provides current session data via Live Query with inProcess polling support
 *
 * ARCHITECTURE: tRPC-style API (lens-react 2.2.0)
 * ==============================================
 * Uses client.getSession({ input: { id } }) for session data.
 *
 * Transport handling:
 * - WebSocket: Server uses emit API to push updates automatically
 * - inProcess: Polling mode - refetch every 100ms when streaming is expected
 *
 * Polling is enabled when:
 * 1. streamingExpected signal is true (set before triggerStream mutation)
 * 2. Polling continues until streamingStatus becomes "idle"
 *
 * For session navigation, we still use currentSessionId signal.
 */

import { useEffect, useRef } from "react";
import { client, useCurrentSessionId, useStreamingExpected, setStreamingExpected } from "@sylphx/code-client";

// Polling interval for inProcess transport (ms)
const POLLING_INTERVAL = 100;

export function useCurrentSession() {
	const currentSessionId = useCurrentSessionId();
	const streamingExpected = useStreamingExpected();

	// Skip query when no valid session ID (Apollo/GraphQL pattern)
	const shouldQuery = Boolean(currentSessionId && currentSessionId !== "temp-session");

	// Live Query: Subscribe to session with streaming state
	// For inProcess, we need polling; for WebSocket, emit works automatically
	const { data: session, loading: isLoading, error, refetch } = client.getSession({
		input: { id: currentSessionId ?? "" },
		skip: !shouldQuery,
	});

	// Derive isStreaming from session state
	const isStreaming = session?.streamingStatus === "streaming" ||
		session?.streamingStatus === "waiting_input" ||
		session?.isTextStreaming ||
		session?.isReasoningStreaming ||
		!!session?.currentTool;

	// Track if streaming completed (to clear streamingExpected)
	const wasStreaming = useRef(false);

	// Polling effect for inProcess transport
	// Poll while streamingExpected is true, stop when streaming completes
	useEffect(() => {
		// Only poll when:
		// 1. We have a valid session
		// 2. Streaming is expected (mutation was called)
		// 3. We're actually streaming (status is not idle)
		const shouldPoll = shouldQuery && streamingExpected;

		if (!shouldPoll) {
			return;
		}

		// Check if streaming has completed
		if (wasStreaming.current && session?.streamingStatus === "idle") {
			// Streaming completed - stop polling
			setStreamingExpected(false);
			wasStreaming.current = false;
			return;
		}

		// Track that we've seen streaming
		if (isStreaming) {
			wasStreaming.current = true;
		}

		// Set up polling interval
		const pollId = setInterval(() => {
			refetch();
		}, POLLING_INTERVAL);

		return () => {
			clearInterval(pollId);
		};
	}, [shouldQuery, streamingExpected, session?.streamingStatus, isStreaming, refetch]);

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
