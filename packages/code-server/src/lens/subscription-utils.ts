/**
 * Live Query Subscription Utilities
 *
 * Helper functions for Live Query subscribers.
 * Reduces boilerplate and ensures consistent handling of:
 * - Timestamp filtering (skip replayed events from ReplaySubject buffer)
 * - Cancellation cleanup
 * - Event channel subscription
 */

import type { LensContext } from "./context.js";

/**
 * Event handler function type
 * Receives payload and returns void (sync) or Promise<void> (async)
 */
export type EventHandler = (payload: any) => void | Promise<void>;

/**
 * Subscribe to a session-stream channel with automatic timestamp filtering.
 *
 * This helper:
 * 1. Creates subscription start timestamp
 * 2. Subscribes to the channel
 * 3. Filters out replayed events (from ReplaySubject buffer)
 * 4. Calls handler only for NEW events
 * 5. Returns cleanup function
 *
 * @example
 * ```typescript
 * .subscribe(({ input, ctx }) => ({ emit, onCleanup }) => {
 *   const cleanup = subscribeToSessionStream(
 *     ctx,
 *     input.sessionId,
 *     (payload) => {
 *       if (payload?.type === "message-created") {
 *         emit.push(payload.message);
 *       }
 *     }
 *   );
 *   onCleanup(cleanup);
 * });
 * ```
 */
export function subscribeToSessionStream(
	ctx: LensContext,
	sessionId: string,
	handler: EventHandler,
): () => void {
	const channel = `session-stream:${sessionId}`;
	const subscriptionStartTime = Date.now();
	let cancelled = false;

	(async () => {
		for await (const { payload, timestamp } of ctx.eventStream.subscribe(channel)) {
			if (cancelled) break;

			// Skip replayed events (events from before subscription started)
			if (timestamp && timestamp < subscriptionStartTime) {
				continue;
			}

			await handler(payload);
		}
	})();

	return () => {
		cancelled = true;
	};
}

/**
 * Subscribe to a global event channel with automatic timestamp filtering.
 *
 * @example
 * ```typescript
 * .subscribe(({ ctx }) => ({ emit, onCleanup }) => {
 *   const cleanup = subscribeToChannel(
 *     ctx,
 *     "session-events",
 *     (payload) => {
 *       if (payload?.type === "session-created") {
 *         emit.push(payload.session);
 *       }
 *     }
 *   );
 *   onCleanup(cleanup);
 * });
 * ```
 */
export function subscribeToChannel(
	ctx: LensContext,
	channel: string,
	handler: EventHandler,
): () => void {
	const subscriptionStartTime = Date.now();
	let cancelled = false;

	(async () => {
		for await (const { payload, timestamp } of ctx.eventStream.subscribe(channel)) {
			if (cancelled) break;

			// Skip replayed events
			if (timestamp && timestamp < subscriptionStartTime) {
				continue;
			}

			await handler(payload);
		}
	})();

	return () => {
		cancelled = true;
	};
}

/**
 * Subscribe to a pattern-based channel with automatic timestamp filtering.
 * Useful for subscribing to multiple related channels.
 *
 * @example
 * ```typescript
 * subscribeToPattern(ctx, /^bash-events:.*$/, handler);
 * ```
 */
export function subscribeToPattern(
	ctx: LensContext,
	pattern: RegExp,
	handler: EventHandler,
): () => void {
	const subscriptionStartTime = Date.now();
	let cancelled = false;

	(async () => {
		for await (const event of ctx.eventStream.subscribePattern(pattern)) {
			if (cancelled) break;

			// Skip replayed events
			if (event.timestamp && event.timestamp < subscriptionStartTime) {
				continue;
			}

			await handler(event.payload);
		}
	})();

	return () => {
		cancelled = true;
	};
}
