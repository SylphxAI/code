/**
 * Lens Server Setup
 *
 * Creates and configures the Lens server with:
 * - All entities
 * - All relations
 * - All queries and mutations
 * - Entity resolvers
 * - Context factory (database, event stream)
 *
 * Exports AppRouter type for client type inference.
 */

import { createApp } from "@sylphx/lens-server";
import { router } from "@sylphx/lens-core";
import { getSessionMessages } from "@sylphx/code-core";
import type { AppContext } from "../context.js";

// Schema
import * as entities from "./entities.js";
// Note: relations not yet supported by lens-server

// Operations
import * as queries from "./queries.js";
import * as mutations from "./mutations.js";

// =============================================================================
// Router Definition (TypeScript-first)
// =============================================================================

/**
 * App router combining all queries and mutations.
 * This creates a proper RouterDef type for client type inference.
 */
export const appRouter = router({
	// Queries
	...queries,
	// Mutations
	...mutations,
});

// Entity Resolvers Factory
import { createResolvers } from "./resolvers.js";

// Context Types
import type { LensDB, LensEventStream } from "./context.js";

// =============================================================================
// Database Adapter
// =============================================================================

/**
 * Create Lens database adapter from existing repositories
 *
 * Wraps SessionRepository and MessageRepository to provide
 * Prisma-like interface for Lens.
 */
function createDatabaseAdapter(appContext: AppContext): LensDB {
	const sessionRepo = appContext.database.getRepository();
	const messageRepo = appContext.database.getMessageRepository();
	const todoRepo = appContext.database.getTodoRepository();
	const db = appContext.database.getDB();

	return {
		session: {
			findUnique: async ({ where }) => {
				return sessionRepo.getSessionById(where.id);
			},
			findMany: async (args) => {
				if (args?.where?.id?.in) {
					// Batch fetch by IDs - use Promise.all for parallel fetch
					const sessions = await Promise.all(
						args.where.id.in.map((id: string) => sessionRepo.getSessionById(id))
					);
					return sessions.filter(Boolean);
				}
				// Use getRecentSessions for paginated list
				const limit = args?.take ?? 50;
				const offset = args?.skip ?? 0;
				return sessionRepo.getRecentSessions(limit, offset);
			},
			create: async ({ data }) => {
				await sessionRepo.createSessionFromData(data);
				return data;
			},
			update: async ({ where, data }) => {
				await sessionRepo.updateSession(where.id, data);
				return { ...data, id: where.id };
			},
			delete: async ({ where }) => {
				const session = await sessionRepo.getSessionById(where.id);
				await sessionRepo.deleteSession(where.id);
				return session;
			},
			count: async () => {
				return sessionRepo.getSessionCount();
			},
		},

		message: {
			findUnique: async ({ where }) => {
				// getSessionMessages returns all messages, filter by id
				// This is not ideal, but message-by-id lookup is rare
				return null; // Not directly supported
			},
			findMany: async (args) => {
				if (args?.where?.sessionId) {
					const sessionId = args.where.sessionId;
					// Use the proper function from code-core
					const messages = await getSessionMessages(db, sessionId);

					// Transform SessionMessage[] to include fields expected by Lens entities
					// SessionMessage doesn't include sessionId/ordering, but Lens Message entity needs them
					// Parts are kept as MessagePart objects (not wrapped in Part entity structure)
					// because client code expects direct access to part.type, part.content, etc.
					const transformedMessages = messages.map((msg, index) => ({
						...msg,
						sessionId,
						ordering: index,
						// Transform steps to include messageId
						steps: msg.steps?.map((step) => ({
							...step,
							messageId: msg.id,
							// Keep parts as MessagePart[] - no transformation needed
							// Client uses part.type and part.content directly
						})),
					}));

					// Apply limit if specified
					if (args?.take) {
						return transformedMessages.slice(0, args.take);
					}
					return transformedMessages;
				}
				return [];
			},
			create: async ({ data }) => {
				await messageRepo.addMessage(data);
				return data;
			},
			update: async ({ where, data }) => {
				// Update message status if provided
				if (data.status) {
					await messageRepo.updateMessageStatus(where.id, data.status as any);
				}
				return { ...data, id: where.id };
			},
			delete: async ({ where }) => {
				// Message deletion not directly supported
				return { id: where.id };
			},
		},

		step: {
			findUnique: async ({ where }) => {
				return null; // Not directly supported
			},
			findMany: async (args) => {
				// Steps are loaded as part of messages via getSessionMessages
				return [];
			},
			create: async ({ data }) => {
				return data;
			},
			update: async ({ where, data }) => {
				return { ...data, id: where.id };
			},
		},

		part: {
			findUnique: async ({ where }) => {
				return null; // Not directly supported
			},
			findMany: async (args) => {
				// Parts are loaded as part of steps via getSessionMessages
				return [];
			},
			create: async ({ data }) => {
				return data;
			},
			update: async ({ where, data }) => {
				return { ...data, id: where.id };
			},
		},

		todo: {
			findMany: async (args) => {
				if (args?.where?.sessionId) {
					return todoRepo.getTodosBySessionId(args.where.sessionId);
				}
				return [];
			},
			create: async ({ data }) => {
				await todoRepo.createTodo(data.sessionId, data);
				return data;
			},
			update: async ({ where, data }) => {
				await todoRepo.updateTodo(where.sessionId, where.id, data);
				return { ...data, ...where };
			},
			delete: async ({ where }) => {
				await todoRepo.deleteTodo(where.sessionId, where.id);
				return where;
			},
		},
	};
}

