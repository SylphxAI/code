/**
 * Code Generation
 *
 * Auto-generate CRUD APIs from resource definitions
 *
 * @example
 * ```typescript
 * import { generateResourceAPI } from '@sylphx/lens/codegen';
 *
 * const messageAPI = generateResourceAPI(Message.definition);
 *
 * // Use generated API
 * const message = await messageAPI.getById.query({ id: 'msg-1' }, {}, ctx);
 * const messages = await messageAPI.list.query({ where: { role: 'user' } }, {}, ctx);
 * const created = await messageAPI.create({ role: 'user', content: 'Hello' }, {}, ctx);
 * await messageAPI.update({ where: { id: 'msg-1' }, data: { content: 'Updated' } }, {}, ctx);
 * await messageAPI.delete({ id: 'msg-1' }, {}, ctx);
 * ```
 */

// API Generator
export { generateResourceAPI, generateAllAPIs } from './api-generator.js';

// Query Handlers
export { generateGetById, generateList } from './query-handlers.js';

// Mutation Handlers
export { generateCreate, generateUpdate, generateDelete } from './mutation-handlers.js';

// Types
export type {
	QueryHandler,
	MutationHandler,
	GeneratedResourceAPI,
	GeneratorContext,
} from './types.js';
