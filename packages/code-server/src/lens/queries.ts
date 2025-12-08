/**
 * Lens Query Definitions
 *
 * Queries are read-only operations. They can return single values or streams.
 * All queries support field selection via .select() on client.
 *
 * Streaming queries use async generators - each yield pushes to client.
 */

import { query } from "@sylphx/lens-core";
import { z } from "zod";
import { Session, Message, Step, Part, Todo } from "./entities.js";
import type { LensContext } from "./context.js";

// =============================================================================
// Session Queries
// =============================================================================

/**
 * Get session by ID
 */
export const getSession = query()
	.input(z.object({ id: z.string() }))
	.returns(Session)
	.resolve(async ({ input, ctx }: { input: { id: string }; ctx: LensContext }) => {
		return ctx.db.session.findUnique({ where: { id: input.id } });
	});

/**
 * List all sessions (ordered by updatedAt desc)
 */
export const listSessions = query()
	.input(
		z
			.object({
				limit: z.number().optional(),
				cursor: z.number().optional(), // Unix timestamp for pagination
			})
			.optional(),
	)
	.returns([Session])
	.resolve(async ({ input, ctx }: { input?: { limit?: number; cursor?: number }; ctx: LensContext }) => {
		const limit = input?.limit ?? 50;
		const cursor = input?.cursor;

		return ctx.db.session.findMany({
			where: cursor ? { updatedAt: { lt: cursor } } : undefined,
			orderBy: { updatedAt: "desc" },
			take: limit,
		});
	});

/**
 * Get last session (for headless mode)
 */
