/**
 * AppEventStream PubSub Adapter for Lens
 *
 * Adapts existing AppEventStream to Lens PubSubAdapter interface
 * Preserves features: cursor-based replay, persistence, cleanup
 */

import type { PubSubAdapter, PubSubEvent } from "@sylphx/lens-server";
import { Observable } from "rxjs";
import type { AppEventStream } from "../services/app-event-stream.service.js";

/**
 * Adapt AppEventStream to Lens PubSubAdapter
 */
export class AppEventStreamPubSubAdapter implements PubSubAdapter {
	constructor(private eventStream: AppEventStream) {}

	/**
	 * Publish event to channel
	 */
	async publish<T = unknown>(channel: string, event: PubSubEvent<T>): Promise<void> {
		await this.eventStream.publish(channel, event as any);
	}

	/**
	 * Subscribe to channel
	 *
	 * Note: Basic subscription only (no cursor-based replay)
	 * For cursor-based replay, use AppEventStream.subscribe() directly
	 */
	subscribe<T = unknown>(channel: string): Observable<PubSubEvent<T>> {
		return this.eventStream.subscribe(channel) as Observable<PubSubEvent<T>>;
	}

	/**
	 * Subscribe with history (replay last N events)
	 */
	subscribeWithHistory<T = unknown>(channel: string, lastN: number): Observable<PubSubEvent<T>> {
		return this.eventStream.subscribeWithHistory(channel, lastN) as Observable<PubSubEvent<T>>;
	}

	/**
	 * Subscribe with cursor-based replay
	 */
	subscribeFromCursor<T = unknown>(
		channel: string,
		cursor: { timestamp: number; sequence: number },
	): Observable<PubSubEvent<T>> {
		return this.eventStream.subscribe(channel, cursor) as Observable<PubSubEvent<T>>;
	}

	/**
	 * Get channel info
	 */
	async info(channel: string): Promise<{
		inMemoryCount: number;
		persistedCount?: number;
		firstId?: string | null;
		lastId?: string | null;
	}> {
		return await this.eventStream.info(channel);
	}

	/**
	 * Cleanup old events
	 */
	async cleanup(): Promise<void> {
		await this.eventStream.cleanup();
	}

	/**
	 * Cleanup specific channel
	 */
	async cleanupChannel(channel: string, keep: number): Promise<void> {
		await this.eventStream.cleanupChannel(channel, keep);
	}

	/**
	 * Close adapter
	 */
	async close(): Promise<void> {
		this.eventStream.destroy();
	}
}
