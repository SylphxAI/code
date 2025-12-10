/**
 * Lens Query Definitions
 *
 * Queries are read-only operations. They can return single values or streams.
 * All queries support field selection via .select() on client.
 *
 * Streaming queries use async generators - each yield pushes to client.
 */

import { query } from "./builders.js";
import { nullable } from "@sylphx/lens-core";
import { z } from "zod";
import {
	Session,
	Message,
	Step,
	Part,
	Todo,
	BashProcess,
	Agent,
	Rule,
	Provider,
	Model,
	Tool,
	MCPServer,
	Credential,
	File,
	AskRequest,
} from "./entities.js";
import { subscribeToSessionStream, subscribeToChannel } from "./subscription-utils.js";

// =============================================================================
// Session Queries
// =============================================================================

/**
 * Get session by ID
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution
 * - Phase 1: .resolve() returns initial session from DB
 * - Phase 2: .subscribe() listens for session-updated events
 *
 * Client usage:
 *   const { data: session } = client.getSession.useQuery({ input: { id } });
 */
export const getSession = query()
	.input(z.object({ id: z.string() }))
	.returns(Session)
	.resolve(async ({ input, ctx }) => {
		return ctx.db.session.findUnique({ where: { id: input.id } });
	})
	.subscribe(({ input, ctx }) => ({ emit, onCleanup }) => {
		// Track current session state for merging partial updates
		let currentSession: typeof Session.infer | null = null;
		let pendingUpdates: any[] = [];

		// Initialize from DB then apply any pending updates
		ctx.db.session.findUnique({ where: { id: input.id } }).then((session) => {
			currentSession = session;
			// Apply any updates that arrived before DB loaded
			if (currentSession && pendingUpdates.length > 0) {
				for (const update of pendingUpdates) {
					currentSession = { ...currentSession, ...update };
				}
				emit.replace({ ...currentSession });
			}
			pendingUpdates = [];
		});

		const cleanup = subscribeToSessionStream(ctx, input.id, (payload) => {
			// Handle session-updated: merge partial update into full session
			if (payload?.type === "session-updated" && payload.session) {
				if (currentSession) {
					currentSession = { ...currentSession, ...payload.session };
					emit.replace({ ...currentSession });
				} else {
					// Queue update for when DB loads
					pendingUpdates.push(payload.session);
				}
			}

			// Handle session-status-updated: update just the status field
			if (payload?.type === "session-status-updated" && payload.status) {
				if (currentSession) {
					currentSession = { ...currentSession, status: payload.status };
					emit.replace({ ...currentSession });
				} else {
					// Queue update for when DB loads
					pendingUpdates.push({ status: payload.status });
				}
			}
		});

		onCleanup(cleanup);
	});

/**
 * List all sessions (ordered by updatedAt desc)
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution
 * - Phase 1: .resolve() returns initial session list
 * - Phase 2: .subscribe() uses delta emit for live updates
 */
export const listSessions = query()
	.input(
		z
			.object({
				limit: z.number().optional(),
				cursor: z.number().optional(),
			})
			.optional(),
	)
	.returns([Session])
	.resolve(async ({ input, ctx }) => {
		const limit = input?.limit ?? 50;
		const cursor = input?.cursor;

		return ctx.db.session.findMany({
			where: cursor ? { updatedAt: { lt: cursor } } : undefined,
			orderBy: { updatedAt: "desc" },
			take: limit,
		});
	})
	.subscribe(({ ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, "session-events", (payload) => {
			if (payload?.type === "session-created" && payload.session) {
				emit.push(payload.session, 0);
			}
			if (payload?.type === "session-updated" && payload.session) {
				emit.patch([{ op: "replace", path: `/${payload.index}`, value: payload.session }]);
			}
			if (payload?.type === "session-deleted" && payload.sessionId) {
				emit.pull({ id: payload.sessionId });
			}
		});
		onCleanup(cleanup);
	});

/**
 * Get last session (for headless mode)
 */
export const getLastSession = query()
	.returns(nullable(Session))
	.resolve(async ({ ctx }) => {
		const sessions = await ctx.db.session.findMany({
			orderBy: { updatedAt: "desc" },
			take: 1,
		});
		return sessions[0] ?? null;
	});

/**
 * Search sessions by title
 */
export const searchSessions = query()
	.input(z.object({ query: z.string(), limit: z.number().optional() }))
	.returns([Session])
	.resolve(async ({ input, ctx }) => {
		return ctx.db.session.findMany({
			where: { title: { contains: input.query } },
			orderBy: { updatedAt: "desc" },
			take: input.limit ?? 20,
		});
	});

/**
 * Get session count
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution
 * - Phase 1: .resolve() returns initial count
 * - Phase 2: .subscribe() updates on session create/delete
 */
export const getSessionCount = query()
	.returns(z.number())
	.resolve(async ({ ctx }) => ctx.db.session.count())
	.subscribe(({ ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, "session-events", (payload) => {
			if (payload?.type === "session-created") emit.delta(1);
			if (payload?.type === "session-deleted") emit.delta(-1);
		});
		onCleanup(cleanup);
	});

// =============================================================================
// Message Queries
// =============================================================================

/**
 * Get message by ID
 */
