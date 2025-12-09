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
import { getSessionMessages, messages, messageSteps, stepParts } from "@sylphx/code-core";
import type { AppContext } from "../context.js";

// Schema
import * as entities from "./entities.js";
// Note: relations not yet supported by lens-server

// Operations
import * as queries from "./queries.js";
import * as mutations from "./mutations.js";

// Plugins (optimistic updates, etc.)
import { plugins } from "./builders.js";

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

// Entity Resolvers Factory (inline resolvers on entities, lens-core 2.4.0+)
// Note: createResolvers is deprecated - entities with inline resolvers are automatically extracted

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
				// If content is provided, use the full addMessage flow
				// Otherwise, just insert the message container (for mutations that create steps separately)
				if (data.content && Array.isArray(data.content)) {
					await messageRepo.addMessage(data);
				} else {
					// Direct insert for message container only
					await db.insert(messages).values({
						id: data.id,
						sessionId: data.sessionId,
						role: data.role,
						timestamp: data.timestamp || Date.now(),
						ordering: data.ordering || 0,
						finishReason: data.finishReason || null,
						status: data.status || "completed",
					});
				}
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
				// Insert step into database
				await db.insert(messageSteps).values({
					id: data.id,
					messageId: data.messageId,
					stepIndex: data.stepIndex || 0,
					status: data.status || "completed",
					systemMessages: data.systemMessages ? JSON.stringify(data.systemMessages) : null,
					provider: data.provider || null,
					model: data.model || null,
					duration: data.duration || null,
					finishReason: data.finishReason || null,
					startTime: data.startTime || Date.now(),
					endTime: data.endTime || null,
				});
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
				// Insert part into database
				await db.insert(stepParts).values({
					id: data.id,
					stepId: data.stepId,
					ordering: data.ordering || 0,
					type: data.type,
					content: typeof data.content === "string" ? data.content : JSON.stringify(data.content),
				});
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
				const todo = await todoRepo.createTodo(data.sessionId, data);
				return { ...todo, sessionId: data.sessionId };
			},
			update: async ({ where, data }) => {
				const todo = await todoRepo.updateTodo(where.sessionId, where.id, data);
				return todo ? { ...todo, sessionId: where.sessionId } : { ...data, ...where };
			},
			delete: async ({ where }) => {
				await todoRepo.deleteTodo(where.sessionId, where.id);
				return { id: where.id, sessionId: where.sessionId };
			},
		},

		// ======================================================================
		// StepUsage (DB-backed)
		// ======================================================================

		stepUsage: {
			findUnique: async ({ where }) => {
				// TODO: Implement when step_usage table exists
				return null;
			},
			create: async ({ data }) => {
				// TODO: Implement when step_usage table exists
				return data;
			},
			update: async ({ where, data }) => {
				// TODO: Implement when step_usage table exists
				return { ...data, stepId: where.stepId };
			},
		},

		// ======================================================================
		// BashProcess (In-memory via BashManager)
		// ======================================================================

		bashProcess: {
			findUnique: async ({ where }) => {
				const proc = appContext.bashManagerV2.get(where.id);
				if (!proc) return null;
				return {
					id: proc.id,
					command: proc.command,
					cwd: proc.cwd,
					mode: proc.mode,
					status: proc.status,
					startTime: proc.startTime,
					endTime: proc.endTime,
					duration: proc.endTime ? proc.endTime - proc.startTime : undefined,
					exitCode: proc.exitCode,
					stdout: proc.stdout,
					stderr: proc.stderr,
				};
			},
			findMany: async () => {
				return appContext.bashManagerV2.list().map((proc) => ({
					id: proc.id,
					command: proc.command,
					cwd: proc.cwd,
					mode: proc.mode,
					status: proc.status,
					startTime: proc.startTime,
					endTime: proc.endTime,
					duration: proc.endTime ? proc.endTime - proc.startTime : undefined,
					exitCode: proc.exitCode,
				}));
			},
		},

		// ======================================================================
		// Agent (File-based via loadAllAgents)
		// ======================================================================

		agent: {
			findUnique: async ({ where, cwd }) => {
				const { loadAllAgents } = await import("@sylphx/code-core");
				const agents = await loadAllAgents(cwd || process.cwd());
				const agent = agents.find((a: any) => a.id === where.id);
				if (!agent) return null;
				return {
					id: agent.id,
					name: agent.metadata?.name || agent.id,
					description: agent.metadata?.description || "",
					systemPrompt: agent.systemPrompt,
					isBuiltin: agent.isBuiltin ?? false,
					filePath: agent.filePath,
					defaultRuleIds: agent.metadata?.defaultRuleIds,
				};
			},
			findMany: async ({ cwd } = {}) => {
				const { loadAllAgents } = await import("@sylphx/code-core");
				const agents = await loadAllAgents(cwd || process.cwd());
				return agents.map((a: any) => ({
					id: a.id,
					name: a.metadata?.name || a.id,
					description: a.metadata?.description || "",
					systemPrompt: a.systemPrompt,
					isBuiltin: a.isBuiltin ?? false,
					filePath: a.filePath,
					defaultRuleIds: a.metadata?.defaultRuleIds,
				}));
			},
		},

		// ======================================================================
		// Rule (File-based via loadAllRules)
		// ======================================================================

		rule: {
			findUnique: async ({ where, cwd }) => {
				const { loadAllRules } = await import("@sylphx/code-core");
				const rules = await loadAllRules(cwd || process.cwd());
				const rule = rules.find((r: any) => r.id === where.id);
				if (!rule) return null;
				return {
					id: rule.id,
					name: rule.metadata?.name || rule.id,
					description: rule.metadata?.description || "",
					content: rule.content,
					isBuiltin: rule.isBuiltin ?? false,
					filePath: rule.filePath,
					globs: rule.metadata?.globs,
					alwaysApply: rule.metadata?.alwaysApply ?? false,
				};
			},
			findMany: async ({ cwd } = {}) => {
				const { loadAllRules } = await import("@sylphx/code-core");
				const rules = await loadAllRules(cwd || process.cwd());
				return rules.map((r: any) => ({
					id: r.id,
					name: r.metadata?.name || r.id,
					description: r.metadata?.description || "",
					content: r.content,
					isBuiltin: r.isBuiltin ?? false,
					filePath: r.filePath,
					globs: r.metadata?.globs,
					alwaysApply: r.metadata?.alwaysApply ?? false,
				}));
			},
		},

		// ======================================================================
		// Provider (Config-based via AI_PROVIDERS)
		// ======================================================================

		provider: {
			findUnique: async ({ where, cwd }) => {
				const { AI_PROVIDERS, getProvider, loadAIConfig } = await import("@sylphx/code-core");
				const providerInfo = (AI_PROVIDERS as Record<string, any>)[where.id];
				if (!providerInfo) return null;

				const configResult = await loadAIConfig(cwd || process.cwd());
				const config = configResult.success ? configResult.data : { providers: {} };
				const provider = getProvider(where.id as any);
				const providerConfig = config.providers?.[where.id] || {};

				return {
					id: where.id,
					name: providerInfo.name,
					description: providerInfo.description,
					isConfigured: provider.isConfigured(providerConfig),
					isEnabled: providerConfig.enabled !== false,
					modelCount: 0,
				};
			},
			findMany: async ({ cwd } = {}) => {
				const { AI_PROVIDERS, getProvider, loadAIConfig } = await import("@sylphx/code-core");
				const configResult = await loadAIConfig(cwd || process.cwd());
				const config = configResult.success ? configResult.data : { providers: {} };

				const providers = [];
				for (const [id, providerInfo] of Object.entries(AI_PROVIDERS)) {
					const provider = getProvider(id as any);
					const providerConfig = config.providers?.[id] || {};
					providers.push({
						id,
						name: (providerInfo as any).name,
						description: (providerInfo as any).description,
						isConfigured: provider.isConfigured(providerConfig),
						isEnabled: providerConfig.enabled !== false,
						modelCount: 0,
					});
				}
				return providers;
			},
		},

		// ======================================================================
		// Model (Config-based via fetchModels)
		// ======================================================================

		model: {
			findUnique: async ({ where, cwd }) => {
				const { loadAIConfig, fetchModels: fetchModelsCore, getProvider } = await import("@sylphx/code-core");
				try {
					const aiConfigResult = await loadAIConfig(cwd || process.cwd());
					if (!aiConfigResult.success) return null;

					const providerConfig = aiConfigResult.data.providers?.[where.providerId];
					if (!providerConfig) return null;

					const provider = getProvider(where.providerId as any);
					if (!provider.isConfigured(providerConfig)) return null;

					const models = await fetchModelsCore(where.providerId as any, providerConfig);
					const model = models.find((m: any) => m.id === where.id);
					if (!model) return null;

					return {
						id: model.id,
						name: model.name,
						providerId: where.providerId,
						contextLength: model.contextLength,
						inputPrice: model.inputPrice,
						outputPrice: model.outputPrice,
						supportsTools: model.supportsTools ?? true,
						supportsVision: model.supportsVision ?? false,
						supportsStreaming: model.supportsStreaming ?? true,
						isAvailable: true,
					};
				} catch {
					return null;
				}
			},
			findMany: async ({ where, cwd }) => {
				const { loadAIConfig, fetchModels: fetchModelsCore, getProvider } = await import("@sylphx/code-core");
				try {
					const aiConfigResult = await loadAIConfig(cwd || process.cwd());
					if (!aiConfigResult.success) return [];

					const providerConfig = aiConfigResult.data.providers?.[where.providerId];
					if (!providerConfig) return [];

					const provider = getProvider(where.providerId as any);
					if (!provider.isConfigured(providerConfig)) return [];

					const models = await fetchModelsCore(where.providerId as any, providerConfig);
					return models.map((m: any) => ({
						id: m.id,
						name: m.name,
						providerId: where.providerId,
						contextLength: m.contextLength,
						inputPrice: m.inputPrice,
						outputPrice: m.outputPrice,
						supportsTools: m.supportsTools ?? true,
						supportsVision: m.supportsVision ?? false,
						supportsStreaming: m.supportsStreaming ?? true,
						isAvailable: true,
					}));
				} catch {
					return [];
				}
			},
		},

		// ======================================================================
		// MCPServer (Config-based)
		// ======================================================================

		mcpServer: {
			findUnique: async ({ where, cwd }) => {
				const { loadAIConfig } = await import("@sylphx/code-core");
				const configResult = await loadAIConfig(cwd || process.cwd());
				if (!configResult.success || !configResult.data.mcpServers) return null;

				const serverConfig = configResult.data.mcpServers[where.id];
				if (!serverConfig) return null;

				return {
					id: where.id,
					name: where.id,
					description: (serverConfig as any).description,
					transportType: (serverConfig as any).command ? "stdio" : "sse",
					status: "disconnected",
					toolCount: 0,
					resourceCount: 0,
					promptCount: 0,
					enabled: (serverConfig as any).enabled !== false,
				};
			},
			findMany: async ({ cwd } = {}) => {
				const { loadAIConfig } = await import("@sylphx/code-core");
				const configResult = await loadAIConfig(cwd || process.cwd());
				if (!configResult.success || !configResult.data.mcpServers) return [];

				const servers = [];
				for (const [name, config] of Object.entries(configResult.data.mcpServers)) {
					servers.push({
						id: name,
						name,
						description: (config as any).description,
						transportType: (config as any).command ? "stdio" : "sse",
						status: "disconnected",
						toolCount: 0,
						resourceCount: 0,
						promptCount: 0,
						enabled: (config as any).enabled !== false,
					});
				}
				return servers;
			},
		},

		// ======================================================================
		// Credential (via credential store)
		// ======================================================================

		credential: {
			findUnique: async ({ where }) => {
				const { getCredential } = await import("@sylphx/code-core");
				try {
					const cred = getCredential(where.id);
					if (!cred) return null;
					return {
						id: cred.id,
						providerId: cred.providerId,
						label: cred.label,
						maskedApiKey: cred.apiKey ? `${cred.apiKey.slice(0, 4)}...${cred.apiKey.slice(-4)}` : "",
						scope: cred.scope,
						status: "active",
						isDefault: cred.isDefault,
						createdAt: cred.createdAt || Date.now(),
					};
				} catch {
					return null;
				}
			},
			findMany: async ({ where } = {}) => {
				const { listCredentials } = await import("@sylphx/code-core");
				try {
					const creds = listCredentials(where?.providerId);
					return creds.map((cred: any) => ({
						id: cred.id,
						providerId: cred.providerId,
						label: cred.label,
						maskedApiKey: cred.apiKey ? `${cred.apiKey.slice(0, 4)}...${cred.apiKey.slice(-4)}` : "",
						scope: cred.scope,
						status: "active",
						isDefault: cred.isDefault,
						createdAt: cred.createdAt || Date.now(),
					}));
				} catch {
					return [];
				}
			},
			create: async ({ data }) => {
				const { createCredential: createCred } = await import("@sylphx/code-core");
				const cred = createCred(data);
				return {
					id: cred.id,
					providerId: data.providerId,
					label: data.label,
					maskedApiKey: `${data.apiKey.slice(0, 4)}...${data.apiKey.slice(-4)}`,
					scope: data.scope || "global",
					status: "active",
					isDefault: data.isDefault ?? true,
					createdAt: Date.now(),
				};
			},
			delete: async ({ where }) => {
				const { deleteCredential: deleteCred } = await import("@sylphx/code-core");
				deleteCred(where.id);
				return { id: where.id };
			},
		},

		// ======================================================================
		// Tool (Runtime via getAISDKTools)
		// ======================================================================

		tool: {
			findUnique: async ({ where }) => {
				const { getAISDKTools } = await import("@sylphx/code-core");
				const tools = await getAISDKTools();
				const def = tools[where.id];
				if (!def) return null;
				return {
					id: where.id,
					name: where.id,
					description: (def as any).description || "",
					category: "builtin",
					isAsync: false,
					source: "builtin",
					isEnabled: true,
					enabledByDefault: true,
				};
			},
			findMany: async ({ where } = {}) => {
				const { getAISDKTools } = await import("@sylphx/code-core");
				const tools = await getAISDKTools();
				return Object.entries(tools)
					.filter(([_, def]) => {
						if (where?.source && where.source !== "builtin") return false;
						return true;
					})
					.map(([name, def]) => ({
						id: name,
						name,
						description: (def as any).description || "",
						category: "builtin",
						isAsync: false,
						source: "builtin",
						isEnabled: true,
						enabledByDefault: true,
					}));
			},
		},

		// ======================================================================
		// File (via FileStorage)
		// ======================================================================

		file: {
			findUnique: async ({ where }) => {
				// FileStorage uses content-addressable IDs
				// TODO: Implement when file metadata tracking is added
				return null;
			},
			findMany: async () => {
				// TODO: Implement when file metadata tracking is added
				return [];
			},
			create: async ({ data }) => {
				const fileId = await appContext.fileStorage.upload({
					relativePath: data.relativePath,
					mediaType: data.mediaType,
					size: data.size,
					content: data.content,
				});
				return {
					id: fileId,
					relativePath: data.relativePath,
					mediaType: data.mediaType,
					size: data.size,
					uploadedAt: Date.now(),
					sessionId: data.sessionId,
				};
			},
			delete: async ({ where }) => {
				// TODO: Implement when file deletion is supported
				return { id: where.id };
			},
		},

		// ======================================================================
		// AskRequest (via AskManager)
		// ======================================================================

		askRequest: {
			findUnique: async ({ where }) => {
				try {
					const { getPendingAsk } = await import("../services/ask-manager.service.js");
					const ask = getPendingAsk(where.id);
					if (!ask) return null;
					return {
						id: ask.id,
						sessionId: ask.sessionId,
						type: ask.type || "question",
						questions: ask.questions,
						status: ask.status || "pending",
						answers: ask.answers,
						createdAt: ask.createdAt || Date.now(),
						answeredAt: ask.answeredAt,
					};
				} catch {
					return null;
				}
			},
			findMany: async ({ where } = {}) => {
				try {
					const { getPendingAsks } = await import("../services/ask-manager.service.js");
					const asks = getPendingAsks(where?.sessionId);
					return asks
						.filter((ask: any) => !where?.status || ask.status === where.status)
						.map((ask: any) => ({
							id: ask.id,
							sessionId: ask.sessionId,
							type: ask.type || "question",
							questions: ask.questions,
							status: ask.status || "pending",
							answers: ask.answers,
							createdAt: ask.createdAt || Date.now(),
							answeredAt: ask.answeredAt,
						}));
				} catch {
					return [];
				}
			},
			create: async ({ data }) => {
				try {
					const { createAsk } = await import("../services/ask-manager.service.js");
					const ask = await createAsk(data);
					return {
						id: ask.id,
						sessionId: data.sessionId,
						type: data.type || "question",
						questions: data.questions,
						status: "pending",
						createdAt: Date.now(),
					};
				} catch {
					return data;
				}
			},
			update: async ({ where, data }) => {
				try {
					const { updateAsk } = await import("../services/ask-manager.service.js");
					await updateAsk(where.id, data);
					return { ...data, id: where.id };
				} catch {
					return { ...data, id: where.id };
				}
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

	// Entities have inline resolvers - automatically extracted by createApp
	const app = createApp({
		entities,
		queries,
		mutations,
		plugins, // Optimistic updates, etc.
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
