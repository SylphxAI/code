/**
 * Mutation Handler Generator
 *
 * ARCHITECTURE:
 * - Generates create, update, delete mutation handlers
 * - Validates input with Zod schemas
 * - Executes lifecycle hooks
 * - Publishes events to event stream
 */

import type {
	ResourceDefinition,
	QueryContext,
	MutationOptions,
	InferEntity,
} from '../resource/types.js';
import type { MutationHandler } from './types.js';

/**
 * Generate create mutation handler
 *
 * @example
 * ```typescript
 * const handler = generateCreate(messageResource);
 * const message = await handler({ role: 'user', content: 'Hello' }, {}, ctx);
 * ```
 */
export function generateCreate<T extends ResourceDefinition>(
	resource: T
): MutationHandler<Partial<InferEntity<T>>, InferEntity<T>> {
	return async (input, options, ctx) => {
		// Validate input
		let data = { ...input };

		// Execute beforeCreate hook
		if (resource.hooks?.beforeCreate && !options.skipHooks) {
			data = await resource.hooks.beforeCreate(data);
		}

		// Validate with schema
		const validated = resource.fields.parse(data);

		// PLACEHOLDER: Full DB integration pending
		console.warn(
			`[CodeGen] Create mutation for ${resource.name} - Full DB integration pending`
		);

		// In full implementation:
		// const created = await ctx.db.query[resource.tableName || resource.name].create({
		//   data: validated,
		// });

		// Use provided ID or generate one
	const created = {
		...validated,
		id: (validated as any).id || `${resource.name}-${Date.now()}`,
	} as InferEntity<T>;

		// Prime loader cache
		ctx.loader.prime(resource.name, created.id, created);

		// Execute afterCreate hook
		if (resource.hooks?.afterCreate && !options.skipHooks) {
			await resource.hooks.afterCreate(created);
		}

		// Publish event
		await ctx.eventStream.publish(`resource:${resource.name}:created`, {
			type: 'resource:created',
			resource: resource.name,
			entity: created,
		});

		return created;
	};
}

/**
 * Generate update mutation handler
 *
 * @example
 * ```typescript
 * const handler = generateUpdate(messageResource);
 * const message = await handler({
 *   where: { id: 'msg-1' },
 *   data: { content: 'Updated' }
 * }, {}, ctx);
 * ```
 */
export function generateUpdate<T extends ResourceDefinition>(
	resource: T
): MutationHandler<
	{ where: { id: string }; data: Partial<InferEntity<T>> },
	InferEntity<T>
> {
	return async (input, options, ctx) => {
		const { where, data: updateData } = input;

		// Execute beforeUpdate hook
		let data = { ...updateData };
		if (resource.hooks?.beforeUpdate && !options.skipHooks) {
			data = await resource.hooks.beforeUpdate(where.id, data);
		}

		// Validate with schema (partial)
		const validated = resource.fields.partial().parse(data);

		// PLACEHOLDER: Full DB integration pending
		console.warn(
			`[CodeGen] Update mutation for ${resource.name} - Full DB integration pending`
		);

		// In full implementation:
		// const updated = await ctx.db.query[resource.tableName || resource.name].update({
		//   where: { id: where.id },
		//   data: validated,
		// });

		// Get current entity
		const current = await ctx.loader.load(resource.name, where.id);
		const updated = { ...current, ...validated } as InferEntity<T>;

		// Clear cache
		ctx.loader.clear(resource.name, where.id);

		// Prime with new value
		ctx.loader.prime(resource.name, where.id, updated);

		// Execute afterUpdate hook
		if (resource.hooks?.afterUpdate && !options.skipHooks) {
			await resource.hooks.afterUpdate(updated);
		}

		// Publish event
		await ctx.eventStream.publish(`resource:${resource.name}:${where.id}:updated`, {
			type: 'resource:updated',
			resource: resource.name,
			id: where.id,
			changes: validated,
			entity: updated,
		});

		return updated;
	};
}

/**
 * Generate delete mutation handler
 *
 * @example
 * ```typescript
 * const handler = generateDelete(messageResource);
 * await handler({ id: 'msg-1' }, {}, ctx);
 * ```
 */
export function generateDelete<T extends ResourceDefinition>(
	resource: T
): MutationHandler<{ id: string }, void> {
	return async (input, options, ctx) => {
		const { id } = input;

		// Execute beforeDelete hook
		if (resource.hooks?.beforeDelete && !options.skipHooks) {
			await resource.hooks.beforeDelete(id);
		}

		// PLACEHOLDER: Full DB integration pending
		console.warn(
			`[CodeGen] Delete mutation for ${resource.name} - Full DB integration pending`
		);

		// In full implementation:
		// await ctx.db.query[resource.tableName || resource.name].delete({
		//   where: { id },
		// });

		// Clear from cache
		ctx.loader.clear(resource.name, id);

		// Execute afterDelete hook
		if (resource.hooks?.afterDelete && !options.skipHooks) {
			await resource.hooks.afterDelete(id);
		}

		// Publish event
		await ctx.eventStream.publish(`resource:${resource.name}:${id}:deleted`, {
			type: 'resource:deleted',
			resource: resource.name,
			id,
		});
	};
}
