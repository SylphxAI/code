/**
 * Query Handler Generator
 *
 * ARCHITECTURE:
 * - Generates getById and list query handlers
 * - Integrates with DataLoader for batching
 * - Type-safe query execution
 */

import type { ResourceDefinition, QueryContext, QueryOptions, ListOptions } from '../resource/types.js';
import type { QueryHandler } from './types.js';

/**
 * Generate getById query handler
 *
 * @example
 * ```typescript
 * const handler = generateGetById(messageResource);
 * const message = await handler.query({ id: 'msg-1' }, {}, ctx);
 * ```
 */
export function generateGetById<T extends ResourceDefinition>(
	resource: T
): QueryHandler<{ id: string }, any> {
	return {
		query: async (input, options, ctx) => {
			// Use loader for automatic batching and caching
			const entity = await ctx.loader.load(resource.name, input.id);

			if (!entity) {
				return null;
			}

			// Handle field selection (if specified)
			if (options.select) {
				return applySelection(entity, options.select);
			}

			// Handle relationship inclusion
			if (options.include) {
				return await loadRelationships(entity, options.include, resource, ctx);
			}

			return entity;
		},

		// Subscription handler
		subscribe: (input, options, handlers, ctx) => {
			// Import at runtime to avoid circular dependencies
			const { SubscriptionManager } = require('../subscription/manager.js');
			const manager = new SubscriptionManager();

			// Create subscription
			manager
				.subscribeToResource(resource, input.id, options, ctx)
				.then((observable) => {
					const subscription = observable.subscribe({
						next: (data) => {
							if (handlers.onData) handlers.onData(data);
						},
						error: (error) => {
							if (handlers.onError) handlers.onError(error);
						},
						complete: () => {
							if (handlers.onComplete) handlers.onComplete();
						},
					});

					// Store for cleanup
					(ctx as any)._subscription = subscription;
				})
				.catch((error) => {
					if (handlers.onError) handlers.onError(error);
				});

			return {
				unsubscribe: () => {
					if ((ctx as any)._subscription) {
						(ctx as any)._subscription.unsubscribe();
					}
				},
			};
		},
	};
}

/**
 * Generate list query handler
 *
 * @example
 * ```typescript
 * const handler = generateList(messageResource);
 * const messages = await handler.query({ where: { role: 'user' } }, ctx);
 * ```
 */
export function generateList<T extends ResourceDefinition>(
	resource: T
): QueryHandler<ListOptions<any>, any[]> {
	return {
		query: async (options, _queryOpts, ctx) => {
			// PLACEHOLDER: Full DB integration pending
			console.warn(
				`[CodeGen] List query for ${resource.name} - Full DB integration pending`
			);

			// In full implementation:
			// const results = await ctx.db.query[resource.tableName || resource.name].findMany({
			//   where: options.where,
			//   orderBy: options.orderBy,
			//   limit: options.limit,
			//   offset: options.offset,
			// });

			// Prime loader cache with results
			// for (const result of results) {
			//   ctx.loader.prime(resource.name, result.id, result);
			// }

			// return results;

			return [];
		},

		// Subscription handler
		subscribe: (input, options, handlers, ctx) => {
			// Import at runtime to avoid circular dependencies
			const { SubscriptionManager } = require('../subscription/manager.js');
			const manager = new SubscriptionManager();

			// Create subscription
			manager
				.subscribeToList(resource, { ...input, ...options }, ctx)
				.then((observable) => {
					const subscription = observable.subscribe({
						next: (data) => {
							if (handlers.onData) handlers.onData(data);
						},
						error: (error) => {
							if (handlers.onError) handlers.onError(error);
						},
						complete: () => {
							if (handlers.onComplete) handlers.onComplete();
						},
					});

					// Store for cleanup
					(ctx as any)._subscription = subscription;
				})
				.catch((error) => {
					if (handlers.onError) handlers.onError(error);
				});

			return {
				unsubscribe: () => {
					if ((ctx as any)._subscription) {
						(ctx as any)._subscription.unsubscribe();
					}
				},
			};
		},
	};
}

/**
 * Apply field selection to entity
 * Returns only selected fields
 */
function applySelection<T>(entity: T, selection: Record<string, any>): Partial<T> {
	const result: any = {};

	for (const [key, value] of Object.entries(selection)) {
		if (value === true && key in (entity as any)) {
			result[key] = (entity as any)[key];
		} else if (typeof value === 'object' && value.select) {
			// Nested selection
			if ((entity as any)[key]) {
				result[key] = applySelection((entity as any)[key], value.select);
			}
		}
	}

	return result;
}

/**
 * Load relationships for entity
 * Uses loader for automatic batching
 */
async function loadRelationships<T>(
	entity: T,
	include: Record<string, boolean | QueryOptions>,
	resource: ResourceDefinition,
	ctx: QueryContext
): Promise<T> {
	const result = { ...entity };

	for (const [relationshipName, includeOptions] of Object.entries(include)) {
		const relationship = resource.relationships?.[relationshipName];

		if (!relationship) {
			console.warn(
				`[CodeGen] Unknown relationship "${relationshipName}" on ${resource.name}`
			);
			continue;
		}

		// PLACEHOLDER: Full relationship loading in Phase 5
		console.warn(
			`[CodeGen] Loading relationship ${resource.name}.${relationshipName} - Integration pending`
		);

		// In full implementation:
		// if (relationship.type === 'hasMany') {
		//   const related = await ctx.loader.loadByField(
		//     relationship.target,
		//     relationship.foreignKey,
		//     [(entity as any).id]
		//   );
		//   (result as any)[relationshipName] = related.get((entity as any).id) || [];
		// } else if (relationship.type === 'belongsTo') {
		//   const foreignId = (entity as any)[relationship.foreignKey];
		//   if (foreignId) {
		//     (result as any)[relationshipName] = await ctx.loader.load(
		//       relationship.target,
		//       foreignId
		//     );
		//   }
		// }

		(result as any)[relationshipName] = null;
	}

	return result;
}
