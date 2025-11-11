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
import { getTRPCClient } from "../trpc-provider.js";

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

		// Subscribe to all session events
		const setupSubscription = async () => {
			try {
				const client = await getTRPCClient();

				const subscription = client.events.subscribeToAllSessions.subscribe(
					{ replayLast },
					{
						onData: (storedEvent: any) => {
							const event = storedEvent.payload;

							// Handle session CRUD events
							switch (event.type) {
								case "session-created":
									callbacks.onSessionCreated?.(event.sessionId, event.provider, event.model);
									break;

								case "session-deleted":
									callbacks.onSessionDeleted?.(event.sessionId);
									break;

								case "session-title-updated":
									callbacks.onSessionTitleUpdated?.(event.sessionId, event.title);
									break;

								case "session-title-updated-end":
									// Streaming title completed
									callbacks.onSessionTitleUpdated?.(event.sessionId, event.title);
									break;

								case "session-model-updated":
									callbacks.onSessionModelUpdated?.(event.sessionId, event.model);
									break;

								case "session-provider-updated":
									callbacks.onSessionProviderUpdated?.(
										event.sessionId,
										event.provider,
										event.model,
									);
									break;

								default:
									// Ignore other event types (text-delta, tool-call, etc.)
									break;
							}
						},
						onError: (error: any) => {
							console.error("[useSessionListSync] Error:", error.message || String(error));
						},
						onComplete: () => {
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
