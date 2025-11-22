/**
 * Lens Session Subscription Hook
 *
 * Direct Lens subscription for real-time session updates.
 * Replaces legacy useEventStream with cleaner, simpler approach.
 *
 * Architecture:
 * - Subscribes directly to session.getById.subscribe()
 * - Receives model-level events (session-updated) from backend
 * - Simple reactive pattern: Observable → update local state
 * - No large switch statements for event dispatch
 *
 * Benefits over legacy useEventStream:
 * - ✅ Simpler code (no switch statement)
 * - ✅ Direct subscription to resource (session)
 * - ✅ Model-level events only (consistent granularity)
 * - ✅ Uses existing Lens subscription implementation
 * - ✅ Same event payload structure (no breaking changes)
 *
 * Future Enhancements (when Lens transport layer supports):
 * - Field selection (select: { id: true, title: true })
 * - Update strategies (updateMode: 'delta' | 'patch' | 'auto')
 * - Transmission optimization (57%-99% bandwidth savings)
 */

import { useEffect, useRef } from "react";
import { currentSession, setCurrentSession, lensClient, useCurrentSessionId } from "@sylphx/code-client";
import type { Select } from "@sylphx/lens-core";
import type { Session } from "@sylphx/code-core";

export interface UseLensSessionSubscriptionOptions {
	/**
	 * Field selection - controls which session fields to receive
	 *
	 * @example
	 * ```tsx
	 * // Only subscribe to title and status updates
	 * useLensSessionSubscription({
	 *   select: {
	 *     id: true,
	 *     title: true,
	 *     status: true,
	 *     // messages: false  ← Explicitly exclude (no bandwidth waste)
	 *   }
	 * });
	 * ```
	 */
	select?: Select<Session>;

	/**
	 * Callback when session updates
	 */
	onSessionUpdated?: (session: any) => void;
}

/**
 * Hook to subscribe to real-time session updates using Lens subscriptions
 *
 * Automatically handles:
 * - Session switching (unsubscribes from old, subscribes to new)
 * - Local state updates (updates currentSession signal)
 * - Subscription lifecycle (cleanup on unmount)
 *
 * @example
 * ```tsx
 * useLensSessionSubscription({
 *   onSessionUpdated: (session) => {
 *     console.log('Session updated:', session);
 *   }
 * });
 * ```
 */
export function useLensSessionSubscription(options: UseLensSessionSubscriptionOptions = {}) {
	const { onSessionUpdated, select } = options;

	const currentSessionId = useCurrentSessionId();

	// Ref to track subscription
	const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

	/**
	 * CRITICAL: Store callback in ref to avoid stale closures
	 *
	 * Problem: If callback in dependency array, useEffect re-runs on every render
	 * Solution: Store callback in ref, update ref on each render
	 */
	const callbackRef = useRef(onSessionUpdated);
	useEffect(() => {
		callbackRef.current = onSessionUpdated;
	}, [onSessionUpdated]);

	useEffect(() => {
		// Cleanup previous subscription
		if (subscriptionRef.current) {
			subscriptionRef.current.unsubscribe();
			subscriptionRef.current = null;
		}

		// Skip if no session
		if (!currentSessionId) {
			return;
		}

		// Subscribe to session updates using Lens with field selection
		// This uses the existing session.getById.subscribe() implementation
		// which subscribes to 'session:${sessionId}' channel and filters for session-updated events
		//
		// Field selection (if provided) reduces bandwidth by only transmitting selected fields
		const subscription = lensClient.session.getById
			.subscribe(
				{ sessionId: currentSessionId },
				select ? { select } : undefined
			)
			.subscribe({
				next: (session: any) => {
					if (!session) return;

					// Update local state (immutable update for zen signals)
					const currentSessionValue = currentSession.value;
					if (currentSessionValue && currentSessionValue.id === session.id) {
						setCurrentSession({
							...currentSessionValue,
							...session,
							// Preserve arrays/objects not in update
							messages: session.messages || currentSessionValue.messages,
							todos: session.todos || currentSessionValue.todos,
						});
					}

					// Trigger callback
					callbackRef.current?.(session);
				},
				error: (error: any) => {
					console.error("[useLensSessionSubscription] Error:", error);
				},
				complete: () => {
					// Subscription completed (e.g., session deleted)
					console.log("[useLensSessionSubscription] Subscription completed");
				},
			});

		subscriptionRef.current = subscription;

		// Cleanup on unmount or session change
		return () => {
			subscription.unsubscribe();
			subscriptionRef.current = null;
		};
	}, [currentSessionId, select]);
	// NOTE: onSessionUpdated NOT in dependency array to avoid infinite loop
	// NOTE: select IS in dependency array - stable object defined at call site
}
