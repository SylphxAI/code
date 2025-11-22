/**
 * @sylphx/lens-client
 *
 * Type-safe client for Lens APIs with inference from server schema.
 * Provides Router-like API similar to tRPC client.
 *
 * Features:
 * - Field Selection - Frontend controls which fields to fetch
 * - Update Strategies - Minimize transmission (delta, patch, value, auto)
 * - Optimistic Updates - Cache with auto reconciliation
 * - Type Inference - Full TypeScript type safety
 */

import type {
	LensObject,
	LensRequest,
	LensTransport,
	UpdateMode,
	FieldSelection,
} from "@sylphx/lens-core";
import type { Observable } from "@sylphx/lens-core";

/**
 * Client configuration
 */
export interface LensClientConfig {
	transport: LensTransport;
	/** Enable optimistic updates cache (default: true) */
	optimistic?: boolean;
	/** Custom cache implementation */
	cache?: LensCache;
}

/**
 * Query options - for one-time fetch
 */
export interface QueryOptions {
	/** Field selection - control which fields to fetch */
	select?: FieldSelection;
	/** Update mode - not used for queries, only subscriptions */
}

/**
 * Mutation options - for write operations
 */
export interface MutationOptions {
	/** Field selection - control which fields to return */
	select?: FieldSelection;
	/** Enable optimistic update (default: true if cache enabled) */
	optimistic?: boolean;
	/** Optimistic value to set immediately (before mutation completes) */
	optimisticData?: any;
}

/**
 * Subscription options - for real-time updates
 */
export interface SubscriptionOptions {
	/** Field selection - control which fields to fetch */
	select?: FieldSelection;
	/** Update mode - minimize transmission (delta, patch, value, auto) */
	updateMode?: UpdateMode;
}

/**
 * Cache interface for optimistic updates
 */
export interface LensCache {
	/** Get cached value */
	get(key: string): any;
	/** Set cached value */
	set(key: string, value: any): void;
	/** Delete cached value */
	delete(key: string): void;
	/** Optimistic update - set temporary value */
	optimisticUpdate(key: string, value: any): void;
	/** Revert optimistic update */
	revertOptimistic(key: string): void;
	/** Confirm optimistic update (make it permanent) */
	confirmOptimistic(key: string): void;
}

/**
 * Infer input type from schema path
 */
type InferInput<T> = T extends { input: { parse: (val: any) => infer I } }
	? I
	: never;

/**
 * Infer output type from schema path
 */
type InferOutput<T> = T extends { output: { parse: (val: any) => infer O } }
	? O
	: never;

/**
 * Default in-memory cache implementation
 */
class InMemoryCache implements LensCache {
	private data = new Map<string, any>();
	private optimisticData = new Map<string, any>();
	private originalData = new Map<string, any>();

	get(key: string): any {
		// Return optimistic data if exists, otherwise return real data
		return this.optimisticData.get(key) ?? this.data.get(key);
	}

	set(key: string, value: any): void {
		this.data.set(key, value);
		// If there was an optimistic update, confirm it
		if (this.optimisticData.has(key)) {
			this.confirmOptimistic(key);
		}
	}

	delete(key: string): void {
		this.data.delete(key);
		this.optimisticData.delete(key);
		this.originalData.delete(key);
	}

	optimisticUpdate(key: string, value: any): void {
		// Save original value if not already saved
		if (!this.originalData.has(key)) {
			this.originalData.set(key, this.data.get(key));
		}
		// Set optimistic value
		this.optimisticData.set(key, value);
	}

	revertOptimistic(key: string): void {
		// Restore original value
		const original = this.originalData.get(key);
		if (original !== undefined) {
			this.data.set(key, original);
		}
		this.optimisticData.delete(key);
		this.originalData.delete(key);
	}

	confirmOptimistic(key: string): void {
		// Make optimistic value permanent
		const optimistic = this.optimisticData.get(key);
		if (optimistic !== undefined) {
			this.data.set(key, optimistic);
		}
		this.optimisticData.delete(key);
		this.originalData.delete(key);
	}
}

/**
 * Create proxy for nested path building
 */