/**
 * Create event stream adapter
 *
 * Wraps AppEventStream to provide async iterable interface.
 */
function createEventStreamAdapter(appContext: AppContext): LensEventStream {
	// Helper to convert Observable to AsyncIterable
	function observableToAsyncIterable<T>(observable: import("rxjs").Observable<T>): AsyncIterable<T> {
		return {
			[Symbol.asyncIterator]: () => {
				const queue: T[] = [];
				let resolve: ((value: IteratorResult<T>) => void) | null = null;
				let done = false;

				const subscription = observable.subscribe({
					next: (value) => {
						if (resolve) {
							resolve({ value, done: false });
							resolve = null;
						} else {
							queue.push(value);
						}
					},
					error: () => {
						done = true;
						if (resolve) {
							resolve({ value: undefined as any, done: true });
						}
					},
					complete: () => {
						done = true;
						if (resolve) {
							resolve({ value: undefined as any, done: true });
						}
					},
				});

				return {
					next: () => {
						if (queue.length > 0) {
							return Promise.resolve({ value: queue.shift()!, done: false });
						}
						if (done) {
							return Promise.resolve({ value: undefined as any, done: true });
						}
						return new Promise<IteratorResult<T>>((res) => {
							resolve = res;
						});
					},
					return: () => {
						subscription.unsubscribe();
						done = true;
						return Promise.resolve({ value: undefined as any, done: true });
					},
				};
			},
		};
	}

	return {
		publish: async (channel, event) => {
			await appContext.eventStream.publish(channel, event);
		},
		subscribe: (channel) => {
			const observable = appContext.eventStream.subscribe(channel);
			return observableToAsyncIterable(observable);
		},
		subscribeWithHistory: (channel, lastN) => {
			const observable = appContext.eventStream.subscribeWithHistory(channel, lastN);
			return observableToAsyncIterable(observable);
		},
	};
}

// =============================================================================
// Server Factory
// =============================================================================

/**
 * Create Lens server instance
 *
 * @param appContext - Application context with database and event stream
 * @returns Configured Lens server
 */
export function createLensServer(appContext: AppContext) {
	const db = createDatabaseAdapter(appContext);
	const eventStream = createEventStreamAdapter(appContext);

	// Create resolvers with db closure
	const resolvers = createResolvers(db);

	const app = createApp({
		entities,
		queries,
		mutations,
		resolvers,
		context: async () => {
			// Context factory - called for each request
			return {
				db,
				eventStream,
				appContext,
			};
		},
	});

	return app;
}

/**
 * Export router type for client type inference
 *
 * Usage on client:
 * ```typescript
 * import type { AppRouter } from '@sylphx/code-server'
 *
 * const client = createClient<AppRouter>({
 *   transport: http({ url: '/api/lens' }),
 * })
 * ```
 */
export type AppRouter = typeof appRouter;

// =============================================================================
// Index Export
// =============================================================================

// Re-export context types
export type { LensContext, LensDB, LensEventStream } from "./context.js";

// Re-export entities for type inference
export * from "./entities.js";
