/**
 * Code generation types
 *
 * ARCHITECTURE:
 * - Type-safe code generation
 * - Compile-time validation
 * - Full TypeScript inference
 */

import type { ZodType, z } from 'zod';
import type {
	ResourceDefinition,
	QueryContext,
	QueryOptions,
	ListOptions,
	MutationOptions,
	SubscriptionHandlers,
	Subscription,
	InferEntity,
} from '../resource/types.js';

/**
 * Generated query handler
 * Handles both query execution and subscription
 */
export interface QueryHandler<TInput, TOutput> {
	/** Execute query */
	query: (input: TInput, options: QueryOptions, ctx: QueryContext) => Promise<TOutput>;

	/** Subscribe to query results (implemented in Phase 5) */
	subscribe?: (
		input: TInput,
		options: QueryOptions,
		handlers: SubscriptionHandlers<TOutput>,
		ctx: QueryContext
	) => Subscription;
}

/**
 * Generated mutation handler
 */
export type MutationHandler<TInput, TOutput> = (
	input: TInput,
	options: MutationOptions,
	ctx: QueryContext
) => Promise<TOutput>;

/**
 * Generated resource API
 * Complete CRUD + subscription API for a resource
 */
export interface GeneratedResourceAPI<T extends ResourceDefinition> {
	/** Get single entity by ID */
	getById: QueryHandler<{ id: string }, InferEntity<T> | null>;

	/** List entities with filters */
	list: QueryHandler<ListOptions<InferEntity<T>>, InferEntity<T>[]>;

	/** Create new entity */
	create: MutationHandler<Partial<InferEntity<T>>, InferEntity<T>>;

	/** Update existing entity */
	update: MutationHandler<
		{ where: { id: string }; data: Partial<InferEntity<T>> },
		InferEntity<T>
	>;

	/** Delete entity */
	delete: MutationHandler<{ id: string }, void>;
}

/**
 * Generator context
 * Information available during code generation
 */
export interface GeneratorContext {
	/** Resource being generated */
	resource: ResourceDefinition;

	/** Generation timestamp */
	timestamp: Date;
}