export const getMessage = query()
	.input(z.object({ id: z.string() }))
	.returns(nullable(Message))
	.resolve(async ({ input, ctx }) => ctx.db.message.findUnique({ where: { id: input.id } }));

/**
 * List messages for a session
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns initial message list with eager-loaded steps/parts
 * - Phase 2: .subscribe() uses delta emit for message-level updates
 *
 * Architecture (separation of concerns):
 * - listMessages → message list level (push new messages)
 * - Message.steps entity resolver → step-level updates (step-added, step-updated)
 * - Part content updates → part-content-delta via Message.steps
 *
 * Events: message-created → emit.push()
 */
export const listMessages = query()
	.input(
		z.object({
			sessionId: z.string(),
			limit: z.number().optional(),
		}),
	)
	.returns([Message])
	.resolve(async ({ input, ctx }) => {
		// Phase 1: Initial fetch with eager-loaded steps/parts
		const messages = await ctx.db.message.findMany({
			where: { sessionId: input.sessionId },
		});
		return input.limit ? messages.slice(0, input.limit) : messages;
	})
	.subscribe(({ input, ctx }) => ({ emit, onCleanup }) => {
		// Phase 2: Publisher pattern with delta emit (Lens 2.7.0+)
		// Handles all message events: creation, step-added, part-updated
		// Uses emit.push() for new messages and emit.replace() for updates
		const channel = `session-stream:${input.sessionId}`;
		let cancelled = false;

		// Track all messages for efficient updates
		// We maintain a full copy of messages so we can use emit.replace() for updates
		const messages: any[] = [];
		const messageMap = new Map<string, number>(); // messageId → array index

		// IMPORTANT: Track subscription start time to ignore replayed events
		// ReplaySubject buffers last 50 events - we only want NEW events
		const subscriptionStartTime = Date.now();

		(async () => {
			// Initialize from DB to match .resolve() data
			// This ensures we don't push duplicate messages
			const initialMessages = await ctx.db.message.findMany({
				where: { sessionId: input.sessionId },
			});
			for (const msg of initialMessages) {
				const index = messages.length;
				messages.push({ ...msg, steps: (msg as any).steps || [] });
				messageMap.set(msg.id, index);
			}

			for await (const { payload, timestamp } of ctx.eventStream.subscribe(channel)) {
				if (cancelled) break;

				// Skip replayed events (events from before subscription started)
				// This prevents rapid re-renders from buffered events
				if (timestamp && timestamp < subscriptionStartTime) {
					continue;
				}

				// Handle message-created events (all variants): push new message to list
				// Streaming service emits: user-message-created, assistant-message-created
				// Mutations emit: message-created
				const isMessageCreated = payload?.type === "message-created" ||
					payload?.type === "user-message-created" ||
					payload?.type === "assistant-message-created";
				if (isMessageCreated && payload.message) {
					// Check if message already exists (avoid duplicates)
					if (messageMap.has(payload.message.id)) {
						continue; // Skip duplicate
					}
					// Track the message for future updates
					const index = messages.length;
					const messageData = { ...payload.message, steps: payload.message.steps || [] };
					messages.push(messageData);
					messageMap.set(payload.message.id, index);
					emit.push(messageData);
				}

				// Handle step-added: add step to message's steps array
				if (payload?.type === "step-added" && payload.messageId && payload.step) {
					const index = messageMap.get(payload.messageId);
					if (index !== undefined) {
						// Update local state
						if (!messages[index].steps) messages[index].steps = [];
						messages[index].steps.push({ ...payload.step, parts: payload.step.parts || [] });
						// Emit replace with updated messages array
						emit.replace([...messages]);
					}
				}

				// Handle part-updated: update part within step
				if (payload?.type === "part-updated" && payload.messageId && payload.stepId) {
					const index = messageMap.get(payload.messageId);
					if (index !== undefined) {
						// Find the step by ID
						const stepIndex = messages[index].steps?.findIndex((s: any) => s.id === payload.stepId);
						if (stepIndex !== undefined && stepIndex >= 0) {
							// Ensure parts array exists
							if (!messages[index].steps[stepIndex].parts) {
								messages[index].steps[stepIndex].parts = [];
							}
							// Update the part at the specified index
							messages[index].steps[stepIndex].parts[payload.partIndex] = payload.part;
							// Emit replace with updated messages array
							emit.replace([...messages]);
						}
					}
				}

				// Handle message-status-updated: update message status
				if (payload?.type === "message-status-updated" && payload.messageId) {
					const index = messageMap.get(payload.messageId);
					if (index !== undefined) {
						messages[index].status = payload.status;
						emit.replace([...messages]);
					}
				}
			}
		})();

		onCleanup(() => {
			cancelled = true;
		});
	});

/**
 * Get recent user messages (for input history)
 * Returns user messages across all sessions, most recent first
 */
export const getRecentUserMessages = query()
	.input(
		z.object({
			limit: z.number().optional(),
		}).optional(),
	)
	.returns(z.array(z.object({
		text: z.string(),
		files: z.array(z.object({
			fileId: z.string(),
			relativePath: z.string(),
			mediaType: z.string(),
			size: z.number(),
		})),
	})))
	.resolve(async ({ input, ctx }) => {
		const messageRepo = ctx.appContext.database.getMessageRepository();

		// Get recent user messages from the message repository
		// Returns { messages: [...], nextCursor: number | null }
		const limit = input?.limit ?? 100;
		const result = await messageRepo.getRecentUserMessages(limit);

		// Result.messages contains the array of user messages
		return result.messages;
	});

