/**
 * Core type definitions for Lens resource system
 *
 * ARCHITECTURE:
 * - Type-safe resource definitions
 * - Full TypeScript inference
 * - Compile-time validation
 */

import type { ZodType, z } from 'zod';
import type { Observable } from 'rxjs';

/**
 * Relationship types
 */
export type RelationshipType = 'hasMany' | 'belongsTo' | 'hasOne' | 'manyToMany';

/**
 * Base relationship interface
 */
export interface BaseRelationship {
	type: RelationshipType;
	target: string; // Target resource name
}

/**
 * Has many relationship (1:N)
 * Example: Message hasMany Steps
 */
export interface HasManyRelationship extends BaseRelationship {
	type: 'hasMany';
	foreignKey: string; // Foreign key in target table (e.g., 'message_id')
	orderBy?: Record<string, 'asc' | 'desc'>; // Optional ordering
	through?: string; // For many-to-many via junction table
}

/**
 * Belongs to relationship (N:1)
 * Example: Step belongsTo Message
 */
export interface BelongsToRelationship extends BaseRelationship {
	type: 'belongsTo';
	foreignKey: string; // Foreign key in current table
}

/**
 * Has one relationship (1:1)
 * Example: User hasOne Profile
 */
export interface HasOneRelationship extends BaseRelationship {
	type: 'hasOne';
	foreignKey: string; // Foreign key in target table
}

/**
 * Many to many relationship (N:M)
 * Example: User manyToMany Roles
 */
export interface ManyToManyRelationship extends BaseRelationship {
	type: 'manyToMany';
	through: string; // Junction table name
	foreignKey: string; // Foreign key for this resource
	targetForeignKey: string; // Foreign key for target resource
}

/**
 * Union of all relationship types
 */
export type Relationship =
	| HasManyRelationship
	| BelongsToRelationship
	| HasOneRelationship
	| ManyToManyRelationship;

/**
 * Computed field function
 */
export type ComputedField<T = any, TResult = any> = (
	entity: T,
	context: ComputedFieldContext
) => Promise<TResult> | TResult;

/**
 * Context available to computed fields
 */
export interface ComputedFieldContext {
	loader: ResourceLoader;
	db: any; // Database instance
}

/**
 * Resource hooks for lifecycle events
 */
export interface ResourceHooks<T = any> {
	beforeCreate?: (data: Partial<T>) => Promise<Partial<T>> | Partial<T>;
	afterCreate?: (entity: T) => Promise<void> | void;
	beforeUpdate?: (id: string, data: Partial<T>) => Promise<Partial<T>> | Partial<T>;
	afterUpdate?: (entity: T) => Promise<void> | void;
	beforeDelete?: (id: string) => Promise<void> | void;
	afterDelete?: (id: string) => Promise<void> | void;
}

/**
 * Resource definition
 */
export interface ResourceDefinition<
	TName extends string = string,
	TFields extends ZodType = ZodType,
	TRelationships extends Record<string, Relationship> = Record<string, Relationship>
> {
	/** Resource name (singular, camelCase) */
	name: TName;

	/** Zod schema for resource fields */
	fields: TFields;

	/** Relationships to other resources */
	relationships?: TRelationships;

	/** Computed fields (virtual fields) */
	computed?: Record<string, ComputedField>;

	/** Lifecycle hooks */
	hooks?: ResourceHooks<z.infer<TFields>>;

	/** Database table name (defaults to pluralized name) */
	tableName?: string;
}

/**
 * Infer entity type from resource definition
 */
export type InferEntity<T extends ResourceDefinition> = T extends ResourceDefinition<
	any,
	infer TFields,
	any
>
	? z.infer<TFields>
	: never;

/**
 * Infer relationships from resource definition
 */
export type InferRelationships<T extends ResourceDefinition> =
	T extends ResourceDefinition<any, any, infer TRelationships> ? TRelationships : never;

/**
 * Selection set for queries
 * Allows selecting specific fields and nested relationships
 */
export type SelectionSet<T = any> = {
	[K in keyof T]?: T[K] extends object
		? boolean | { select: SelectionSet<T[K]> }
		: boolean;
};

/**
 * Query options
 */
export interface QueryOptions<T = any> {
	select?: SelectionSet<T>;
	include?: Record<string, boolean | QueryOptions>;
}

/**
 * List query options
 */
export interface ListOptions<T = any> extends QueryOptions<T> {
	where?: Partial<T>;
	orderBy?: Record<keyof T, 'asc' | 'desc'>;
	limit?: number;
	offset?: number;
	cursor?: string;
}

/**
 * Mutation options
 */
export interface MutationOptions {
	skipHooks?: boolean;
}

/**
 * Resource loader interface
 * Used for batching and caching queries
 */
export interface ResourceLoader {
	load<T>(resourceName: string, id: string): Promise<T | null>;
	loadMany<T>(resourceName: string, ids: string[]): Promise<(T | null)[]>;
	loadByField<T>(
		resourceName: string,
		field: string,
		values: any[]
	): Promise<Map<any, T[]>>;
	prime<T>(resourceName: string, id: string, value: T): void;
	clear(resourceName: string, id?: string): void;
}

/**
 * Query context
 * Available to all query handlers
 */
export interface QueryContext {
	loader: ResourceLoader;
	db: any;
	eventStream: EventStream;
	userId?: string;
	requestId: string;
}

/**
 * Event stream interface
 */
export interface EventStream {
	publish(channel: string, event: any): Promise<void>;
	subscribe(channel: string): Observable<any>;
}

/**
 * Resource instance
 * Returned by defineResource()
 */
export interface Resource<
	TName extends string = string,
	TFields extends ZodType = ZodType,
	TRelationships extends Record<string, Relationship> = Record<string, Relationship>
> {
	/** Resource definition */
	definition: ResourceDefinition<TName, TFields, TRelationships>;

	/** Resource name */
	name: TName;

	/** Entity type */
	entity: InferEntity<ResourceDefinition<TName, TFields, TRelationships>>;

	/** Relationships */
	relationships: TRelationships;
}

/**
 * Resource API interface
 * Auto-generated CRUD + subscriptions
 */
export interface ResourceAPI<T = any> {
	// Queries
	getById: {
		query: (input: { id: string }, options?: QueryOptions<T>) => Promise<T | null>;
		subscribe: (
			input: { id: string },
			options: QueryOptions<T>,
			handlers: SubscriptionHandlers<T>
		) => Subscription;
	};

	list: {
		query: (options?: ListOptions<T>) => Promise<T[]>;
		subscribe: (
			options: ListOptions<T>,
			handlers: SubscriptionHandlers<T[]>
		) => Subscription;
	};

	// Mutations
	create: (data: Partial<T>, options?: MutationOptions) => Promise<T>;
	update: (
		where: { id: string },
		data: Partial<T>,
		options?: MutationOptions
	) => Promise<T>;
	delete: (where: { id: string }, options?: MutationOptions) => Promise<void>;
}

/**
 * Subscription handlers
 */
export interface SubscriptionHandlers<T> {
	onData?: (data: T) => void;
	onError?: (error: Error) => void;
	onComplete?: () => void;
}

/**
 * Subscription
 */
export interface Subscription {
	unsubscribe: () => void;
}
