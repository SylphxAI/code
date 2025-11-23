/**
 * Resource Loader Manager
 *
 * ARCHITECTURE:
 * - Implements ResourceLoader interface
 * - Per-request loader instance
 * - Manages DataLoader instances for all resources
 * - Provides batching and caching
 */

import type { ResourceLoader } from '../resource/types.js';
import { ResourceRegistry } from '../resource/registry.js';
import { DataLoader, createResourceLoader } from './data-loader.js';
import type { RelationshipLoaderContext } from './relationship-loader.js';

/**
 * Resource loader implementation
 * One instance per request for request-scoped caching
 */
export class LensResourceLoader implements ResourceLoader {
	private db: any;
	private loaders: Map<string, DataLoader<string, any>>;
	private fieldLoaders: Map<string, DataLoader<any, Map<any, any[]>>>;

	constructor(db: any) {
		this.db = db;
		this.loaders = new Map();
		this.fieldLoaders = new Map();
	}

	/**
	 * Load a single resource by ID
	 */
	async load<T>(resourceName: string, id: string): Promise<T | null> {
		const loader = this.getOrCreateLoader<T>(resourceName);
		return await loader.load(id);
	}

	/**
	 * Load multiple resources by IDs
	 * Returns array in same order as IDs
	 */
	async loadMany<T>(resourceName: string, ids: string[]): Promise<(T | null)[]> {
		const loader = this.getOrCreateLoader<T>(resourceName);
		const results = await loader.loadMany(ids);
		return results.map((r) => (r instanceof Error ? null : r));
	}

	/**
	 * Load resources by field value
	 * Groups results by field value
	 *
	 * @example
	 * ```typescript
	 * // Load all steps for message IDs
	 * const stepsByMessage = await loader.loadByField(
	 *   'step',
	 *   'message_id',
	 *   ['msg-1', 'msg-2']
	 * );
	 * // stepsByMessage = Map {
	 * //   'msg-1' => [step1, step2],
	 * //   'msg-2' => [step3]
	 * // }
	 * ```
	 */
	async loadByField<T>(
		resourceName: string,
		field: string,
		values: any[]
	): Promise<Map<any, T[]>> {
		const loaderKey = `${resourceName}:${field}`;

		// Get or create field loader
		let loader = this.fieldLoaders.get(loaderKey);
		if (!loader) {
			loader = new DataLoader<any, Map<any, T[]>>(async (fieldValues) => {
				const resource = ResourceRegistry.get(resourceName);
				if (!resource) {
					throw new Error(`Resource "${resourceName}" not found in registry`);
				}

				const tableName = resource.tableName || resourceName + 's';

				// PLACEHOLDER: Replace with actual database query
				// const results = await this.db.query[tableName].findMany({
				//   where: { [field]: { in: fieldValues } }
				// });

				console.warn(
					`[ResourceLoader] Loading ${resourceName} by ${field} (${fieldValues.length} values) - DB integration pending`
				);

				// Mock: Return empty map for each value
				return fieldValues.map(() => new Map<any, T[]>());

				// In real implementation, group results by field value:
				// return fieldValues.map(value => {
				//   const grouped = new Map<any, T[]>();
				//   const matching = results.filter(r => r[field] === value);
				//   grouped.set(value, matching);
				//   return grouped;
				// });
			});
			this.fieldLoaders.set(loaderKey, loader);
		}

		// Load for all values (batched)
		const maps = await loader.loadMany(values);

		// Merge all maps
		const result = new Map<any, T[]>();
		for (const map of maps) {
			if (map instanceof Error) continue;
			for (const [key, value] of map.entries()) {
				result.set(key, value);
			}
		}

		return result;
	}

	/**
	 * Prime the cache with a value
	 * Useful for optimistically updating cache
	 */
	prime<T>(resourceName: string, id: string, value: T): void {
		const loader = this.getOrCreateLoader<T>(resourceName);
		loader.prime(id, value);
	}

	/**
	 * Clear cache for specific resource/id or all
	 */
	clear(resourceName: string, id?: string): void {
		if (id !== undefined) {
			const loader = this.loaders.get(resourceName);
			if (loader) {
				loader.clear(id);
			}
		} else {
			// Clear all loaders for this resource
			const loader = this.loaders.get(resourceName);
			if (loader) {
				loader.clearAll();
			}

			// Clear field loaders
			for (const [key, fieldLoader] of this.fieldLoaders.entries()) {
				if (key.startsWith(`${resourceName}:`)) {
					fieldLoader.clearAll();
				}
			}
		}
	}

	/**
	 * Get relationship loader context
	 * Used by relationship-loader functions
	 */
	getRelationshipContext(): RelationshipLoaderContext {
		return {
			db: this.db,
			loaders: this.loaders,
		};
	}

	/**
	 * Get or create DataLoader for a resource
	 */
	private getOrCreateLoader<T>(resourceName: string): DataLoader<string, T | null> {
		let loader = this.loaders.get(resourceName);
		if (!loader) {
			loader = createResourceLoader<T>(resourceName, this.db);
			this.loaders.set(resourceName, loader);
		}
		return loader;
	}
}

/**
 * Create a new resource loader for a request
 * Call this once per request to get request-scoped caching
 */
export function createLoader(db: any): ResourceLoader {
	return new LensResourceLoader(db);
}