// =============================================================================
// Step Queries
// =============================================================================

/**
 * Get step by ID
 */
export const getStep = query()
	.input(z.object({ id: z.string() }))
	.returns(nullable(Step))
	.resolve(async ({ input, ctx }) => ctx.db.step.findUnique({ where: { id: input.id } }));

/**
 * List steps for a message
 */
export const listSteps = query()
	.input(z.object({ messageId: z.string() }))
	.returns([Step])
	.resolve(async ({ input, ctx }) => {
		return ctx.db.step.findMany({
			where: { messageId: input.messageId },
			orderBy: { stepIndex: "asc" },
		});
	});

// =============================================================================
// Part Queries
// =============================================================================

/**
 * Get part by ID
 */
export const getPart = query()
	.input(z.object({ id: z.string() }))
	.returns(nullable(Part))
	.resolve(async ({ input, ctx }) => ctx.db.part.findUnique({ where: { id: input.id } }));

/**
 * List parts for a step
 */
export const listParts = query()
	.input(z.object({ stepId: z.string() }))
	.returns([Part])
	.resolve(async ({ input, ctx }) => {
		return ctx.db.part.findMany({
			where: { stepId: input.stepId },
			orderBy: { ordering: "asc" },
		});
	});

// =============================================================================
// Todo Queries
// =============================================================================

/**
 * List todos for a session
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns initial todo list
 * - Phase 2: .subscribe() uses delta emit for live updates
 *
 * Events: todo-created → emit.push(), todo-updated → emit.patch(), todo-deleted → emit.pull()
 */
export const listTodos = query()
	.input(z.object({ sessionId: z.string() }))
	.returns([Todo])
	.resolve(async ({ input, ctx }) => {
		return ctx.db.todo.findMany({
			where: { sessionId: input.sessionId },
			orderBy: { ordering: "asc" },
		});
	})
	.subscribe(({ input, ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToSessionStream(ctx, input.sessionId, (payload) => {
			// Handle todo-created: push new todo to list
			if (payload?.type === "todo-created" && payload.todo) {
				emit.push(payload.todo);
			}

			// Handle todo-updated: patch existing todo
			if (payload?.type === "todo-updated" && payload.todo) {
				emit.patch([
					{ op: "replace", path: `/${payload.index}`, value: payload.todo },
				]);
			}

			// Handle todo-deleted: pull todo from list
			if (payload?.type === "todo-deleted" && payload.todoId) {
				emit.pull({ id: payload.todoId });
			}

			// Handle todos-synced: replace entire list
			if (payload?.type === "todos-synced" && payload.todos) {
				emit.replace(payload.todos);
			}
		});
		onCleanup(cleanup);
	});

// =============================================================================
// Streaming Queries (Real-time subscriptions)
// =============================================================================

/**
 * Subscribe to session updates
 *
 * Uses async generator - yields on every update.
 * Client receives updates in real-time via WebSocket.
 *
 * Channel: session-stream:${sessionId} - consistent with other session queries
 */
export const subscribeSession = query()
	.input(z.object({ id: z.string() }))
	.returns(Session)
	.resolve(async function* ({ input, ctx }) {
		// Yield initial data
		const session = await ctx.db.session.findUnique({ where: { id: input.id } });
		if (session) {
			yield session;
		}

		// Subscribe to updates (use session-stream channel like other session queries)
		const channel = `session-stream:${input.id}`;
		for await (const event of ctx.eventStream.subscribe(channel)) {
			// Handle session-updated events
			if (event.payload?.type === "session-updated" && event.payload.session) {
				yield event.payload.session;
			}
		}
	});

/**
 * Subscribe to session list updates
 *
 * Yields when any session is created, updated, or deleted.
 */
export const subscribeSessionList = query()
	.returns([Session])
	.resolve(async function* ({ ctx }) {
		// Yield initial list
		yield await ctx.db.session.findMany({
			orderBy: { updatedAt: "desc" },
			take: 50,
		});

		// Subscribe to session events
		for await (const _event of ctx.eventStream.subscribe("session-events")) {
			// Re-fetch list on any session event
			yield await ctx.db.session.findMany({
				orderBy: { updatedAt: "desc" },
				take: 50,
			});
		}
	});

/**
 * StoredEvent schema for streaming events
 */
const StoredEventSchema = z.object({
	id: z.string(),
	cursor: z.object({
		timestamp: z.number(),
		sequence: z.number(),
	}),
	channel: z.string(),
	type: z.string(),
	timestamp: z.number(),
	payload: z.any(),
});

/**
 * Subscribe to session streaming events
 *
 * This is used for real-time streaming events (text-delta, tool-call, etc.)
 * Channel: session-stream:${sessionId}
 *
 * Matches tRPC events.subscribeToSession API for client compatibility.
 */
export const subscribeToSession = query()
	.input(z.object({
		sessionId: z.string(),
		replayLast: z.number().min(0).max(100).default(0),
	}))
	.returns(StoredEventSchema)
	.resolve(async function* ({ input, ctx }) {
		// Streaming events use session-stream:${id} channel
		const channel = `session-stream:${input.sessionId}`;

		// Subscribe with history replay
		for await (const event of ctx.eventStream.subscribeWithHistory(channel, input.replayLast)) {
			yield event;
		}
	});

// =============================================================================
// Config Queries
// =============================================================================

/**
 * Load AI config from file system
 */
export const loadConfig = query()
	.input(z.object({ cwd: z.string().optional() }).optional())
	.returns(z.object({
		success: z.boolean(),
		config: z.any().optional(),
		error: z.string().optional(),
	}))
	.resolve(async ({ input }) => {
		const { loadAIConfig, DEFAULT_AGENT_ID } = await import("@sylphx/code-core");
		const cwd = input?.cwd || process.cwd();
		const result = await loadAIConfig(cwd);

		// Server provides defaults - client is just a player
		const defaults = {
			providers: {},
			defaultAgentId: DEFAULT_AGENT_ID,
			defaultEnabledRuleIds: [] as string[],
		};

		if (result.success) {
			// Sanitize config (remove secrets)
			const { sanitizeAIConfig } = await import("./config-utils.js");
			const sanitizedConfig = sanitizeAIConfig(result.data);

			// Merge with defaults, but undefined values in config should NOT override defaults
			// This ensures server-provided defaults are used when config doesn't specify a value
			const merged = { ...defaults };
			for (const [key, value] of Object.entries(sanitizedConfig)) {
				if (value !== undefined) {
					(merged as any)[key] = value;
				}
			}
			return { success: true, config: merged };
		}
		return { success: true, config: defaults };
	});

/**
 * Get all available providers
 */
export const getProviders = query()
	.input(z.object({ cwd: z.string().optional() }).optional())
	.returns(z.record(z.object({
		id: z.string(),
		name: z.string(),
		description: z.string(),
		isConfigured: z.boolean(),
	})))
	.resolve(async ({ input }) => {
		const { AI_PROVIDERS, getProvider, loadAIConfig } = await import("@sylphx/code-core");
		const cwd = input?.cwd || process.cwd();
		const configResult = await loadAIConfig(cwd);
		const config = configResult.success ? configResult.data : { providers: {} };

		const providersWithStatus: Record<string, any> = {};
		for (const [id, providerInfo] of Object.entries(AI_PROVIDERS)) {
			const provider = getProvider(id as any);
			const providerConfig = config.providers?.[id] || {};
			const isConfigured = provider.isConfigured(providerConfig);
			providersWithStatus[id] = {
				id,
				name: providerInfo.name,
				description: providerInfo.description,
				isConfigured,
			};
		}
		return providersWithStatus;
	});

/**
 * Get provider config schema
 */
export const getProviderSchema = query()
	.input(z.object({ providerId: z.string() }))
	.returns(z.object({
		success: z.boolean(),
		schema: z.array(z.any()).optional(),
		error: z.string().optional(),
	}))
	.resolve(async ({ input }) => {
		try {
			const { getProvider } = await import("@sylphx/code-core");
			const provider = getProvider(input.providerId as any);
			const schema = provider.getConfigSchema();
			return { success: true, schema };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : "Failed to get provider schema" };
		}
	});