export const getLastSession = query()
	.returns(Session)
	.resolve(async ({ ctx }: { ctx: LensContext }) => {
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
	.input(
		z.object({
			query: z.string(),
			limit: z.number().optional(),
		}),
	)
	.returns([Session])
	.resolve(async ({ input, ctx }: { input: { query: string; limit?: number }; ctx: LensContext }) => {
		return ctx.db.session.findMany({
			where: {
				title: { contains: input.query },
			},
			orderBy: { updatedAt: "desc" },
			take: input.limit ?? 20,
		});
	});

/**
 * Get session count
 */
export const getSessionCount = query()
	.returns(z.number())
	.resolve(async ({ ctx }: { ctx: LensContext }) => {
		return ctx.db.session.count();
	});

// =============================================================================
// Message Queries
// =============================================================================

/**
 * Get message by ID
 */
export const getMessage = query()
	.input(z.object({ id: z.string() }))
	.returns(Message)
	.resolve(async ({ input, ctx }: { input: { id: string }; ctx: LensContext }) => {
		return ctx.db.message.findUnique({ where: { id: input.id } });
	});

/**
 * List messages for a session with nested steps and parts
 *
 * Returns SessionMessage[] format from getSessionMessages, then transforms
 * to wire format expected by client.
 */
export const listMessages = query()
	.input(
		z.object({
			sessionId: z.string(),
			limit: z.number().optional(),
		}),
	)
	.returns(z.array(z.object({
		id: z.string(),
		sessionId: z.string(),
		role: z.string(),
		timestamp: z.number(),
		ordering: z.number(),
		status: z.string(),
		steps: z.array(z.object({
			id: z.string(),
			messageId: z.string(),
			stepIndex: z.number(),
			status: z.string(),
			parts: z.array(z.object({
				id: z.string(),
				stepId: z.string(),
				ordering: z.number(),
				type: z.string(),
				content: z.unknown(),
			})),
		})),
	})))
	.resolve(async ({ input, ctx }: { input: { sessionId: string; limit?: number }; ctx: LensContext }) => {
		// getSessionMessages returns SessionMessage[] (domain objects)
		const messages = await ctx.db.message.findMany({
			where: { sessionId: input.sessionId },
		});

		// Apply limit
		const limited = input.limit ? messages.slice(0, input.limit) : messages;

		// Transform to wire format expected by client
		return limited.map((msg: any, msgIndex: number) => ({
			id: msg.id,
			sessionId: input.sessionId,
			role: msg.role,
			timestamp: msg.timestamp || Date.now(),
			ordering: msgIndex,
			status: msg.status || "completed",
			steps: (msg.steps || []).map((step: any, stepIndex: number) => ({
				id: step.id,
				messageId: msg.id,
				stepIndex: step.stepIndex ?? stepIndex,
				status: step.status || "completed",
				parts: (step.parts || []).map((part: any, partIndex: number) => ({
					id: `${step.id}-part-${partIndex}`,
					stepId: step.id,
					ordering: partIndex,
					type: part.type,
					// Wrap the part as content for client's convertPart function
					content: part,
				})),
			})),
		}));
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
	.resolve(async ({ input, ctx }: { input?: { limit?: number }; ctx: LensContext }) => {
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
	.returns(Step)
	.resolve(async ({ input, ctx }: { input: { id: string }; ctx: LensContext }) => {
		return ctx.db.step.findUnique({ where: { id: input.id } });
	});

/**
 * List steps for a message
 */
export const listSteps = query()
	.input(z.object({ messageId: z.string() }))
	.returns([Step])
	.resolve(async ({ input, ctx }: { input: { messageId: string }; ctx: LensContext }) => {
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
	.returns(Part)
	.resolve(async ({ input, ctx }: { input: { id: string }; ctx: LensContext }) => {
		return ctx.db.part.findUnique({ where: { id: input.id } });
	});

/**
 * List parts for a step
 */
export const listParts = query()
	.input(z.object({ stepId: z.string() }))
	.returns([Part])
	.resolve(async ({ input, ctx }: { input: { stepId: string }; ctx: LensContext }) => {
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
 */
export const listTodos = query()
	.input(z.object({ sessionId: z.string() }))
	.returns([Todo])
	.resolve(async ({ input, ctx }: { input: { sessionId: string }; ctx: LensContext }) => {
		return ctx.db.todo.findMany({
			where: { sessionId: input.sessionId },
			orderBy: { ordering: "asc" },
		});
	});

// =============================================================================
// Streaming Queries (Real-time subscriptions)
// =============================================================================

/**
 * Subscribe to session updates
 *
 * Uses async generator - yields on every update.
 * Client receives updates in real-time via WebSocket.
 */
export const subscribeSession = query()
	.input(z.object({ id: z.string() }))
	.returns(Session)
	.resolve(async function* ({ input, ctx }: { input: { id: string }; ctx: LensContext }) {
		// Yield initial data
		const session = await ctx.db.session.findUnique({ where: { id: input.id } });
		if (session) {
			yield session;
		}

		// Subscribe to updates
		const channel = `session:${input.id}`;
		for await (const event of ctx.eventStream.subscribe(channel)) {
			// Event payload is the session entity
			if (event.payload && event.payload.id) {
				yield event.payload;
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
	.resolve(async function* ({ ctx }: { ctx: LensContext }) {
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
	.resolve(async function* ({ input, ctx }: { input: { sessionId: string; replayLast: number }; ctx: LensContext }) {
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
	.resolve(async ({ input }: { input?: { cwd?: string } }) => {
		const { loadAIConfig } = await import("@sylphx/code-core");
		const cwd = input?.cwd || process.cwd();
		const result = await loadAIConfig(cwd);
		if (result.success) {
			// Sanitize config (remove secrets)
			const { sanitizeAIConfig } = await import("./config-utils.js");
			const sanitizedConfig = sanitizeAIConfig(result.data);
			return { success: true, config: sanitizedConfig };
		}
		return { success: true, config: { providers: {} } };
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
	.resolve(async ({ input }: { input?: { cwd?: string } }) => {
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
	.resolve(async ({ input }: { input: { providerId: string } }) => {
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
	.resolve(async ({ input }: { input: { providerId: string; cwd?: string } }) => {
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
	.resolve(async ({ input }: { input?: { cwd?: string; query?: string } }) => {
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
	.resolve(async ({ input }: { input: { filePath: string; model?: string } }) => {
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
 */
export const listBash = query()
	.returns(z.array(z.any()))
	.resolve(async ({ ctx }: { ctx: LensContext }) => {
		return ctx.appContext.bashManagerV2.list();
	});

/**
 * Get bash process info
 */
export const getBash = query()
	.input(z.object({ bashId: z.string() }))
	.returns(z.any())
	.resolve(async ({ input, ctx }: { input: { bashId: string }; ctx: LensContext }) => {
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
	});

/**
 * Get active bash
 */
export const getActiveBash = query()
	.returns(z.any().nullable())
	.resolve(async ({ ctx }: { ctx: LensContext }) => {
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
	.resolve(async ({ input }: { input: { model: string } }) => {
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
	.resolve(async ({ input }: { input: { providerId: string; modelId: string; cwd?: string } }) => {
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
