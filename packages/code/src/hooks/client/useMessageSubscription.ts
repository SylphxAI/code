/**
 * useMessageSubscription Hook
 * Subscribe to message model with real-time updates as parts stream in
 *
 * LENS ARCHITECTURE:
 * - Subscribes to message.getById for a specific assistant message
 * - Receives real-time updates as parts are added/updated during streaming
 * - Replaces event-based streaming (text-delta, tool-call, etc.)
 * - Reactive: UI updates automatically when model changes
 *
 * MIGRATION PATH:
 * - Phase 1: ✅ Parts written to database during streaming
 * - Phase 4: ✅ message.getById endpoint added
 * - Phase 5: 🚧 This hook - client migration
 * - Phase 6: ⏳ Remove event handlers
 */

import type { Message } from "@sylphx/code-core";
import { lensClient } from "@sylphx/code-client";
import { useEffect, useState } from "react";

interface UseMessageSubscriptionOptions {
	/** Message ID to subscribe to */
	messageId: string | null;
	/** Enable subscription (default: true) */
	enabled?: boolean;
}

interface UseMessageSubscriptionResult {
	/** Message data with steps and parts */
	message: Message | null;
	/** Loading state */
	isLoading: boolean;
	/** Error state */
	error: Error | null;
}

/**
 * Subscribe to a message and receive real-time updates
 *
 * Example:
 * ```tsx
 * const { message, isLoading } = useMessageSubscription({
 *   messageId: activeMessageId,
 * });
 *
 * // message.steps[0].parts automatically updates as streaming progresses
 * ```
 */
export function useMessageSubscription({
	messageId,
	enabled = true,
}: UseMessageSubscriptionOptions): UseMessageSubscriptionResult {
	const [message, setMessage] = useState<Message | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		// Skip if disabled or no message ID
		if (!enabled || !messageId) {
			setMessage(null);
			setIsLoading(false);
			setError(null);
			return;
		}

		setIsLoading(true);
		setError(null);

		// Subscribe to message
		const subscription = lensClient.message.getById.subscribe(
			{ messageId },
			{
				// Select nested fields: message.steps.parts
				select: {
					id: true,
					role: true,
					status: true,
					usage: true,
					steps: {
						select: {
							id: true,
							stepIndex: true,
							status: true,
							provider: true,
							model: true,
							parts: true, // All parts with real-time updates
						},
					},
				},
			},
			{
				onData: (data) => {
					setMessage(data);
					setIsLoading(false);
				},
				onError: (err) => {
					setError(err as Error);
					setIsLoading(false);
				},
			},
		);

		// Cleanup subscription on unmount or messageId change
		return () => {
			subscription.unsubscribe();
		};
	}, [messageId, enabled]);

	return {
		message,
		isLoading,
		error,
	};
}