/**
 * Fetch models for a provider
 */
export const fetchModels = query()
	.input(z.object({ providerId: z.string(), cwd: z.string().optional() }))
	.returns(z.object({
		success: z.boolean(),
		models: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
		error: z.string().optional(),
	}))
	.resolve(async ({ input }) => {
		try {
			const { loadAIConfig, fetchModels: fetchModelsCore } = await import("@sylphx/code-core");
			const cwd = input.cwd || process.cwd();
			const aiConfigResult = await loadAIConfig(cwd);
			if (!aiConfigResult.success) {
				return { success: false, error: aiConfigResult.error.message };
			}
			const providerConfig = aiConfigResult.data.providers?.[input.providerId];
			if (!providerConfig) {
				return { success: false, error: `Provider ${input.providerId} is not configured` };
			}
			const models = await fetchModelsCore(input.providerId as any, providerConfig);
			return { success: true, models: models.map(m => ({ id: m.id, name: m.name })) };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : "Failed to fetch models" };
		}
	});

/**
 * Scan project files
 */
export const scanProjectFiles = query()
	.input(z.object({ cwd: z.string().optional(), query: z.string().optional() }).optional())
	.returns(z.object({ files: z.array(z.any()) }))
	.resolve(async ({ input }) => {
		const { scanProjectFiles: scanFiles } = await import("@sylphx/code-core");
		const cwd = input?.cwd || process.cwd();
		const files = await scanFiles(cwd, input?.query);
		return { files };
	});

/**
 * Count tokens for file
 */
export const countFileTokens = query()
	.input(z.object({ filePath: z.string(), model: z.string().optional() }))
	.returns(z.object({
		success: z.boolean(),
		count: z.number().optional(),
		error: z.string().optional(),
	}))
	.resolve(async ({ input }) => {
		const { readFile } = await import("node:fs/promises");
		const { countTokens } = await import("@sylphx/code-core");
		try {
			const content = await readFile(input.filePath, "utf8");
			const count = await countTokens(content, input.model);
			return { success: true, count };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : "Failed to read file" };
		}
	});

