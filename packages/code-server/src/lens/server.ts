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

import { createServer } from "@lens/server";
import type { AppContext } from "../context.js";

// Schema
import * as entities from "./entities.js";
import { relations } from "./relations.js";

// Operations
import * as queries from "./queries.js";
import * as mutations from "./mutations.js";

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

	return {
		session: {
			findUnique: async ({ where }) => {
				return sessionRepo.getSessionById(where.id);
			},
			findMany: async (args) => {
				if (args?.where?.id?.in) {
					// Batch fetch by IDs
					return sessionRepo.getSessionsByIds(args.where.id.in);
				}
				// List all
				const sessions = await sessionRepo.getAllSessions();
				// Apply ordering and limit
				if (args?.orderBy?.updatedAt === "desc") {
					sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
				}
				if (args?.take) {
					return sessions.slice(0, args.take);
				}
				return sessions;
			},
			create: async ({ data }) => {
				await sessionRepo.createSession(data);
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
				const sessions = await sessionRepo.getAllSessions();
				return sessions.length;
			},
		},

		message: {
			findUnique: async ({ where }) => {
				return messageRepo.getMessageById(where.id);
			},
			findMany: async (args) => {
				if (args?.where?.sessionId) {
					return messageRepo.getMessagesBySessionId(args.where.sessionId);
				}
				if (args?.where?.id?.in) {
					return messageRepo.getMessagesByIds(args.where.id.in);
				}
				return [];
			},
			create: async ({ data }) => {
				await messageRepo.createMessage(data);
				return data;
			},
			update: async ({ where, data }) => {
				await messageRepo.updateMessage(where.id, data);
				return { ...data, id: where.id };
			},
			delete: async ({ where }) => {
				await messageRepo.deleteMessage(where.id);
				return { id: where.id };
			},
		},

		step: {
			findUnique: async ({ where }) => {
				return messageRepo.getStepById(where.id);
			},
			findMany: async (args) => {
				if (args?.where?.messageId) {
					return messageRepo.getStepsByMessageId(args.where.messageId);
				}
				if (args?.where?.id?.in) {
					return messageRepo.getStepsByIds(args.where.id.in);
				}
				return [];
			},
			create: async ({ data }) => {
				await messageRepo.createStep(data);
				return data;
			},
			update: async ({ where, data }) => {
				await messageRepo.updateStep(where.id, data);
				return { ...data, id: where.id };
			},
		},

		part: {
			findUnique: async ({ where }) => {
				return messageRepo.getPartById(where.id);
			},
			findMany: async (args) => {
				if (args?.where?.stepId) {
					return messageRepo.getPartsByStepId(args.where.stepId);
				}
				if (args?.where?.id?.in) {
					return messageRepo.getPartsByIds(args.where.id.in);
				}
				return [];
			},
			create: async ({ data }) => {
				await messageRepo.createPart(data);
				return data;
			},
			update: async ({ where, data }) => {
				await messageRepo.updatePart(where.id, data);
				return { ...data, id: where.id };
			},
		},

		todo: {
			findMany: async (args) => {
				if (args?.where?.sessionId) {
					return sessionRepo.getTodosBySessionId(args.where.sessionId);
				}
				return [];
			},
			create: async ({ data }) => {
				await sessionRepo.createTodo(data);
				return data;
			},
			update: async ({ where, data }) => {
				await sessionRepo.updateTodo(where.sessionId, where.id, data);
				return { ...data, ...where };
			},
			delete: async ({ where }) => {
				await sessionRepo.deleteTodo(where.sessionId, where.id);
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
	return {
		publish: async (channel, event) => {
			await appContext.eventStream.publish(channel, event);
		},
		subscribe: (channel) => {
			// Create async iterable from Observable
			return {
				[Symbol.asyncIterator]: () => {
					const observable = appContext.eventStream.subscribe(channel);
					const queue: any[] = [];
					let resolve: ((value: IteratorResult<any>) => void) | null = null;
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
								resolve({ value: undefined, done: true });
							}
						},
						complete: () => {
							done = true;
							if (resolve) {
								resolve({ value: undefined, done: true });
							}
						},
					});

					return {
						next: () => {
							if (queue.length > 0) {
								return Promise.resolve({ value: queue.shift(), done: false });
							}
							if (done) {
								return Promise.resolve({ value: undefined, done: true });
							}
							return new Promise<IteratorResult<any>>((res) => {
								resolve = res;
							});
						},
						return: () => {
							subscription.unsubscribe();
							done = true;
							return Promise.resolve({ value: undefined, done: true });
						},
					};
				},
			};
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

	const server = createServer({
		entities,
		relations,
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

	return server;
}

/**
 * Export router type for client type inference
 *
 * Usage on client:
 * ```typescript
 * import type { AppRouter } from '@code/server/lens/server'
 *
 * const client = createClient<AppRouter>({
 *   links: [websocketLink({ url: 'ws://...' })]
 * })
 * ```
 */
export type AppRouter = ReturnType<typeof createLensServer>["_types"];

// =============================================================================
// Index Export
// =============================================================================

// Re-export context types
export type { LensContext, LensDB, LensEventStream } from "./context.js";

// Re-export entities for type inference
export * from "./entities.js";
