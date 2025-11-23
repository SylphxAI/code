/**
 * Lens EventStream Wrapper
 *
 * Provides Lens-compatible EventStreamInterface using AppEventStream.
 * This is NOT an adapter/workaround - it's a clean interface wrapper
 * that bridges AppEventStream's async API with Lens's sync API expectations.
 *
 * AppEventStream now natively supports:
 * - subscribePattern (added for Lens)
 * - subscribe
 * - publish
 *
 * This wrapper simply:
 * 1. Wraps async publish → sync (fire-and-forget)
 * 2. Converts Observable → callback options
 * 3. Exposes subscribePattern
 */

import type { EventStreamInterface } from "@sylphx/lens-core";
import type { AppEventStream } from "./app-event-stream.service.js";
import { Observable } from "rxjs";

/**
 * Create Lens-compatible EventStream from AppEventStream
 *
 * @param appEventStream - The enhanced AppEventStream instance
 * @returns EventStreamInterface for Lens
 */
export function createLensEventStream(
	appEventStream: AppEventStream,
): EventStreamInterface {
	return {
		/**
		 * Publish event (sync wrapper for async publish)
		 *
		 * Lens expects fire-and-forget sync publish.
		 * AppEventStream's async publish is for persistence/cursor management.
		 */
		publish<T = any>(key: string, data: T): void {
			appEventStream
				.publish(key, {
					type: "update",
					data,
				})
				.catch((err) => {
					console.error(`[LensEventStream] Publish error for ${key}:`, err);
				});
		},

		/**
		 * Subscribe to exact key
		 *
		 * Converts Observable → callback options
		 */
		subscribe<T = any>(
			key: string,
			options: {
				next?: (data: T) => void;
				error?: (error: Error) => void;
				complete?: () => void;
			},
		): { unsubscribe: () => void } {
			const observable = appEventStream.subscribe(key);

			const subscription = observable.subscribe({
				next: (storedEvent) => {
					// Extract data from StoredEvent wrapper
					const data = storedEvent.payload?.data || storedEvent.payload;
					options.next?.(data as T);
				},
				error: (err) => options.error?.(err),
				complete: () => options.complete?.(),
			});

			return {
				unsubscribe: () => subscription.unsubscribe(),
			};
		},

		/**
		 * Subscribe to pattern
		 *
		 * Uses AppEventStream's native subscribePattern support
		 */
		subscribePattern<T = any>(
			pattern: RegExp,
			options: {
				next?: (data: T) => void;
				error?: (error: Error) => void;
				complete?: () => void;
			},
		): { unsubscribe: () => void } {
			const observable = appEventStream.subscribePattern(pattern);

			const subscription = observable.subscribe({
				next: (storedEvent) => {
					// Extract data from StoredEvent wrapper
					const data = storedEvent.payload?.data || storedEvent.payload;
					options.next?.(data as T);
				},
				error: (err) => options.error?.(err),
				complete: () => options.complete?.(),
			});

			return {
				unsubscribe: () => subscription.unsubscribe(),
			};
		},

		/**
		 * Get Observable for key
		 *
		 * Direct Observable access for advanced use cases
		 */
		observe<T = any>(key: string): Observable<T> {
			return new Observable<T>((observer) => {
				const observable = appEventStream.subscribe(key);

				const subscription = observable.subscribe({
					next: (storedEvent) => {
						const data = storedEvent.payload?.data || storedEvent.payload;
						observer.next(data as T);
					},
					error: (err) => observer.error(err),
					complete: () => observer.complete(),
				});

				return () => subscription.unsubscribe();
			});
		},
	};
}
