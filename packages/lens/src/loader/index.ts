/**
 * Lens DataLoader Integration
 *
 * Automatic batching and caching for resource queries
 *
 * @example
 * ```typescript
 * import { createLoader } from '@sylphx/lens/loader';
 *
 * // Create per-request loader
 * const loader = createLoader(db);
 *
 * // Load single resource (automatically batched)
 * const message = await loader.load('message', 'msg-123');
 *
 * // Load multiple resources (batched)
 * const messages = await loader.loadMany('message', ['msg-1', 'msg-2']);
 *
 * // Load by field (for relationships)
 * const stepsByMessage = await loader.loadByField('step', 'message_id', ['msg-1']);
 * ```
 */

// DataLoader
export { DataLoader, createResourceLoader } from './data-loader.js';
export type { BatchLoadFn, DataLoaderOptions } from './data-loader.js';

// Resource Loader
export { LensResourceLoader, createLoader } from './resource-loader.js';

// Relationship Loader
export {
	loadHasMany,
	loadBelongsTo,
	loadHasOne,
	loadManyToMany,
	loadRelationship,
} from './relationship-loader.js';
export type { RelationshipLoaderContext } from './relationship-loader.js';
