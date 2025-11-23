/**
 * API Generator
 *
 * ARCHITECTURE:
 * - Generates complete CRUD API from resource definition
 * - Type-safe query and mutation handlers
 * - Automatic batching via DataLoader
 * - Event publishing for subscriptions
 */

import type { ResourceDefinition } from '../resource/types.js';
import type { GeneratedResourceAPI } from './types.js';
import { generateGetById, generateList } from './query-handlers.js';
import { generateCreate, generateUpdate, generateDelete } from './mutation-handlers.js';

/**
 * Generate complete resource API
 *
 * Creates type-safe CRUD + subscription API from resource definition
 *
 * @example
 * ```typescript
 * const Message = defineResource({
 *   name: 'message',
 *   fields: z.object({ id: z.string(), role: z.enum(['user', 'assistant']) }),
 *   relationships: { steps: hasMany('step', { foreignKey: 'message_id' }) }
 * });
 *
 * const messageAPI = generateResourceAPI(Message.definition);
 *
 * // Use generated API
 * const message = await messageAPI.getById.query({ id: 'msg-1' }, {}, ctx);
 * const messages = await messageAPI.list.query({}, {}, ctx);
 * const created = await messageAPI.create({ role: 'user' }, {}, ctx);
 * ```
 */
export function generateResourceAPI<T extends ResourceDefinition>(
	resource: T
): GeneratedResourceAPI<T> {
	return {
		// Query APIs
		getById: generateGetById(resource),
		list: generateList(resource),

		// Mutation APIs
		create: generateCreate(resource),
		update: generateUpdate(resource),
		delete: generateDelete(resource),
	};
}

/**
 * Generate APIs for multiple resources
 *
 * @example
 * ```typescript
 * const apis = generateAllAPIs([Message, Step, Session]);
 * const messageAPI = apis.message;
 * ```
 */
export function generateAllAPIs<T extends ResourceDefinition>(
	resources: T[]
): Record<string, GeneratedResourceAPI<T>> {
	const apis: Record<string, GeneratedResourceAPI<T>> = {};

	for (const resource of resources) {
		apis[resource.name] = generateResourceAPI(resource);
	}

	return apis;
}
