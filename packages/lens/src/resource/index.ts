/**
 * Lens Resource System
 *
 * Public API exports for declarative resource definitions
 *
 * @example
 * ```typescript
 * import { defineResource, hasMany, belongsTo } from '@sylphx/lens/resource';
 * import { z } from 'zod';
 *
 * export const Message = defineResource({
 *   name: 'message',
 *   fields: z.object({
 *     id: z.string(),
 *     role: z.enum(['user', 'assistant']),
 *   }),
 *   relationships: {
 *     session: belongsTo('session', { foreignKey: 'session_id' }),
 *     steps: hasMany('step', { foreignKey: 'message_id' }),
 *   },
 * });
 * ```
 */

// Core API
export { defineResource } from './define-resource.js';

// Relationship helpers
export { hasMany, belongsTo, hasOne, manyToMany } from './relationships.js';

// Registry (for advanced use cases)
export { ResourceRegistry } from './registry.js';

// Types
export type {
	// Core types
	Resource,
	ResourceDefinition,
	InferEntity,
	InferRelationships,
	// Relationships
	Relationship,
	RelationshipType,
	HasManyRelationship,
	BelongsToRelationship,
	HasOneRelationship,
	ManyToManyRelationship,
	// Queries
	QueryOptions,
	ListOptions,
	SelectionSet,
	// Mutations
	MutationOptions,
	// Computed fields
	ComputedField,
	ComputedFieldContext,
	// Hooks
	ResourceHooks,
	// Loader
	ResourceLoader,
	// Context
	QueryContext,
	// Events
	EventStream,
	// API
	ResourceAPI,
	SubscriptionHandlers,
	Subscription,
} from './types.js';
