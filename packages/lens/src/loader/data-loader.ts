/**
 * DataLoader Integration
 *
 * ARCHITECTURE:
 * - Automatic batching for relationship loading
 * - Per-request caching
 * - Deduplication of queries
 * - Compatible with facebook/dataloader pattern
 *
 * NOTE: This implementation provides DataLoader-compatible interface.
 * For production, install 'dataloader' package: bun add dataloader
 */

import type { ResourceDefinition } from '../resource/types.js';
import { ResourceRegistry } from '../resource/registry.js';

/**
 * Batch function type
 * Takes array of keys, returns array of values in same order
 */
export type BatchLoadFn<K, V> = (keys: readonly K[]) => Promise<(V | Error)[]>;

/**
 * DataLoader options
 */
export interface DataLoaderOptions<K, V> {
	/** Batch function to load values */
	batchLoadFn: BatchLoadFn<K, V>;

	/** Maximum batch size (default: unlimited) */
	maxBatchSize?: number;

	/** Custom cache key function */
	cacheKeyFn?: (key: K) => any;

	/** Disable caching */
	cache?: boolean;

	/** Custom cache map */
	cacheMap?: Map<any, Promise<V>>;
}

/**
 * Minimal DataLoader implementation
 * Compatible with facebook/dataloader API
 *
 * Features:
 * - Automatic batching within event loop tick
 * - Per-instance caching
 * - Deduplication of keys
 */
export class DataLoader<K, V> {
	private batchLoadFn: BatchLoadFn<K, V>;
	private options: Required<Omit<DataLoaderOptions<K, V>, 'batchLoadFn' | 'cacheMap'>> & {
		cacheMap?: Map<any, Promise<V>>;
	};

	private cache: Map<any, Promise<V>>;
	private queue: Array<{
		key: K;
		resolve: (value: V) => void;
		reject: (error: Error) => void;
	}> = [];
	private batchScheduled = false;

	constructor(batchLoadFn: BatchLoadFn<K, V>, options: Partial<DataLoaderOptions<K, V>> = {}) {
		this.batchLoadFn = batchLoadFn;
		this.options = {
			maxBatchSize: options.maxBatchSize ?? Infinity,
			cacheKeyFn: options.cacheKeyFn ?? ((key: K) => key),
			cache: options.cache ?? true,
			cacheMap: options.cacheMap,
		};

		this.cache = this.options.cacheMap ?? new Map();
	}

	/**
	 * Load a single value
	 * Automatically batches with other loads in same tick
	 */
	load(key: K): Promise<V> {
		// Check cache first
		const cacheKey = this.options.cacheKeyFn(key);
		if (this.options.cache) {
			const cached = this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		// Create promise and add to queue
		const promise = new Promise<V>((resolve, reject) => {
			this.queue.push({ key, resolve, reject });

			// Schedule batch if not already scheduled
			if (!this.batchScheduled) {
				this.batchScheduled = true;
				// Use setImmediate (or setTimeout 0) to batch in next tick
				if (typeof setImmediate !== 'undefined') {
					setImmediate(() => this.dispatchBatch());
				} else {
					setTimeout(() => this.dispatchBatch(), 0);
				}
			}
		});

		// Cache promise
		if (this.options.cache) {
			this.cache.set(cacheKey, promise);
		}

		return promise;
	}

	/**
	 * Load multiple values
	 * Returns array in same order as keys
	 */
	loadMany(keys: readonly K[]): Promise<(V | Error)[]> {
		return Promise.all(keys.map((key) => this.load(key).catch((err) => err)));
	}

	/**
	 * Prime the cache with a value
	 */
	prime(key: K, value: V): this {
		const cacheKey = this.options.cacheKeyFn(key);
		this.cache.set(cacheKey, Promise.resolve(value));
		return this;
	}

	/**
	 * Clear cache for specific key or all keys
	 */
	clear(key?: K): this {
		if (key === undefined) {
			this.cache.clear();
		} else {
			const cacheKey = this.options.cacheKeyFn(key);
			this.cache.delete(cacheKey);
		}
		return this;
	}

	/**
	 * Clear all cache
	 */
	clearAll(): this {
		this.cache.clear();
		return this;
	}

	/**
	 * Dispatch current batch
	 */
	private async dispatchBatch(): Promise<void> {
		this.batchScheduled = false;

		// Get current queue and reset
		const batch = this.queue;
		this.queue = [];

		if (batch.length === 0) {
			return;
		}

		// Deduplicate keys while preserving order
		const uniqueKeys = new Map<any, K>();
		const keyToItems = new Map<any, typeof batch>();

		for (const item of batch) {
			const cacheKey = this.options.cacheKeyFn(item.key);
			if (!uniqueKeys.has(cacheKey)) {
				uniqueKeys.set(cacheKey, item.key);
			}
			if (!keyToItems.has(cacheKey)) {
				keyToItems.set(cacheKey, []);
			}
			keyToItems.get(cacheKey)!.push(item);
		}

		const keys = Array.from(uniqueKeys.values());

		// Execute batch load
		try {
			const values = await this.batchLoadFn(keys);

			// Validate response length
			if (values.length !== keys.length) {
				throw new Error(
					`DataLoader batch function must return array of same length as keys. ` +
						`Expected ${keys.length}, got ${values.length}`
				);
			}

			// Resolve/reject promises
			for (let i = 0; i < keys.length; i++) {
				const cacheKey = this.options.cacheKeyFn(keys[i]);
				const items = keyToItems.get(cacheKey)!;
				const value = values[i];

				if (value instanceof Error) {
					for (const item of items) {
						item.reject(value);
					}
				} else {
					for (const item of items) {
						item.resolve(value);
					}
				}
			}
		} catch (error) {
			// If batch load fails, reject all items
			for (const item of batch) {
				item.reject(error as Error);
			}
		}
	}
}

/**
 * Create a DataLoader for a specific resource
 */
export function createResourceLoader<T = any>(
	resourceName: string,
	db: any
): DataLoader<string, T | null> {
	const resource = ResourceRegistry.get(resourceName);
	if (!resource) {
		throw new Error(`Resource "${resourceName}" not found in registry`);
	}

	return new DataLoader<string, T | null>(async (ids) => {
		// Batch query by IDs
		const tableName = resource.tableName || resourceName + 's';

		// PLACEHOLDER: Replace with actual database query
		// In real implementation:
		// const results = await db.query[tableName].findMany({
		//   where: { id: { in: ids } }
		// });

		console.warn(
			`[DataLoader] Batch loading ${ids.length} ${resourceName} records - DB integration pending`
		);

		// Mock: Return null for each ID
		return ids.map(() => null);
	});
}
