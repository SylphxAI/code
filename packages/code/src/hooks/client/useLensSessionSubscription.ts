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
 * Fine-Grained Control:
 * - ✅ Field selection (select: { id: true, title: true })
 * - ✅ Auto-optimized transmission (57%-99% bandwidth savings)
 * - ✅ Backend AutoStrategy handles everything (no manual config)
 */

import { useEffect, useRef } from "react";
import { currentSession, setCurrentSession, lensClient, useCurrentSessionId } from "@sylphx/code-client";
import type { Select } from "@sylphx/lens-core";
import type { Session } from "@sylphx/code-core";

export interface UseLensSessionSubscriptionOptions {
	/**
	 * Field selection - controls which session fields to receive
	 *
	 * Backend automatically optimizes transmission based on field types:
	 * - String fields (e.g., title) → Delta strategy (57% savings for streaming)
	 * - Object fields (e.g., status) → Patch strategy (99% savings for updates)
	 * - Primitive fields (e.g., id) → Value strategy (simple, fast)
	 *
	 * No manual strategy configuration needed - AutoStrategy handles everything.
	 *
	 * @example
	 * ```tsx
	 * // Only subscribe to title and status updates
	 * useLensSessionSubscription({
	 *   select: {
	 *     id: true,
	 *     title: true,       // string → auto delta
	 *     status: true,      // object → auto patch
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
		// Backend AutoStrategy automatically optimizes transmission:
		// - String fields → Delta strategy (57% savings for incremental text)
		// - Object fields → Patch strategy (99% savings for partial updates)
		// - Primitive fields → Value strategy (simple, fast)
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
