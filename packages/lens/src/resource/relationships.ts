/**
 * Relationship helper functions
 *
 * ARCHITECTURE:
 * - Type-safe relationship definitions
 * - Declarative API
 * - Compile-time validation
 */

import type {
	HasManyRelationship,
	BelongsToRelationship,
	HasOneRelationship,
	ManyToManyRelationship,
} from './types.js';

/**
 * Define a has-many relationship (1:N)
 *
 * @example
 * ```typescript
 * const Message = defineResource({
 *   name: 'message',
 *   relationships: {
 *     steps: hasMany('step', {
 *       foreignKey: 'message_id',
 *       orderBy: { stepIndex: 'asc' }
 *     })
 *   }
 * });
 * ```
 */
export function hasMany<TTarget extends string>(
	targetResource: TTarget,
	options: {
		/** Foreign key in target table */
		foreignKey: string;
		/** Optional ordering */
		orderBy?: Record<string, 'asc' | 'desc'>;
		/** For many-to-many via junction table */
		through?: string;
	}
): HasManyRelationship {
	return {
		type: 'hasMany',
		target: targetResource,
		foreignKey: options.foreignKey,
		orderBy: options.orderBy,
		through: options.through,
	};
}

/**
 * Define a belongs-to relationship (N:1)
 *
 * @example
 * ```typescript
 * const Step = defineResource({
 *   name: 'step',
 *   relationships: {
 *     message: belongsTo('message', {
 *       foreignKey: 'message_id'
 *     })
 *   }
 * });
 * ```
 */
export function belongsTo<TTarget extends string>(
	targetResource: TTarget,
	options: {
		/** Foreign key in current table */
		foreignKey: string;
	}
): BelongsToRelationship {
	return {
		type: 'belongsTo',
		target: targetResource,
		foreignKey: options.foreignKey,
	};
}

/**
 * Define a has-one relationship (1:1)
 *
 * @example
 * ```typescript
 * const User = defineResource({
 *   name: 'user',
 *   relationships: {
 *     profile: hasOne('profile', {
 *       foreignKey: 'user_id'
 *     })
 *   }
 * });
 * ```
 */
export function hasOne<TTarget extends string>(
	targetResource: TTarget,
	options: {
		/** Foreign key in target table */
		foreignKey: string;
	}
): HasOneRelationship {
	return {
		type: 'hasOne',
		target: targetResource,
		foreignKey: options.foreignKey,
	};
}

/**
 * Define a many-to-many relationship (N:M)
 *
 * @example
 * ```typescript
 * const User = defineResource({
 *   name: 'user',
 *   relationships: {
 *     roles: manyToMany('role', {
 *       through: 'user_roles',
 *       foreignKey: 'user_id',
 *       targetForeignKey: 'role_id'
 *     })
 *   }
 * });
 * ```
 */
export function manyToMany<TTarget extends string>(
	targetResource: TTarget,
	options: {
		/** Junction table name */
		through: string;
		/** Foreign key for this resource in junction table */
		foreignKey: string;
		/** Foreign key for target resource in junction table */
		targetForeignKey: string;
	}
): ManyToManyRelationship {
	return {
		type: 'manyToMany',
		target: targetResource,
		through: options.through,
		foreignKey: options.foreignKey,
		targetForeignKey: options.targetForeignKey,
	};
}

/**
 * Validate relationship definition
 * Called by registry when resource is registered
 */
export function validateRelationship(
	resourceName: string,
	relationshipName: string,
	relationship: HasManyRelationship | BelongsToRelationship | HasOneRelationship | ManyToManyRelationship
): void {
	// Validate foreign key is provided
	if (!relationship.foreignKey) {
		throw new Error(
			`Resource "${resourceName}" relationship "${relationshipName}" missing foreignKey`
		);
	}

	// Validate many-to-many has junction table
	if (relationship.type === 'manyToMany') {
		if (!relationship.through) {
			throw new Error(
				`Resource "${resourceName}" relationship "${relationshipName}" is many-to-many but missing "through" table`
			);
		}
		if (!relationship.targetForeignKey) {
			throw new Error(
				`Resource "${resourceName}" relationship "${relationshipName}" is many-to-many but missing "targetForeignKey"`
			);
		}
	}

	// Validate target resource name is not empty
	if (!relationship.target || relationship.target.trim() === '') {
		throw new Error(
			`Resource "${resourceName}" relationship "${relationshipName}" has invalid target resource name`
		);
	}
}
