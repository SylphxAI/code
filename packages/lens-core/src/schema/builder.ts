/**
 * Schema builder - The core API for defining Lens APIs
 *
 * Usage:
 * ```ts
 * import { lens } from '@sylphx/lens-core';
 * import { z } from 'zod';
 *
 * export const user = lens.object({
 *   get: lens.query({
 *     input: z.object({ id: z.string() }),
 *     output: UserSchema,
 *     resolve: async ({ id }) => db.users.findOne({ id })
 *   }),
 *   update: lens.mutation({
 *     input: z.object({ id: z.string(), data: UserUpdateSchema }),
 *     output: UserSchema,
 *     resolve: async ({ id, data }) => db.users.update({ id }, data)
 *   })
 * });
 * ```
 */

import type { Observable } from "rxjs";
import type { z } from "zod";
import type {
	LensQuery,
	LensMutation,
	LensObject,
} from "./types.js";

/**
 * Query builder configuration
 */
export interface QueryConfig<TInput, TOutput, TContext = any> {
	input: z.ZodType<TInput>;
	output: z.ZodType<TOutput>;
	resolve: (input: TInput, ctx: TContext) => Promise<TOutput>;
	subscribe?: (input: TInput, ctx: TContext) => Observable<TOutput>;
}

/**
 * Mutation builder configuration
 */
export interface MutationConfig<TInput, TOutput, TContext = any> {
	input: z.ZodType<TInput>;
	output: z.ZodType<TOutput>;
	resolve: (input: TInput, ctx: TContext) => Promise<TOutput>;
}

/**
 * Schema builder class
 */
class LensBuilder {
	/**
	 * Define a query operation
	 *
	 * @example
	 * ```ts
	 * const getUser = lens.query({
	 *   input: z.object({ id: z.string() }),
	 *   output: UserSchema,
	 *   resolve: async ({ id }, ctx) => ctx.db.users.findOne({ id }),
	 *   subscribe: ({ id }, ctx) => ctx.eventStream.subscribe(`user:${id}`)
	 * });
	 * ```
	 */
	query<TInput, TOutput, TContext = any>(
		config: QueryConfig<TInput, TOutput, TContext>
	): LensQuery<TInput, TOutput> {
		return {
			type: "query" as const,
			path: [],
			input: config.input,
			output: config.output,
			resolve: config.resolve as any,
			subscribe: config.subscribe as any,
		};
	}

	/**
	 * Define a mutation operation
	 *
	 * @example
	 * ```ts
	 * const updateUser = lens.mutation({
	 *   input: z.object({ id: z.string(), data: UpdateSchema }),
	 *   output: UserSchema,
	 *   resolve: async ({ id, data }, ctx) => ctx.db.users.update({ id }, data)
	 * });
	 * ```
	 */
	mutation<TInput, TOutput, TContext = any>(
		config: MutationConfig<TInput, TOutput, TContext>
	): LensMutation<TInput, TOutput> {
		return {
			type: "mutation" as const,
			path: [],
			input: config.input,
			output: config.output,
			resolve: config.resolve as any,
		};
	}

	/**
	 * Group queries and mutations into an object
	 *
	 * @example
	 * ```ts
	 * const api = lens.object({
	 *   user: lens.object({
	 *     get: lens.query({ ... }),
	 *     update: lens.mutation({ ... })
	 *   }),
	 *   post: lens.object({
	 *     get: lens.query({ ... }),
	 *     create: lens.mutation({ ... })
	 *   })
	 * });
	 * ```
	 */
	object<T extends Record<string, any>>(obj: T): LensObject<T> {
		// Set paths for nested queries/mutations
		const setPath = (obj: any, path: string[]): any => {
			if (obj.type === "query" || obj.type === "mutation") {
				obj.path = path;
				return obj;
			}

			if (typeof obj === "object" && obj !== null) {
				const result: any = {};
				for (const [key, value] of Object.entries(obj)) {
					result[key] = setPath(value, [...path, key]);
				}
				return result;
			}

			return obj;
		};

		return setPath(obj, []) as LensObject<T>;
	}
}

/**
 * Singleton builder instance
 */
export const lens = new LensBuilder();
