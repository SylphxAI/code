/**
 * useCurrentSession Hook
 * Provides current session data from signals
 *
 * ARCHITECTURE: Event-Driven Session State
 * =========================================
 * Session data flows through two mechanisms:
 *
 * 1. INITIAL LOAD (this hook):
 *    - Fetches session from server when navigating to existing session
 *    - Uses lensClient.getSession() for one-time fetch
 *    - Sets data into currentSession signal
 *
 * 2. REAL-TIME UPDATES (useEventStream):
 *    - Event handlers update currentSession signal directly
 *    - Handles: session-created, session-updated, text-delta, tool-call, etc.
 *    - Optimistic updates applied in subscriptionAdapter before events arrive
 *
 * WHY SIGNALS (not useQuery)?
 * - Chat requires real-time streaming with optimistic updates
 * - Events modify session in-place (appending content, updating status)
 * - useQuery would create dual source of truth with event handlers
 * - Signals provide single source of truth that both fetch and events update
 *
 * For simpler components, use direct useQuery pattern (see StatusBar.tsx).
 */

import { useEffect, useRef } from "react";
import {
	eventBus,
	currentSession,
	lensClient,
	isStreaming,
	setCurrentSession,
	useCurrentSession as useCurrentSessionSignal,
	useCurrentSessionId,
	useIsStreaming,
	useCurrentSessionLoading,
	useCurrentSessionError,
	setCurrentSessionLoading,
	setCurrentSessionError,
} from "@sylphx/code-client";

export function useCurrentSession() {
	const currentSessionId = useCurrentSessionId();
	const session = useCurrentSessionSignal();
	const isStreamingValue = useIsStreaming();
	const isLoading = useCurrentSessionLoading();
	const error = useCurrentSessionError();

	// Track previous session ID to detect temp-session → real session transition
	const prevSessionIdRef = useRef<string | null>(null);

	// Fetch session data from server when currentSessionId changes
	useEffect(() => {
		const prevSessionId = prevSessionIdRef.current;
		prevSessionIdRef.current = currentSessionId;

		// No session ID → clear state
		if (!currentSessionId) {
			setCurrentSessionLoading(false);
			setCurrentSessionError(null);
			return;
		}

		// temp-session → Use optimistic data, no server fetch
		if (currentSessionId === "temp-session") {
			setCurrentSessionLoading(false);
			return;
		}

		// Just transitioned from temp-session → Let streaming complete, don't fetch
		// The session-created event will set up the session with preserved messages
		if (prevSessionId === "temp-session") {
			setCurrentSessionLoading(false);
			return;
		}

		// Session already in memory with messages → Don't overwrite with stale DB data
		// Event replay (via useEventStream replayLast) handles updates
		const existingSession = currentSession.value;
		if (existingSession?.id === currentSessionId && existingSession.messages.length > 0) {
			setCurrentSessionLoading(false);
			return;
		}

		// Fetch session from server
		setCurrentSessionLoading(true);
		setCurrentSessionError(null);

		const client = lensClient as any;
		client
			.getSession({ id: currentSessionId })
			.then((serverSession: any) => {
				setCurrentSessionLoading(false);

				// Skip if streaming started (optimistic data is authoritative)
				if (isStreaming.value) {
					return;
				}

				// Merge with any optimistic messages that arrived after fetch started
				const currentOptimistic = currentSession.value;
				if (currentOptimistic?.messages?.length > 0) {
					const serverMessageIds = new Set(serverSession.messages.map((m: any) => m.id));
					const optimisticOnlyMessages = currentOptimistic.messages.filter(
						(m: any) =>
							!serverMessageIds.has(m.id) &&
							(m.role !== "user" || m.id.startsWith("temp-")),
					);

					if (optimisticOnlyMessages.length > 0) {
						setCurrentSession({
							...serverSession,
							messages: [...serverSession.messages, ...optimisticOnlyMessages],
						});
					} else {
						setCurrentSession(serverSession);
					}
				} else {
					setCurrentSession(serverSession);
				}

				// Emit event for other stores (e.g., settings store updates rules)
				eventBus.emit("session:loaded", {
					sessionId: serverSession.id,
					enabledRuleIds: serverSession.enabledRuleIds || [],
				});
			})
			.catch((err: any) => {
				setCurrentSessionError(err as Error);
				setCurrentSessionLoading(false);
			});
	}, [currentSessionId]);

	return {
		currentSession: session,
		currentSessionId,
		isStreaming: isStreamingValue,
		isLoading,
		error,
	};
}

/**
 * Re-export useCurrentSessionId from code-client for convenience
 */
export { useCurrentSessionId } from "@sylphx/code-client";