function createProxy<T extends LensObject>(
	transport: LensTransport,
	cache: LensCache | undefined,
	path: string[] = [],
): any {
	return new Proxy(
		{},
		{
			get(_, prop: string) {
				const newPath = [...path, prop];

				// Terminal methods
				if (prop === "query") {
					return async (input: any, options?: QueryOptions) => {
						const cacheKey = `query:${path.join(".")}:${JSON.stringify(input)}`;

						// Check cache first
						if (cache) {
							const cached = cache.get(cacheKey);
							if (cached !== undefined) {
								return cached;
							}
						}

						// Execute query
						const result = await transport.query({
							type: "query",
							path,
							input,
							select: options?.select,
						});

						// Cache result
						if (cache) {
							cache.set(cacheKey, result);
						}

						return result;
					};
				}

				if (prop === "mutate") {
					return async (input: any, options?: MutationOptions) => {
						const cacheKey = `query:${path.join(".")}:${JSON.stringify(input)}`;

						// Optimistic update
						if (cache && options?.optimistic !== false && options?.optimisticData) {
							cache.optimisticUpdate(cacheKey, options.optimisticData);
						}

						try {
							// Execute mutation
							const result = await transport.mutate({
								type: "mutation",
								path,
								input,
								select: options?.select,
							});

							// Confirm optimistic update with real result
							if (cache) {
								cache.set(cacheKey, result);
							}

							return result;
						} catch (error) {
							// Revert optimistic update on error
							if (cache && options?.optimistic !== false && options?.optimisticData) {
								cache.revertOptimistic(cacheKey);
							}
							throw error;
						}
					};
				}

				if (prop === "subscribe") {
					return (input: any, options?: SubscriptionOptions): Observable<any> => {
						return transport.subscribe({
							type: "subscription",
							path,
							input,
							select: options?.select,
							updateMode: options?.updateMode,
						});
					};
				}

				// Continue building path
				return createProxy(transport, cache, newPath);
			},
		},
	);
}

/**
 * Create type-safe Lens client
 *
 * Features:
 * - Field Selection: Control which fields to fetch
 * - Update Strategies: Minimize transmission (delta, patch, value, auto)
 * - Optimistic Updates: Cache with auto reconciliation
 * - Type Inference: Full TypeScript type safety
 *
 * @example
 * ```ts
 * const client = createLensClient<typeof api>({
 *   transport: new InProcessTransport({ api, context }),
 *   optimistic: true // Enable optimistic updates
 * });
 *
 * // Query with field selection
 * const user = await client.user.get.query(
 *   { id: '1' },
 *   { select: ['id', 'name', 'email'] }
 * );
 *
 * // Mutation with optimistic update
 * const updated = await client.user.update.mutate(
 *   { id: '1', data: { name: 'Alice' } },
 *   {
 *     optimistic: true,
 *     optimisticData: { id: '1', name: 'Alice', email: 'alice@example.com' }
 *   }
 * );
 *
 * // Subscription with update mode
 * client.user.get.subscribe(
 *   { id: '1' },
 *   {
 *     select: ['id', 'name'],
 *     updateMode: 'patch' // Only send JSON Patch
 *   }
 * ).subscribe({
 *   next: (user) => console.log(user)
 * });
 * ```
 */
export function createLensClient<T extends LensObject>(
	config: LensClientConfig,
): LensClient<T> {
	// Create cache if optimistic updates enabled
	const cache = config.optimistic !== false
		? (config.cache ?? new InMemoryCache())
		: undefined;

	return createProxy(config.transport, cache) as LensClient<T>;
}

/**
 * Type-safe client interface
 *
 * Provides type-safe methods for all operation types:
 * - Queries: query() for one-time fetch, subscribe() for real-time updates
 * - Mutations: mutate() for write operations
 * - Nested objects: Recursive client creation
 */
export type LensClient<T> = {
	[K in keyof T]: T[K] extends { type: "query" }
		? {
				/** Execute query and return Promise */
				query: (
					input: InferInput<T[K]>,
					options?: QueryOptions,
				) => Promise<InferOutput<T[K]>>;
				/** Subscribe to real-time updates and return Observable */
				subscribe: (
					input: InferInput<T[K]>,
					options?: SubscriptionOptions,
				) => Observable<InferOutput<T[K]>>;
			}
		: T[K] extends { type: "mutation" }
			? {
					/** Execute mutation and return Promise */
					mutate: (
						input: InferInput<T[K]>,
						options?: MutationOptions,
					) => Promise<InferOutput<T[K]>>;
				}
			: T[K] extends LensObject
				? LensClient<T[K]>
				: never;
};

/**
 * Export cache for direct access
 */
export { InMemoryCache };
