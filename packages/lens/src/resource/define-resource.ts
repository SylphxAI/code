/**
 * Resource Definition API
 *
 * ARCHITECTURE:
 * - Declarative resource definitions with full type inference
 * - Validates schema and relationships
 * - Registers in global registry
 * - Returns typed resource handle
 */

import type { ZodType } from 'zod';
import type {
	ResourceDefinition,
	Resource,
	Relationship,
	InferEntity,
} from './types.js';
import { ResourceRegistry } from './registry.js';
import { validateRelationship } from './relationships.js';

/**
 * Define a new resource with fields, relationships, and hooks
 *
 * @example
 * ```typescript
 * const Message = defineResource({
 *   name: 'message',
 *   fields: z.object({
 *     id: z.string(),
 *     role: z.enum(['user', 'assistant']),
 *   }),
 *   relationships: {
 *     steps: hasMany('step', { foreignKey: 'message_id' })
 *   }
 * });
 * ```
 */
export function defineResource<
	TName extends string,
	TFields extends ZodType,
	TRelationships extends Record<string, Relationship> = {},
>(
	definition: ResourceDefinition<TName, TFields, TRelationships>
): Resource<TName, TFields, TRelationships> {
	// Validate definition
	validateResourceDefinition(definition);

	// Register in global registry
	ResourceRegistry.register(definition);

	// Return typed resource handle
	return createResourceHandle(definition);
}

/**
 * Validate resource definition
 * @throws Error if definition is invalid
 */
function validateResourceDefinition(definition: ResourceDefinition): void {
	// Validate name
	if (!definition.name || definition.name.trim() === '') {
		throw new Error('Resource name cannot be empty');
	}

	// Validate name format (camelCase, no spaces)
	if (!/^[a-z][a-zA-Z0-9]*$/.test(definition.name)) {
		throw new Error(
			`Resource name "${definition.name}" must be camelCase (start with lowercase letter, no spaces)`
		);
	}

	// Validate fields schema exists
	if (!definition.fields) {
		throw new Error(`Resource "${definition.name}" missing fields schema`);
	}

	// Validate relationships
	if (definition.relationships) {
		for (const [relationshipName, relationship] of Object.entries(
			definition.relationships
		)) {
			validateRelationship(definition.name, relationshipName, relationship);
		}
	}

	// Validate computed fields
	if (definition.computed) {
		for (const [fieldName, fieldFn] of Object.entries(definition.computed)) {
			if (typeof fieldFn !== 'function') {
				throw new Error(
					`Resource "${definition.name}" computed field "${fieldName}" must be a function`
				);
			}
		}
	}

	// Validate hooks
	if (definition.hooks) {
		const validHooks = [
			'beforeCreate',
			'afterCreate',
			'beforeUpdate',
			'afterUpdate',
			'beforeDelete',
			'afterDelete',
		];

		for (const [hookName, hookFn] of Object.entries(definition.hooks)) {
			if (!validHooks.includes(hookName)) {
				throw new Error(
					`Resource "${definition.name}" has invalid hook "${hookName}". ` +
						`Valid hooks: ${validHooks.join(', ')}`
				);
			}

			if (typeof hookFn !== 'function') {
				throw new Error(
					`Resource "${definition.name}" hook "${hookName}" must be a function`
				);
			}
		}
	}

	// Validate table name (if provided)
	if (definition.tableName !== undefined) {
		if (typeof definition.tableName !== 'string' || definition.tableName.trim() === '') {
			throw new Error(
				`Resource "${definition.name}" has invalid tableName (must be non-empty string)`
			);
		}
	}
}

/**
 * Create typed resource handle
 * This is what users interact with after defining a resource
 */
function createResourceHandle<
	TName extends string,
	TFields extends ZodType,
	TRelationships extends Record<string, Relationship>,
>(
	definition: ResourceDefinition<TName, TFields, TRelationships>
): Resource<TName, TFields, TRelationships> {
	// Type inference helpers - these are used at compile time only
	// At runtime they're undefined, but TypeScript uses them for type checking
	const entity: InferEntity<ResourceDefinition<TName, TFields, TRelationships>> =
		undefined as any;

	return {
		definition,
		name: definition.name,
		entity,
		relationships: (definition.relationships || {}) as TRelationships,
	};
}