// =============================================================================
// Bash Queries
// =============================================================================

/**
 * List all bash processes
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns initial bash process list
 * - Phase 2: .subscribe() uses delta emit for live updates
 *
 * Events: bash-created → emit.push(), bash-updated → emit.patch(), bash-completed → emit.patch()
 */
export const listBash = query()
	.returns([BashProcess])
	.resolve(async ({ ctx }) => ctx.appContext.bashManagerV2.list())
	.subscribe(({ ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, "bash-events", (payload) => {
			// Handle bash-created: push new process to list
			if (payload?.type === "bash-created" && payload.bash) {
				emit.push(payload.bash);
			}

			// Handle bash-updated: patch process in list
			if (payload?.type === "bash-updated" && payload.bash) {
				emit.patch([
					{ op: "replace", path: `/${payload.index}`, value: payload.bash },
				]);
			}

			// Handle bash-completed: patch process status
			if (payload?.type === "bash-completed" && payload.bashId) {
				emit.patch([
					{ op: "replace", path: `/${payload.index}/status`, value: "completed" },
					{ op: "replace", path: `/${payload.index}/exitCode`, value: payload.exitCode },
					{ op: "replace", path: `/${payload.index}/endTime`, value: payload.endTime },
				]);
			}
		});
		onCleanup(cleanup);
	});

/**
 * Get bash process info
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns initial bash state
 * - Phase 2: .subscribe() streams live output and status updates
 *
 * Events: bash-output → emit.patch() for stdout/stderr, bash-completed → emit.patch()
 */
export const getBash = query()
	.input(z.object({ bashId: z.string() }))
	.returns(BashProcess)
	.resolve(async ({ input, ctx }) => {
		const proc = ctx.appContext.bashManagerV2.get(input.bashId);
		if (!proc) {
			throw new Error(`Bash process not found: ${input.bashId}`);
		}
		return {
			id: proc.id,
			command: proc.command,
			mode: proc.mode,
			status: proc.status,
			isActive: ctx.appContext.bashManagerV2.getActiveBashId() === proc.id,
			startTime: proc.startTime,
			endTime: proc.endTime,
			exitCode: proc.exitCode,
			cwd: proc.cwd,
			duration: (proc.endTime || Date.now()) - proc.startTime,
			stdout: proc.stdout,
			stderr: proc.stderr,
		};
	})
	.subscribe(({ input, ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, `bash:${input.bashId}`, (payload) => {
			// Handle bash-output: append to stdout/stderr
			if (payload?.type === "bash-output") {
				if (payload.stream === "stdout" && payload.data) {
					emit.delta({ stdout: payload.data });
				}
				if (payload.stream === "stderr" && payload.data) {
					emit.delta({ stderr: payload.data });
				}
			}

			// Handle bash-completed: update status and exit info
			if (payload?.type === "bash-completed") {
				emit.patch([
					{ op: "replace", path: "/status", value: "completed" },
					{ op: "replace", path: "/exitCode", value: payload.exitCode },
					{ op: "replace", path: "/endTime", value: payload.endTime },
				]);
			}
		});
		onCleanup(cleanup);
	});

/**
 * Get active bash
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns current active bash (or null)
 * - Phase 2: .subscribe() updates when active bash changes
 *
 * Events: bash-activated → emit.replace(), bash-deactivated → emit.replace(null)
 */
export const getActiveBash = query()
	.returns(nullable(BashProcess))
	.resolve(async ({ ctx }) => {
		const activeBashId = ctx.appContext.bashManagerV2.getActiveBashId();
		if (!activeBashId) return null;
		const proc = ctx.appContext.bashManagerV2.get(activeBashId);
		if (!proc) return null;
		return {
			id: proc.id,
			command: proc.command,
			mode: proc.mode,
			status: proc.status,
			startTime: proc.startTime,
			cwd: proc.cwd,
			duration: (proc.endTime || Date.now()) - proc.startTime,
		};
	})
	.subscribe(({ ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, "bash-events", (payload) => {
			// Handle active bash change
			if (payload?.type === "bash-activated" && payload.bash) {
				emit.replace(payload.bash);
			}

			// Handle deactivation
			if (payload?.type === "bash-deactivated") {
				emit.replace(null);
			}
		});
		onCleanup(cleanup);
	});

// =============================================================================
// Model Detail Queries
// =============================================================================

/**
 * Get tokenizer info for a model
 * Returns tokenizer name and status
 */
export const getTokenizerInfo = query()
	.input(z.object({ model: z.string() }))
	.returns(z.object({
		name: z.string(),
		modelId: z.string(),
		source: z.string(),
	}))
	.resolve(async ({ input }) => {
		const { getTokenizerInfo: getInfo } = await import("@sylphx/code-core");
		return getInfo(input.model);
	});

/**
 * Get model details (context length, pricing, capabilities, etc.)
 */
