/**
 * useCurrentSession Hook
 * Fetches current session data from server using Lens
 *
 * Pure Data Fetching Hook:
 * - Fetches session from server when currentSessionId changes
 * - Respects streaming state (won't overwrite optimistic data during streaming)
 * - Emits events for cross-store communication (no direct store imports)
 * - Simple, focused responsibility: fetch data and emit events
 * - State stored in Zen signals for global access
 *
 * Uses NEW Lens flat namespace API.
 */

import type { Session } from "@sylphx/code-core";
import { useEffect, useRef } from "react";
import {
	eventBus,
	currentSession,
	lensClient,
	isStreaming,
	setCurrentSession,
	useCurrentSession as useOptimisticSession,
	useCurrentSessionId,
	useIsStreaming,
	useServerSession,
	useCurrentSessionLoading,
	useCurrentSessionError,
	setServerSession as setServerSessionSignal,
	setCurrentSessionLoading as setCurrentSessionLoadingSignal,
	setCurrentSessionError as setCurrentSessionErrorSignal,
} from "@sylphx/code-client";

export function useCurrentSession() {
	const currentSessionId = useCurrentSessionId();
	const optimisticSession = useOptimisticSession();
	const isStreamingValue = useIsStreaming();

	const serverSession = useServerSession();
	const isLoading = useCurrentSessionLoading();
	const error = useCurrentSessionError();

	// Track previous session ID to detect temp-session → real session transition
	const prevSessionIdRef = useRef<string | null>(null);

	// Fetch session data from server when currentSessionId changes
	useEffect(() => {
		const prevSessionId = prevSessionIdRef.current;
		prevSessionIdRef.current = currentSessionId;

		if (!currentSessionId) {
			setServerSessionSignal(null);
			setCurrentSessionLoadingSignal(false);
			setCurrentSessionErrorSignal(null);
			return;
		}

		// Skip server fetch if we have optimistic data for a temp session
		if (currentSessionId === "temp-session") {
			setCurrentSessionLoadingSignal(false);
			return;
		}

		// RACE CONDITION FIX: If we just transitioned from temp-session,
		// don't fetch from server immediately (would overwrite optimistic messages)
		// The session-created event handler will set up the session with preserved messages.
		// Let the streaming flow complete first, then session will be synced via events.
		if (prevSessionId === "temp-session" && currentSessionId !== "temp-session") {
			setCurrentSessionLoadingSignal(false);
			return;
		}

		// FIX: Skip fetch if session already exists in memory with same ID
		// This prevents overwriting in-memory data (with tool results) with DB data
		// when user navigates back to chat screen.
		// Event replay will handle any updates needed.
		const existingSession = currentSession.value;
		if (
			existingSession?.id === currentSessionId &&
			existingSession.messages.length > 0
		) {
			setCurrentSessionLoadingSignal(false);
			return;
		}

		setCurrentSessionLoadingSignal(true);
		setCurrentSessionErrorSignal(null);

		// Use NEW Lens flat namespace: lensClient.getSession() instead of lensClient.session.getById.query()
		const client = lensClient as any;
		client
			.getSession({ id: currentSessionId })
			.then((session: any) => {
				setServerSessionSignal(session);
				setCurrentSessionLoadingSignal(false);

				// Only update store and emit events if not streaming
				// During streaming, optimistic data is authoritative
				if (!isStreaming.value) {
					// IMPORTANT: Merge with existing optimistic messages (don't overwrite)
					// System messages may have been added by events after this query started
					const currentOptimistic = currentSession.value;

					// Always merge if we have optimistic data (even if session IDs don't match)
					// This handles the case where temp-session → real session transition
					if (
						currentOptimistic?.messages &&
						currentOptimistic.messages.length > 0
					) {
						// Merge: keep messages that exist in optimistic but not in server response
						// Include: system/assistant messages + temp user messages (id starts with "temp-")
						// Exclude: real user messages (handled by user-message-created event)
						const serverMessageIds = new Set(session.messages.map((m: any) => m.id));
						const optimisticOnlyMessages = currentOptimistic.messages.filter(
							(m: any) =>
								!serverMessageIds.has(m.id) &&
								(m.role !== "user" || m.id.startsWith("temp-")),
						);

						if (optimisticOnlyMessages.length > 0) {
							setCurrentSession({
								...session,
								messages: [...session.messages, ...optimisticOnlyMessages],
							});
						} else {
							// No extra messages to merge
							setCurrentSession(session);
						}
					} else {
						// No optimistic data to merge
						setCurrentSession(session);
					}

					// Emit event for other stores to react (e.g., settings store updates rules)
					eventBus.emit("session:loaded", {
						sessionId: session.id,
						enabledRuleIds: session.enabledRuleIds || [],
					});
				}
			})
			.catch((err: any) => {
				setCurrentSessionErrorSignal(err as Error);
				setCurrentSessionLoadingSignal(false);
			});
	}, [currentSessionId]);

	// Return optimistic data if available (instant UI), otherwise server data
	const currentSessionData = optimisticSession || serverSession;

	return {
		currentSession: currentSessionData,
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
