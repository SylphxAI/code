/**
 * useCurrentSession Hook
 * Provides current session data via polling with .fetch() pattern
 *
 * ARCHITECTURE: Promise-based API with local state
 * ==============================================
 * Uses client.getSession.fetch({ input: { id } }) for session data.
 * This avoids React instance conflicts between lens-react and the app.
 *
 * Transport handling:
 * - Polling mode - refetch every 100ms when streaming is expected
 *
 * Polling is enabled when:
 * 1. streamingExpected signal is true (set before triggerStream mutation)
 * 2. Polling continues until streamingStatus becomes "idle"
 *
 * For session navigation, we still use currentSessionId signal.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getClient, useCurrentSessionId, useStreamingExpected, setStreamingExpected } from "@sylphx/code-client";

// Polling interval for session data (ms)
const POLLING_INTERVAL = 100;

// Session type (from server)
interface SessionData {
	id: string;
	title?: string;
	streamingStatus?: "idle" | "streaming" | "waiting_input";
	isTextStreaming?: boolean;
	isReasoningStreaming?: boolean;
	currentTool?: string;
	[key: string]: unknown;
}

export function useCurrentSession() {
	const currentSessionId = useCurrentSessionId();
	const streamingExpected = useStreamingExpected();

	// Local state for session data
	const [session, setSession] = useState<SessionData | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	// Skip query when no valid session ID
	const shouldQuery = Boolean(currentSessionId && currentSessionId !== "temp-session");

	// Track if streaming completed (to clear streamingExpected)
	const wasStreaming = useRef(false);

	// Fetch session data
	const fetchSession = useCallback(async () => {
		if (!shouldQuery || !currentSessionId) {
			setSession(null);
			return;
		}

		try {
			const client = getClient();
			const data = await client.getSession.fetch({
				input: { id: currentSessionId },
			}) as SessionData | null;
			setSession(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
		}
	}, [currentSessionId, shouldQuery]);

	// Initial fetch when session ID changes
	useEffect(() => {
		if (shouldQuery) {
			setIsLoading(true);
			fetchSession().finally(() => setIsLoading(false));
		} else {
			setSession(null);
		}
	}, [shouldQuery, fetchSession]);

	// Derive isStreaming from session state
	const isStreaming = session?.streamingStatus === "streaming" ||
		session?.streamingStatus === "waiting_input" ||
		session?.isTextStreaming ||
		session?.isReasoningStreaming ||
		!!session?.currentTool;

	// Polling effect
	// Poll while streamingExpected is true, stop when streaming completes
	useEffect(() => {
		// Only poll when:
		// 1. We have a valid session
		// 2. Streaming is expected (mutation was called)
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
			fetchSession();
		}, POLLING_INTERVAL);

		return () => {
			clearInterval(pollId);
		};
	}, [shouldQuery, streamingExpected, session?.streamingStatus, isStreaming, fetchSession]);

	return {
		currentSession: session,
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