export const getModelDetails = query()
	.input(z.object({
		providerId: z.string(),
		modelId: z.string(),
		cwd: z.string().optional(),
	}))
	.returns(z.object({
		success: z.boolean(),
		details: z.any().optional(),
		error: z.string().optional(),
	}))
	.resolve(async ({ input }) => {
		try {
			const { getProvider, loadAIConfig, getProviderConfigWithApiKey, enrichModelDetails, enrichCapabilities } = await import("@sylphx/code-core");
			const provider = getProvider(input.providerId as any);
			const cwd = input.cwd || process.cwd();

			// Try to get provider config with API key (optional)
			let config: any;
			try {
				const aiConfigResult = await loadAIConfig(cwd);
				if (aiConfigResult.success) {
					config = await getProviderConfigWithApiKey(aiConfigResult.data, input.providerId);
				}
			} catch {
				// Config not available - continue without it
			}

			// Get model details and capabilities from provider
			const details = await provider.getModelDetails(input.modelId, config);
			const providerCapabilities = provider.getModelCapabilities(input.modelId);

			// Enrich with models.dev fallback (fills missing fields)
			const enrichedDetails = await enrichModelDetails(input.modelId, details);

			// Fetch models.dev data for capabilities enrichment
			const modelsDevData = await fetch("https://models.dev/api.json", {
				signal: AbortSignal.timeout(10000),
			})
				.then((res) => (res.ok ? res.json() : null))
				.catch(() => null);

			const enrichedCapabilities = enrichCapabilities(
				input.modelId,
				providerCapabilities,
				modelsDevData,
			);

			return {
				success: true,
				details: {
					...enrichedDetails,
					capabilities: enrichedCapabilities,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to get model details",
			};
		}
	});

// =============================================================================
// Context Info Query
// =============================================================================

/**
 * Get detailed context usage information
 * Returns breakdown of tokens for system prompt, tools, and messages
 */
export const getContextInfo = query()
	.input(z.object({
		sessionId: z.string().nullable(),
		model: z.string(),
		agentId: z.string(),
		enabledRuleIds: z.array(z.string()),
	}))
	.returns(z.object({
		success: z.boolean(),
		error: z.string().optional(),
		systemPromptTokens: z.number(),
		systemPromptBreakdown: z.record(z.number()),
		toolsTokensTotal: z.number(),
		toolTokens: z.record(z.number()),
		messagesTokens: z.number(),
		toolCount: z.number(),
	}))
	.resolve(async ({ input, ctx }) => {
		try {
			const { countTokens, loadAllAgents, loadAllRules, getAISDKTools, buildSystemPrompt, TokenCalculator, DEFAULT_AGENT_ID } = await import("@sylphx/code-core");
			const cwd = process.cwd();

			// Load agents and rules
			const allAgents = await loadAllAgents(cwd);
			const allRules = await loadAllRules(cwd);
			const enabledRules = allRules.filter((rule: any) => input.enabledRuleIds.includes(rule.id));
			const tools = await getAISDKTools();

			// Find agent
			const agent = allAgents.find((a: any) => a.id === input.agentId) ||
				allAgents.find((a: any) => a.id === DEFAULT_AGENT_ID);

			// Calculate system prompt breakdown
			const systemPromptBreakdown: Record<string, number> = {};
			let systemPromptTokens = 0;

			if (agent) {
				const agentTokens = await countTokens(agent.systemPrompt, input.model);
				systemPromptBreakdown["Agent"] = agentTokens;
				systemPromptTokens += agentTokens;
			}

			for (const rule of enabledRules) {
				const ruleTokens = await countTokens((rule as any).content, input.model);
				systemPromptBreakdown[(rule as any).metadata?.name || rule.id] = ruleTokens;
				systemPromptTokens += ruleTokens;
			}

			// Calculate tool tokens breakdown
			const toolTokens: Record<string, number> = {};
			let toolsTokensTotal = 0;

			for (const [toolName, toolDef] of Object.entries(tools)) {
				const toolRepresentation = {
					name: toolName,
					description: (toolDef as any).description || "",
					parameters: (toolDef as any).parameters || {},
				};
				const toolJson = JSON.stringify(toolRepresentation, null, 0);
				const tokens = await countTokens(toolJson, input.model);
				toolTokens[toolName] = tokens;
				toolsTokensTotal += tokens;
			}

			// Calculate message tokens from session
			let messagesTokens = 0;
			if (input.sessionId) {
				const session = await ctx.db.session.findUnique({ where: { id: input.sessionId } });
				if (session) {
					// Use stored totalTokens if available (more accurate)
					// Subtract base context tokens (system + tools) to get messages only
					const baseContextTokens = systemPromptTokens + toolsTokensTotal;
					messagesTokens = Math.max(0, (session.totalTokens || 0) - baseContextTokens);
				}
			}

			return {
				success: true,
				systemPromptTokens,
				systemPromptBreakdown,
				toolsTokensTotal,
				toolTokens,
				messagesTokens,
				toolCount: Object.keys(tools).length,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to get context info",
				systemPromptTokens: 0,
				systemPromptBreakdown: {},
				toolsTokensTotal: 0,
				toolTokens: {},
				messagesTokens: 0,
				toolCount: 0,
			};
		}
	});

// =============================================================================
// Agent Queries
// =============================================================================

/**
 * List all available agents
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns all agents (builtin + custom)
 * - Phase 2: .subscribe() updates when agents change (file reload)
 *
 * Events: agents-reloaded → emit.replace()
 */
export const listAgents = query()
	.input(z.object({ cwd: z.string().optional() }).optional())
	.returns([Agent])
	.resolve(async ({ input }) => {
		const { loadAllAgents } = await import("@sylphx/code-core");
		const cwd = input?.cwd || process.cwd();
		const agents = await loadAllAgents(cwd);
		return agents.map((a: any) => ({
			id: a.id,
			name: a.metadata?.name || a.id,
			description: a.metadata?.description || "",
			systemPrompt: a.systemPrompt,
			isBuiltin: a.isBuiltin ?? false,
			filePath: a.filePath,
			defaultRuleIds: a.metadata?.defaultRuleIds,
		}));
	})
	.subscribe(({ ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, "config-events", (payload) => {
			if (payload?.type === "agents-reloaded" && payload.agents) {
				emit.replace(payload.agents);
			}
		});
		onCleanup(cleanup);
	});

/**
 * Get agent by ID
 */
export const getAgent = query()
	.input(z.object({ id: z.string(), cwd: z.string().optional() }))
	.returns(nullable(Agent))
	.resolve(async ({ input }) => {
		const { loadAllAgents } = await import("@sylphx/code-core");
		const cwd = input.cwd || process.cwd();
		const agents = await loadAllAgents(cwd);
		const agent = agents.find((a: any) => a.id === input.id);
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
	});

// =============================================================================
// Rule Queries
// =============================================================================

/**
 * List all available rules
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns all rules (builtin + custom)
 * - Phase 2: .subscribe() updates when rules change (file reload)
 *
 * Events: rules-reloaded → emit.replace()
 */
export const listRules = query()
	.input(z.object({ cwd: z.string().optional() }).optional())
	.returns([Rule])
	.resolve(async ({ input }) => {
		const { loadAllRules } = await import("@sylphx/code-core");
		const cwd = input?.cwd || process.cwd();
		const rules = await loadAllRules(cwd);
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
	})
	.subscribe(({ ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, "config-events", (payload) => {
			if (payload?.type === "rules-reloaded" && payload.rules) {
				emit.replace(payload.rules);
			}
		});
		onCleanup(cleanup);
	});

/**
 * Get rule by ID
 */
export const getRule = query()
	.input(z.object({ id: z.string(), cwd: z.string().optional() }))
	.returns(nullable(Rule))
	.resolve(async ({ input }) => {
		const { loadAllRules } = await import("@sylphx/code-core");
		const cwd = input.cwd || process.cwd();
		const rules = await loadAllRules(cwd);
		const rule = rules.find((r: any) => r.id === input.id);
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
	});

// =============================================================================
// Provider/Model Queries (Enhanced)
// =============================================================================

/**
 * List all providers with configuration status
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns all providers with status
 * - Phase 2: .subscribe() updates when provider config changes
 *
 * Events: config-reloaded → emit.replace()
 */
export const listProviders = query()
	.input(z.object({ cwd: z.string().optional() }).optional())
	.returns([Provider])
	.resolve(async ({ input }) => {
		const { AI_PROVIDERS, getProvider, loadAIConfig } = await import("@sylphx/code-core");
		const cwd = input?.cwd || process.cwd();
		const configResult = await loadAIConfig(cwd);
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
				modelCount: 0, // Will be populated when models are fetched
			});
		}
		return providers;
	})
	.subscribe(({ ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, "config-events", (payload) => {
			if (payload?.type === "config-reloaded" && payload.providers) {
				emit.replace(payload.providers);
			}
		});
		onCleanup(cleanup);
	});

