/**
 * Session List Sync Hook
 * Real-time multi-client synchronization for session lists
 *
 * Subscribes to session-events channel and updates session list reactively.
 * Enables TUI + GUI session lists to stay perfectly in sync.
 *
 * Usage:
 * ```tsx
 * const [sessions, setSessions] = useState<SessionMetadata[]>([]);
 *
 * useSessionListSync({
 *   onSessionCreated: (sessionId) => {
 *     // Fetch and add new session to list
 *     loadSession(sessionId).then(session => {
 *       setSessions(prev => [session, ...prev]);
 *     });
 *   },
 *   onSessionDeleted: (sessionId) => {
 *     // Remove session from list
 *     setSessions(prev => prev.filter(s => s.id !== sessionId));
 *   },
 *   onSessionUpdated: (sessionId, field, value) => {
 *     // Update session in list
 *     setSessions(prev => prev.map(s =>
 *       s.id === sessionId ? { ...s, [field]: value } : s
 *     ));
 *   },
 * });
 * ```
 */

import { useEffect, useRef } from "react";
import { getLensClient } from "@sylphx/code-client";
import type { API } from "@sylphx/code-api";

export interface SessionListSyncCallbacks {
	/**
	 * Called when a new session is created
	 * You should fetch the full session data and add it to your list
	 */
	onSessionCreated?: (sessionId: string, provider: string, model: string) => void;

	/**
	 * Called when a session is deleted
	 * You should remove it from your list
	 */
	onSessionDeleted?: (sessionId: string) => void;

	/**
	 * Called when a session title is updated
	 * You should update the title in your list
	 */
	onSessionTitleUpdated?: (sessionId: string, title: string) => void;

	/**
	 * Called when a session model is updated
	 * You should update the model in your list
	 */
	onSessionModelUpdated?: (sessionId: string, model: string) => void;

	/**
	 * Called when a session provider is updated
	 * You should update the provider and model in your list
	 */
	onSessionProviderUpdated?: (sessionId: string, provider: string, model: string) => void;
}

export interface UseSessionListSyncOptions {
	/**
	 * Replay last N events when subscribing
	 * Useful to catch up on missed events when switching screens
	 */
	replayLast?: number;

	/**
	 * Event callbacks
	 */
	callbacks?: SessionListSyncCallbacks;

	/**
	 * Enable/disable the subscription
	 * Set to false when not on Dashboard to save resources
	 */
	enabled?: boolean;
}

/**
 * Hook to subscribe to all session events for list synchronization
 */
export function useSessionListSync(options: UseSessionListSyncOptions = {}) {
	const { replayLast = 20, callbacks = {}, enabled = true } = options;

	const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

	useEffect(() => {
		// Skip if disabled
		if (!enabled) {
			return;
		}

		// Cleanup previous subscription
		if (subscriptionRef.current) {
			subscriptionRef.current.unsubscribe();
			subscriptionRef.current = null;
		}

		// Subscribe to all session events using Lens
		const setupSubscription = () => {
			try {
				const client = getLensClient<API>();

				const subscription = client.events.subscribeToAllSessions.subscribe(
					{ replayLast },
					{
						next: (storedEvent: any) => {
							const event = storedEvent.payload;

							// Handle session CRUD events (model-level)
							switch (event.type) {
								case "session-created":
									callbacks.onSessionCreated?.(event.sessionId, event.provider, event.model);
									break;

								case "session-deleted":
									callbacks.onSessionDeleted?.(event.sessionId);
									break;

								case "session-updated":
									// Model-level event with partial session
									// Extract what changed and call appropriate callback
									if (event.session.title !== undefined) {
										callbacks.onSessionTitleUpdated?.(event.sessionId, event.session.title);
									}
									if (event.session.model !== undefined && event.session.provider === undefined) {
										// Model updated independently
										callbacks.onSessionModelUpdated?.(event.sessionId, event.session.model);
									}
									if (event.session.provider !== undefined && event.session.model !== undefined) {
										// Provider + model updated together
										callbacks.onSessionProviderUpdated?.(
											event.sessionId,
											event.session.provider,
											event.session.model,
										);
									}
									break;

								case "session-compacted":
									// Session compacted - treat old session as deleted, new session as created
									callbacks.onSessionDeleted?.(event.oldSessionId);
									// Note: session-created event will be emitted separately for new session
									break;

								default:
									// Ignore other event types (not session list events)
									break;
							}
						},
						error: (error: any) => {
							console.error("[useSessionListSync] Error:", error.message || String(error));
						},
						complete: () => {
							// Subscription completed
						},
					},
				);

				subscriptionRef.current = subscription;
			} catch (error) {
				console.error("[useSessionListSync] Setup error:", error);
			}
		};

		setupSubscription();

		// Cleanup on unmount or when enabled changes
		return () => {
			if (subscriptionRef.current) {
				subscriptionRef.current.unsubscribe();
				subscriptionRef.current = null;
			}
		};
	}, [enabled, replayLast, callbacks]);
}