/**
 * List models for a provider
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns models for provider
 * - Phase 2: .subscribe() updates when models fetched/refreshed
 */
export const listModels = query()
	.input(z.object({ providerId: z.string(), cwd: z.string().optional() }))
	.returns([Model])
	.resolve(async ({ input }) => {
		const { loadAIConfig, fetchModels: fetchModelsCore, getProvider } = await import("@sylphx/code-core");
		const cwd = input.cwd || process.cwd();

		try {
			const aiConfigResult = await loadAIConfig(cwd);
			if (!aiConfigResult.success) return [];

			const providerConfig = aiConfigResult.data.providers?.[input.providerId];
			if (!providerConfig) return [];

			const provider = getProvider(input.providerId as any);
			if (!provider.isConfigured(providerConfig)) return [];

			const models = await fetchModelsCore(input.providerId as any, providerConfig);
			return models.map((m: any) => ({
				id: m.id,
				name: m.name,
				providerId: input.providerId,
				contextLength: m.contextLength,
				inputPrice: m.inputPrice,
				outputPrice: m.outputPrice,
				supportsTools: m.supportsTools ?? true,
				supportsVision: m.supportsVision ?? false,
				supportsStreaming: m.supportsStreaming ?? true,
			}));
		} catch {
			return [];
		}
	})
	.subscribe(({ input, ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, `provider-models:${input.providerId}`, (payload) => {
			if (payload?.type === "models-fetched" && payload.models) {
				emit.replace(payload.models);
			}
		});
		onCleanup(cleanup);
	});

// =============================================================================
// Tool Queries
// =============================================================================

/**
 * List all available tools
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns all tools with enabled status
 * - Phase 2: .subscribe() updates when tool enabled/disabled
 *
 * Events: tool-toggled → emit.patch()
 */
export const listTools = query()
	.input(z.object({ source: z.string().optional() }).optional())
	.returns([Tool])
	.resolve(async ({ input, ctx }) => {
		// Use DB adapter to get tools
		return ctx.db.tool.findMany({
			where: input?.source ? { source: input.source } : undefined,
		});
	})
	.subscribe(({ ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, "tool-events", (payload) => {
			if (payload?.type === "tool-toggled" && payload.toolId !== undefined) {
				// Find index and patch enabled status
				emit.patch([
					{ op: "replace", path: `/${payload.index}/isEnabled`, value: payload.isEnabled },
				]);
			}
		});
		onCleanup(cleanup);
	});

// =============================================================================
// MCP Server Queries
// =============================================================================

/**
 * List all MCP servers
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns all MCP server configurations with status
 * - Phase 2: .subscribe() updates on connect/disconnect/status change
 *
 * Events: mcp-server-connected → emit.patch(), mcp-server-disconnected → emit.patch()
 */
export const listMcpServers = query()
	.input(z.object({ cwd: z.string().optional() }).optional())
	.returns([MCPServer])
	.resolve(async ({ input }) => {
		const { loadAIConfig } = await import("@sylphx/code-core");
		const cwd = input?.cwd || process.cwd();
		const configResult = await loadAIConfig(cwd);

		if (!configResult.success || !configResult.data.mcpServers) {
			return [];
		}

		const servers = [];
		for (const [name, config] of Object.entries(configResult.data.mcpServers)) {
			const serverConfig = config as any;
			servers.push({
				id: name,
				name,
				description: serverConfig.description,
				transportType: serverConfig.command ? "stdio" : "sse",
				status: "disconnected" as const,
				toolCount: 0,
				resourceCount: 0,
				promptCount: 0,
				enabled: serverConfig.enabled !== false,
			});
		}
		return servers;
	})
	.subscribe(({ ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, "mcp-events", (payload) => {
			if (payload?.type === "mcp-server-connected" && payload.serverId) {
				emit.patch([
					{ op: "replace", path: `/${payload.index}/status`, value: "connected" },
					{ op: "replace", path: `/${payload.index}/toolCount`, value: payload.toolCount ?? 0 },
					{ op: "replace", path: `/${payload.index}/connectedAt`, value: Date.now() },
				]);
			}

			if (payload?.type === "mcp-server-disconnected" && payload.serverId) {
				emit.patch([
					{ op: "replace", path: `/${payload.index}/status`, value: "disconnected" },
				]);
			}

			if (payload?.type === "mcp-server-error" && payload.serverId) {
				emit.patch([
					{ op: "replace", path: `/${payload.index}/status`, value: "error" },
					{ op: "replace", path: `/${payload.index}/error`, value: payload.error },
				]);
			}
		});
		onCleanup(cleanup);
	});

// =============================================================================
// Credential Queries
// =============================================================================

/**
 * List all stored credentials (keys only, not values)
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns credential metadata
 * - Phase 2: .subscribe() updates on create/delete
 *
 * Events: credential-created → emit.push(), credential-deleted → emit.pull()
 */
export const listCredentials = query()
	.input(z.object({ providerId: z.string().optional() }).optional())
	.returns([Credential])
	.resolve(async ({ input, ctx }) => {
		// Use DB adapter which masks API keys
		return ctx.db.credential.findMany({
			where: input?.providerId ? { providerId: input.providerId } : undefined,
		});
	})
	.subscribe(({ ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToChannel(ctx, "credential-events", (payload) => {
			if (payload?.type === "credential-created" && payload.credential) {
				emit.push(payload.credential);
			}

			if (payload?.type === "credential-deleted" && payload.credentialId) {
				emit.pull({ id: payload.credentialId });
			}
		});
		onCleanup(cleanup);
	});

// =============================================================================
// Ask Request Queries
// =============================================================================

/**
 * Get pending ask request for a session
 *
 * LIVE QUERY: Uses Two-Phase Field Resolution (ADR-002)
 * - Phase 1: .resolve() returns current pending ask request (if any)
 * - Phase 2: .subscribe() updates when ask is created or answered
 *
 * Events: ask-created → emit.replace(), ask-answered → emit.replace(null)
 */
export const getAskRequest = query()
	.input(z.object({ sessionId: z.string() }))
	.returns(nullable(AskRequest))
	.resolve(async ({ input, ctx }) => {
		// Get pending ask requests for this session
		const asks = await ctx.db.askRequest.findMany({
			where: { sessionId: input.sessionId, status: "pending" },
		});
		// Return the most recent pending ask request
		return asks.length > 0 ? asks[0] : null;
	})
	.subscribe(({ input, ctx }) => ({ emit, onCleanup }) => {
		const cleanup = subscribeToSessionStream(ctx, input.sessionId, (payload) => {
			if (payload?.type === "ask-created" && payload.askRequest) {
				emit.replace(payload.askRequest);
			}

			if (payload?.type === "ask-answered" && payload.askRequestId) {
				emit.replace(null);
			}
		});
		onCleanup(cleanup);
	});
