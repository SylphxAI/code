/**
 * Lens Mutation Definitions
 *
 * Mutations are write operations. Key features:
 * - Auto-optimistic from naming convention (createX, updateX, deleteX)
 * - Streaming via async generators (yield updates to client)
 * - Type-safe input validation with Zod
 *
 * The sendMessage mutation is the core of AI interaction:
 * 1. Creates user message
 * 2. Creates assistant message placeholder
 * 3. Streams AI response (each yield pushes to client)
 * 4. Handles tool calls, errors, abort
 */

import { mutation } from "./builders.js";
import { z } from "zod";
import { Session, Message, Todo } from "./entities.js";
import type { LensContext } from "./context.js";
import { calculateBaseContextTokens, createLogger } from "@sylphx/code-core";
import type { AppContext } from "../context.js";

const log = createLogger("lens:mutations");

// =============================================================================
// Input Schemas
// =============================================================================

const ContentPartSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("text"),
		content: z.string(),
	}),
	z.object({
		type: z.literal("file"),
		fileId: z.string(),
		relativePath: z.string(),
		size: z.number(),
		mimeType: z.string(),
	}),
]);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Async calculate base context tokens and emit update
 * Fire-and-forget: called after session creation to update token counts
 */
async function calculateBaseContextTokensAsync(
	sessionId: string,
	modelName: string,
	agentId: string,
	enabledRuleIds: string[],
	appContext: AppContext,
): Promise<void> {
	log("calculateBaseContextTokensAsync START sessionId=%s model=%s agentId=%s",
		sessionId, modelName, agentId);

	const cwd = process.cwd();

	// Calculate base context tokens (system prompt + tools)
	const baseContextTokens = await calculateBaseContextTokens(
		modelName,
		agentId,
		enabledRuleIds,
		cwd,
	);
	log("calculateBaseContextTokensAsync baseContextTokens=%d", baseContextTokens);

	// totalTokens = baseContext (no messages yet)
	const totalTokens = baseContextTokens;

	// Persist to database
	log("calculateBaseContextTokensAsync PERSIST to database...");
	await appContext.database.getSessionRepository().updateSessionTokens(sessionId, {
		baseContextTokens,
		totalTokens,
	});
	log("calculateBaseContextTokensAsync PERSIST SUCCESS");

	// Emit event for live query subscribers
	const channel = `session-stream:${sessionId}`;
	const event = {
		type: "session-tokens-updated",
		sessionId,
		totalTokens,
		baseContextTokens,
	};
	log("calculateBaseContextTokensAsync EMIT channel=%s event=%o", channel, event);
	await appContext.eventStream.publish(channel, event);
	log("calculateBaseContextTokensAsync EMIT SUCCESS");

	log("calculateBaseContextTokensAsync END totalTokens=%d", totalTokens);
}

// =============================================================================
// Session Mutations
// =============================================================================

/**
 * Create a new session
 *
 * Optimistic: Client immediately sees new session via .optimistic("create")
 * Live: Publishes session-created event for listSessions subscribers
 *
 * After creation, async calculates base context tokens so StatusBar
 * shows context usage even before first message is sent.
 */
export const createSession = mutation()
	.args(
		z.object({
			title: z.string().optional(),
			agentId: z.string().optional(),
			modelId: z.string().optional(),
			provider: z.string().optional(),
			model: z.string().optional(),
			enabledRuleIds: z.array(z.string()).optional(),
		}),
	)
	.returns(Session)
	.optimistic("create")
	.resolve(async ({ args, ctx }: { args: { title?: string; agentId?: string; modelId?: string; provider?: string; model?: string; enabledRuleIds?: string[] }; ctx: LensContext }) => {
		const now = Date.now();
		const sessionId = crypto.randomUUID();

		const agentId = args.agentId || "coder";
		const modelName = args.model;
		const enabledRuleIds = args.enabledRuleIds || [];

		const session = await ctx.db.session.create({
			data: {
				id: sessionId,
				title: args.title || "New Chat",
				agentId,
				modelId: args.modelId,
				provider: args.provider,
				model: modelName,
				enabledRuleIds,
				nextTodoId: 1,
				created: now,
				updated: now,
			},
		});

		// Publish event for live query subscribers
		await ctx.eventStream.publish("session-events", {
			type: "session-created",
			session,
		});

		// Async calculate base context tokens (fire-and-forget)
		// This allows StatusBar to show context usage before first message
		if (modelName) {
			calculateBaseContextTokensAsync(
				sessionId,
				modelName,
				agentId,
				enabledRuleIds,
				ctx.appContext,
			).catch((err) => {
				console.error("[createSession] Failed to calculate base context tokens:", err);
			});
		}

		return session;
	});

/**
 * Update session
 *
 * Optimistic: Client immediately sees changes via .optimistic("merge")
 * Live: Publishes session-updated event for listSessions subscribers
 */
export const updateSession = mutation()
	.args(
		z.object({
			id: z.string(),
			title: z.string().optional(),
			agentId: z.string().optional(),
			modelId: z.string().optional(),
			provider: z.string().optional(),
			model: z.string().optional(),
			enabledRuleIds: z.array(z.string()).optional(),
		}),
	)
	.returns(Session)
	.optimistic("merge")
	.resolve(async ({ args, ctx }: { args: { id: string; title?: string; agentId?: string; modelId?: string; provider?: string; model?: string; enabledRuleIds?: string[] }; ctx: LensContext }) => {
		const { id, ...data } = input;

		const session = await ctx.db.session.update({
			where: { id },
			data: {
				...data,
				updated: Date.now(),
			},
		});

		// Publish event for live query subscribers
		// Global channel for listSessions
		await ctx.eventStream.publish("session-events", {
			type: "session-updated",
			session,
		});
		// Per-session channel for Session.status and subscribeSession
		await ctx.eventStream.publish(`session-stream:${id}`, {
			type: "session-updated",
			session,
		});

		return session;
	});

/**
 * Delete session
 *
 * Optimistic: Client immediately removes session via .optimistic("delete")
 * Live: Publishes session-deleted event for listSessions subscribers
 */
export const deleteSession = mutation()
	.args(z.object({ id: z.string() }))
	.returns(Session)
	.optimistic("delete")
	.resolve(async ({ args, ctx }: { args: { id: string }; ctx: LensContext }) => {
		const session = await ctx.db.session.delete({ where: { id: args.id } });

		// Publish event for live query subscribers
		await ctx.eventStream.publish("session-events", {
			type: "session-deleted",
			sessionId: args.id,
		});

		return session;
	});

// =============================================================================
// Message Mutations (THE CORE!)
// =============================================================================

/**
 * Send message and stream AI response
 *
 * This is the main mutation for AI interaction.
 * Uses async generator for real-time streaming:
 *
 * 1. Create user message
 * 2. Create assistant message placeholder
 * 3. Yield initial state (optimistic confirmed)
 * 4. Stream AI response - yield on every update
 * 5. Handle tool calls, errors, abort
 *
 * Client subscribes and receives updates in real-time:
 * ```typescript
 * api.mutations.sendMessage(input).subscribe(({ assistantMessage }) => {
 *   // Called on every yield - content updates in real-time!
 *   console.log(assistantMessage.steps[0].parts)
 * })
 * ```
 */
export const sendMessage = mutation()
	.args(
		z.object({
			sessionId: z.string().nullable().optional(),
			content: z.array(ContentPartSchema),
			agentId: z.string().optional(),
			provider: z.string().optional(),
			model: z.string().optional(),
		}),
	)
	.returns(
		z.object({
			session: Session,
			userMessage: Message,
			assistantMessage: Message,
		}),
	)
	// Note: Complex multi-entity optimistic updates not yet supported with new API
	// Server will return actual data which client will use
	.resolve(async function* ({ args, ctx }: { args: { sessionId?: string | null; content: any[]; agentId?: string; provider?: string; model?: string }; ctx: LensContext }) {
		// Import streaming service and config loader
		const { triggerStreamMutation } = await import(
			"../services/streaming-mutations.service.js"
		);
		const { loadAIConfig } = await import("@sylphx/code-core");

		// Load aiConfig from disk
		let aiConfig: any = { providers: {} };
		try {
			const result = await loadAIConfig();
			if (result.success) {
				aiConfig = result.data;
			}
		} catch (error) {
			console.error("[sendMessage] Failed to load AI config:", error);
		}

		// Get or create session
		let session: any;
		let sessionId = args.sessionId;

		if (!sessionId) {
			// Get default provider/model from aiConfig
			let defaultProvider = args.provider;
			let defaultModel = args.model;

			if (!defaultProvider && aiConfig?.providers) {
				// Find first configured provider
				const configuredProviders = Object.entries(aiConfig.providers)
					.filter(([_, config]) => config && (config as any).apiKey)
					.map(([id]) => id);
				defaultProvider = aiConfig.defaultProvider || configuredProviders[0];
			}

			if (!defaultModel && defaultProvider && aiConfig?.providers?.[defaultProvider]) {
				const providerConfig = aiConfig.providers[defaultProvider] as any;
				defaultModel = providerConfig.defaultModel || providerConfig.model;
			}

			// Create new session
			session = await ctx.db.session.create({
				data: {
					id: crypto.randomUUID(),
					title: "New Chat",
					agentId: args.agentId || "coder",
					provider: defaultProvider,
					model: defaultModel,
					enabledRuleIds: [],
					nextTodoId: 1,
					created: Date.now(),
					updated: Date.now(),
				},
			});
			sessionId = session.id;
		} else {
			session = await ctx.db.session.findUnique({ where: { id: sessionId } });
		}

		// Get message count for ordering
		const existingMessages = await ctx.db.message.findMany({
			where: { sessionId },
		});
		const nextOrdering = existingMessages.length;

		// Create user message
		const userMessageId = crypto.randomUUID();
		const userMessage = await ctx.db.message.create({
			data: {
				id: userMessageId,
				sessionId,
				role: "user",
				timestamp: Date.now(),
				ordering: nextOrdering,
				status: "completed",
			},
		});

		// Create user step with content
		const userStepId = crypto.randomUUID();
		await ctx.db.step.create({
			data: {
				id: userStepId,
				messageId: userMessageId,
				stepIndex: 0,
				status: "completed",
			},
		});

		// Create user parts
		for (let i = 0; i < args.content.length; i++) {
			const part = args.content[i];
			await ctx.db.part.create({
				data: {
					id: crypto.randomUUID(),
					stepId: userStepId,
					ordering: i,
					type: part.type,
					content: part,
				},
			});
		}

		// Create assistant message placeholder
		const assistantMessageId = crypto.randomUUID();
		const assistantMessage = await ctx.db.message.create({
			data: {
				id: assistantMessageId,
				sessionId,
				role: "assistant",
				timestamp: Date.now(),
				ordering: nextOrdering + 1,
				status: "active",
			},
		});

		// Yield initial state
		yield {
			session,
			userMessage,
			assistantMessage,
		};

		// Start AI streaming
		// This uses the existing streaming infrastructure
		try {
			const result = await triggerStreamMutation({
				appContext: ctx.appContext,
				sessionRepository: ctx.appContext.database.getRepository(),
				messageRepository: ctx.appContext.database.getMessageRepository(),
				aiConfig,
				input: {
					sessionId,
					agentId: args.agentId,
					provider: args.provider,
					model: args.model,
					content: args.content as any,
				},
			});

			// The streaming service handles the actual AI interaction
			// and publishes events to session-stream:${sessionId}
			// We don't need to stream here because the client subscribes
			// to session updates via subscribeSession query

			// Yield final state
			const finalAssistantMessage = await ctx.db.message.findUnique({
				where: { id: assistantMessageId },
			});

			yield {
				session: await ctx.db.session.findUnique({ where: { id: sessionId } }),
				userMessage,
				assistantMessage: finalAssistantMessage || assistantMessage,
			};
		} catch (error) {
			// Update assistant message to error state
			await ctx.db.message.update({
				where: { id: assistantMessageId },
				data: { status: "error" },
			});

			throw error;
		}
	});

/**
 * Abort current stream
 *
 * Live: Publishes stream-aborted event for session subscribers
 */
export const abortStream = mutation()
	.args(z.object({ sessionId: z.string() }))
	.returns(z.object({ success: z.boolean() }))
	.resolve(async ({ args, ctx }: { args: { sessionId: string }; ctx: LensContext }) => {
		const { abortStreamMutation } = await import(
			"../services/streaming-mutations.service.js"
		);

		const success = abortStreamMutation(args.sessionId);

		if (success) {
			// Publish event for live query subscribers
			await ctx.eventStream.publish(`session-stream:${args.sessionId}`, {
				type: "stream-aborted",
				sessionId: args.sessionId,
			});
		}

		return { success };
	});

// =============================================================================
// Todo Mutations
// =============================================================================

/**
 * Create todo
 *
 * Optimistic: Client immediately sees new todo via .optimistic("create")
 * Live: Publishes todo-created event for listTodos subscribers
 */
export const createTodo = mutation()
	.args(
		z.object({
			sessionId: z.string(),
			content: z.string(),
			activeForm: z.string(),
			status: z.enum(["pending", "in_progress", "completed"]).optional(),
		}),
	)
	.returns(Todo)
	.optimistic("create")
	.resolve(async ({ args, ctx }: { args: { sessionId: string; content: string; activeForm: string; status?: "pending" | "in_progress" | "completed" }; ctx: LensContext }) => {
		// Get next todo ID
		const session = await ctx.db.session.findUnique({
			where: { id: args.sessionId },
		});
		const todoId = session?.nextTodoId || 1;

		// Create todo
		const todo = await ctx.db.todo.create({
			data: {
				id: todoId,
				sessionId: args.sessionId,
				content: args.content,
				activeForm: args.activeForm,
				status: args.status || "pending",
				ordering: todoId,
				created: Date.now(),
			},
		});

		// Increment session's nextTodoId
		await ctx.db.session.update({
			where: { id: args.sessionId },
			data: { nextTodoId: todoId + 1 },
		});

		// Publish event for live query subscribers
		await ctx.eventStream.publish(`session-stream:${args.sessionId}`, {
			type: "todo-created",
			todo,
		});

		return todo;
	});

/**
 * Update todo
 *
 * Optimistic: Client immediately sees changes via .optimistic("merge")
 * Live: Publishes todo-updated event for listTodos subscribers
 */
export const updateTodo = mutation()
	.args(
		z.object({
			sessionId: z.string(),
			id: z.number(),
			content: z.string().optional(),
			activeForm: z.string().optional(),
			status: z.enum(["pending", "in_progress", "completed"]).optional(),
		}),
	)
	.returns(Todo)
	.optimistic("merge")
	.resolve(async ({ args, ctx }: { args: { sessionId: string; id: number; content?: string; activeForm?: string; status?: "pending" | "in_progress" | "completed" }; ctx: LensContext }) => {
		const { sessionId, id, ...data } = input;

		const updateData: any = { ...data };
		if (data.status === "completed") {
			updateData.completedAt = Date.now();
		}

		const todo = await ctx.db.todo.update({
			where: { sessionId, id },
			data: updateData,
		});

		// Publish event for live query subscribers
		await ctx.eventStream.publish(`session-stream:${sessionId}`, {
			type: "todo-updated",
			todo,
		});

		return todo;
	});

/**
 * Delete todo
 *
 * Optimistic: Client immediately removes todo via .optimistic("delete")
 * Live: Publishes todo-deleted event for listTodos subscribers
 */
export const deleteTodo = mutation()
	.args(
		z.object({
			sessionId: z.string(),
			id: z.number(),
		}),
	)
	.returns(Todo)
	.optimistic("delete")
	.resolve(async ({ args, ctx }: { args: { sessionId: string; id: number }; ctx: LensContext }) => {
		// Get todo before deletion for return value
		const todo = await ctx.db.todo.findUnique({
			where: { sessionId: args.sessionId, id: args.id },
		});

		if (!todo) {
			throw new Error(`Todo not found: ${args.sessionId}/${args.id}`);
		}

		await ctx.db.todo.delete({
			where: { sessionId: args.sessionId, id: args.id },
		});

		// Publish event for live query subscribers
		await ctx.eventStream.publish(`session-stream:${args.sessionId}`, {
			type: "todo-deleted",
			todoId: args.id,
		});

		return todo;
	});

/**
 * Batch update todos (for todo list sync)
 *
 * Optimistic: Uses "merge" strategy - client applies input changes immediately
 * Live: Publishes todos-synced event for listTodos subscribers (full replacement)
 *
 * Note: For complex batch operations, Reify DSL would provide finer control,
 * but the simple "merge" sugar works well for todo sync where client
 * already has the complete new state in args.
 */
export const syncTodos = mutation()
	.args(
		z.object({
			sessionId: z.string(),
			todos: z.array(
				z.object({
					id: z.number().optional(), // undefined = create new
					content: z.string(),
					activeForm: z.string(),
					status: z.enum(["pending", "in_progress", "completed"]),
				}),
			),
		}),
	)
	.returns([Todo])
	// Use merge strategy - client optimistically applies the todo list update
	.optimistic("merge")
	.resolve(async ({ args, ctx }: { args: { sessionId: string; todos: { id?: number; content: string; activeForm: string; status: "pending" | "in_progress" | "completed" }[] }; ctx: LensContext }) => {
		const results: any[] = [];

		// Get current session
		const session = await ctx.db.session.findUnique({
			where: { id: args.sessionId },
		});
		let nextId = session?.nextTodoId || 1;

		for (let i = 0; i < args.todos.length; i++) {
			const todo = args.todos[i];

			if (todo.id) {
				// Update existing
				const updated = await ctx.db.todo.update({
					where: { sessionId: args.sessionId, id: todo.id },
					data: {
						content: todo.content,
						activeForm: todo.activeForm,
						status: todo.status,
						ordering: i,
						completedAt: todo.status === "completed" ? Date.now() : undefined,
					},
				});
				results.push(updated);
			} else {
				// Create new
				const created = await ctx.db.todo.create({
					data: {
						id: nextId,
						sessionId: args.sessionId,
						content: todo.content,
						activeForm: todo.activeForm,
						status: todo.status,
						ordering: i,
						created: Date.now(),
					},
				});
				results.push(created);
				nextId++;
			}
		}

		// Update session's nextTodoId
		await ctx.db.session.update({
			where: { id: args.sessionId },
			data: { nextTodoId: nextId },
		});

		// Publish event for live query subscribers (full list replacement)
		await ctx.eventStream.publish(`session-stream:${args.sessionId}`, {
			type: "todos-synced",
			todos: results,
		});

		return results;
	});

// =============================================================================
// Config Mutations
// =============================================================================

/**
 * Save AI config
 *
 * Live: Publishes config-saved event for config subscribers
 */
export const saveConfig = mutation()
	.args(z.object({
		config: z.any(),
		cwd: z.string().optional(),
	}))
	.returns(z.object({ success: z.boolean(), error: z.string().optional() }))
	.resolve(async ({ args, ctx }: { args: { config: any; cwd?: string }; ctx: LensContext }) => {
		const { loadAIConfig, saveAIConfig } = await import("@sylphx/code-core");
		const { mergeConfigWithSecrets } = await import("./config-utils.js");
		const cwd = args.cwd || process.cwd();

		// Load current config to preserve secrets
		const currentResult = await loadAIConfig(cwd);
		const currentConfig = currentResult.success ? currentResult.data : { providers: {} };

		// Merge with secrets preserved
		const mergedConfig = mergeConfigWithSecrets(args.config, currentConfig);

		const result = await saveAIConfig(mergedConfig, cwd);
		if (result.success) {
			// Publish event for live query subscribers
			await ctx.eventStream.publish("config-events", {
				type: "config-saved",
				config: mergedConfig,
			});
			return { success: true };
		}
		return { success: false, error: result.error.message };
	});

/**
 * Set provider secret (API key)
 *
 * Live: Publishes credential-updated event for credential subscribers
 */
export const setProviderSecret = mutation()
	.args(z.object({
		providerId: z.string(),
		fieldName: z.string(),
		value: z.string(),
		cwd: z.string().optional(),
	}))
	.returns(z.object({ success: z.boolean(), error: z.string().optional() }))
	.resolve(async ({ args, ctx }: { args: { providerId: string; fieldName: string; value: string; cwd?: string }; ctx: LensContext }) => {
		const { loadAIConfig, saveAIConfig, getProvider, createCredential, getDefaultCredential, updateCredential } = await import("@sylphx/code-core");
		const cwd = args.cwd || process.cwd();

		const result = await loadAIConfig(cwd);
		if (!result.success) {
			return { success: false, error: result.error.message };
		}

		// Verify field is a secret field
		try {
			const provider = getProvider(args.providerId as any);
			const configSchema = provider.getConfigSchema();
			const field = configSchema.find(f => f.key === args.fieldName);

			if (!field) {
				return { success: false, error: `Field ${args.fieldName} not found` };
			}
			if (!field.secret) {
				return { success: false, error: `Field ${args.fieldName} is not a secret field` };
			}
		} catch (_error) {
			return { success: false, error: `Provider ${args.providerId} not found` };
		}

		// Create or update credential
		const credential = getDefaultCredential(args.providerId) ||
			createCredential({
				providerId: args.providerId,
				label: `${args.providerId} API key`,
				apiKey: args.value,
				scope: "global",
				isDefault: true,
			});

		if (!credential.isDefault) {
			updateCredential(credential.id, { apiKey: args.value });
		}

		// Update provider config
		const currentProviderConfig = result.data.providers?.[args.providerId] || {};
		const { apiKey: _removed, ...configWithoutApiKey } = currentProviderConfig;
		const updatedProviderConfig = {
			...configWithoutApiKey,
			credentialId: credential.id,
		};

		const updated = {
			...result.data,
			providers: {
				...result.data.providers,
				[args.providerId]: updatedProviderConfig,
			},
		};

		const saveResult = await saveAIConfig(updated, cwd);
		if (saveResult.success) {
			// Publish event for live query subscribers
			await ctx.eventStream.publish("credential-events", {
				type: "credential-updated",
				providerId: args.providerId,
				credentialId: credential.id,
			});
			return { success: true };
		}
		return { success: false, error: saveResult.error.message };
	});

// =============================================================================
// Bash Mutations
// =============================================================================

/**
 * Execute bash command
 *
 * Live: Publishes bash-created event for listBash subscribers
 */
export const executeBash = mutation()
	.args(z.object({
		command: z.string(),
		mode: z.enum(["active", "background"]).optional(),
		cwd: z.string().optional(),
		timeout: z.number().optional(),
	}))
	.returns(z.object({
		bashId: z.string(),
		command: z.string(),
		mode: z.string(),
	}))
	.resolve(async ({ args, ctx }: { args: { command: string; mode?: "active" | "background"; cwd?: string; timeout?: number }; ctx: LensContext }) => {
		const bashId = await ctx.appContext.bashManagerV2.execute(args.command, {
			mode: args.mode || "active",
			cwd: args.cwd,
			timeout: args.timeout,
		});

		const bash = {
			bashId,
			command: args.command,
			mode: args.mode || "active",
		};

		// Publish event for live query subscribers
		await ctx.eventStream.publish("bash-events", {
			type: "bash-created",
			bash: {
				id: bashId,
				command: args.command,
				mode: args.mode || "active",
				status: "running",
				startTime: Date.now(),
				cwd: args.cwd || process.cwd(),
			},
		});

		// If active, also publish activation event
		if (args.mode !== "background") {
			await ctx.eventStream.publish("bash-events", {
				type: "bash-activated",
				bash: {
					id: bashId,
					command: args.command,
					mode: "active",
					status: "running",
					startTime: Date.now(),
					cwd: args.cwd || process.cwd(),
				},
			});
		}

		return bash;
	});

/**
 * Kill bash process
 *
 * Live: Publishes bash-completed event for listBash/getBash subscribers
 */
export const killBash = mutation()
	.args(z.object({ bashId: z.string() }))
	.returns(z.object({ success: z.boolean(), bashId: z.string() }))
	.resolve(async ({ args, ctx }: { args: { bashId: string }; ctx: LensContext }) => {
		const success = ctx.appContext.bashManagerV2.kill(args.bashId);
		if (!success) {
			throw new Error(`Failed to kill bash process: ${args.bashId}`);
		}

		// Publish event for live query subscribers
		await ctx.eventStream.publish("bash-events", {
			type: "bash-completed",
			bashId: args.bashId,
			exitCode: -1, // Killed
			endTime: Date.now(),
		});

		await ctx.eventStream.publish(`bash:${args.bashId}`, {
			type: "bash-completed",
			bashId: args.bashId,
			exitCode: -1,
			endTime: Date.now(),
		});

		return { success: true, bashId: args.bashId };
	});

/**
 * Demote active bash to background
 *
 * Live: Publishes bash-deactivated event for getActiveBash subscribers
 */
export const demoteBash = mutation()
	.args(z.object({ bashId: z.string() }))
	.returns(z.object({ success: z.boolean(), bashId: z.string(), mode: z.string() }))
	.resolve(async ({ args, ctx }: { args: { bashId: string }; ctx: LensContext }) => {
		const success = ctx.appContext.bashManagerV2.demote(args.bashId);
		if (!success) {
			throw new Error(`Failed to demote bash: ${args.bashId}`);
		}

		// Publish event for live query subscribers
		await ctx.eventStream.publish("bash-events", {
			type: "bash-deactivated",
			bashId: args.bashId,
		});

		return { success: true, bashId: args.bashId, mode: "background" };
	});

/**
 * Promote background bash to active
 *
 * Live: Publishes bash-activated event for getActiveBash subscribers
 */
export const promoteBash = mutation()
	.args(z.object({ bashId: z.string() }))
	.returns(z.object({ success: z.boolean(), bashId: z.string(), mode: z.string() }))
	.resolve(async ({ args, ctx }: { args: { bashId: string }; ctx: LensContext }) => {
		const success = await ctx.appContext.bashManagerV2.promote(args.bashId);
		if (!success) {
			throw new Error(`Failed to promote bash: ${args.bashId}`);
		}

		// Get bash details for event
		const proc = ctx.appContext.bashManagerV2.get(args.bashId);

		// Publish event for live query subscribers
		await ctx.eventStream.publish("bash-events", {
			type: "bash-activated",
			bash: proc ? {
				id: proc.id,
				command: proc.command,
				mode: "active",
				status: proc.status,
				startTime: proc.startTime,
				cwd: proc.cwd,
			} : { id: args.bashId, mode: "active" },
		});

		return { success: true, bashId: args.bashId, mode: "active" };
	});

// =============================================================================
// File Mutations
// =============================================================================

/**
 * Upload file
 */
export const uploadFile = mutation()
	.args(z.object({
		relativePath: z.string(),
		mediaType: z.string(),
		size: z.number(),
		content: z.string(), // base64
	}))
	.returns(z.object({ fileId: z.string() }))
	.resolve(async ({ args, ctx }: { args: { relativePath: string; mediaType: string; size: number; content: string }; ctx: LensContext }) => {
		const fileId = await ctx.appContext.fileStorage.upload({
			relativePath: args.relativePath,
			mediaType: args.mediaType,
			size: args.size,
			content: args.content,
		});
		return { fileId };
	});

// =============================================================================
// Ask/Answer Mutations (for user confirmation flows)
// =============================================================================

/**
 * Answer an ask request (user confirmation)
 *
 * Live: Publishes ask-answered event for getAskRequest subscribers
 */
export const answerAsk = mutation()
	.args(z.object({
		sessionId: z.string(),
		questionId: z.string(),
		answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
	}))
	.returns(z.object({ success: z.boolean() }))
	.resolve(async ({ args, ctx }: { args: { sessionId: string; questionId: string; answers: Record<string, string | string[]> }; ctx: LensContext }) => {
		// Resolve the pending ask using the new ask manager
		const { resolvePendingAsk } = await import("../services/ask-manager.service.js");
		const resolved = await resolvePendingAsk(args.questionId, args.answers);

		if (resolved) {
			// Publish event for live query subscribers
			await ctx.eventStream.publish(`session-stream:${args.sessionId}`, {
				type: "ask-answered",
				questionId: args.questionId,
				askRequestId: args.questionId,
				answers: args.answers,
			});
		}

		return { success: resolved };
	});

// =============================================================================
// System Message Mutation (for error/info messages without AI)
// =============================================================================

/**
 * Add a message without triggering AI
 *
 * Used for error messages, system info, etc.
 * Creates message in DB and updates session.
 *
 * Live: Publishes message-created event for listMessages subscribers
 */
export const addSystemMessage = mutation()
	.args(
		z.object({
			sessionId: z.string().nullable().optional(),
			role: z.enum(["user", "assistant", "system"]),
			content: z.string(),
			provider: z.string().optional(),
			model: z.string().optional(),
		}),
	)
	.returns(
		z.object({
			sessionId: z.string(),
			messageId: z.string(),
		}),
	)
	.resolve(async ({ args, ctx }: {
		args: {
			sessionId?: string | null;
			role: "user" | "assistant" | "system";
			content: string;
			provider?: string;
			model?: string;
		};
		ctx: LensContext;
	}) => {
		let sessionId = args.sessionId;
		let isNewSession = false;

		// Create session if needed
		if (!sessionId) {
			const session = await ctx.db.session.create({
				data: {
					id: crypto.randomUUID(),
					title: "New Chat",
					agentId: "coder",
					provider: args.provider,
					model: args.model,
					enabledRuleIds: [],
					nextTodoId: 1,
					created: Date.now(),
					updated: Date.now(),
				},
			});
			sessionId = session.id;
			isNewSession = true;

			// Publish session created event
			await ctx.eventStream.publish("session-events", {
				type: "session-created",
				session,
			});
		}

		// Get message count for ordering
		const existingMessages = await ctx.db.message.findMany({
			where: { sessionId },
		});
		const nextOrdering = existingMessages.length;

		// Create message
		const messageId = crypto.randomUUID();
		const timestamp = Date.now();
		await ctx.db.message.create({
			data: {
				id: messageId,
				sessionId,
				role: args.role,
				timestamp,
				ordering: nextOrdering,
				status: "completed",
			},
		});

		// Create step
		const stepId = crypto.randomUUID();
		await ctx.db.step.create({
			data: {
				id: stepId,
				messageId,
				stepIndex: 0,
				status: "completed",
			},
		});

		// Create text part
		await ctx.db.part.create({
			data: {
				id: crypto.randomUUID(),
				stepId,
				ordering: 0,
				type: "text",
				content: { type: "text", content: args.content },
			},
		});

		// Update session timestamp
		await ctx.db.session.update({
			where: { id: sessionId },
			data: { updated: Date.now() },
		});

		// Publish message-created event for live query subscribers
		await ctx.eventStream.publish(`session-stream:${sessionId}`, {
			type: "message-created",
			message: {
				id: messageId,
				sessionId,
				role: args.role,
				timestamp,
				ordering: nextOrdering,
				status: "completed",
				steps: [{
					id: stepId,
					messageId,
					stepIndex: 0,
					status: "completed",
					parts: [{
						type: "text",
						content: args.content,
						status: "completed",
					}],
				}],
			},
		});

		return { sessionId, messageId };
	});

// =============================================================================
// Streaming Mutations (tRPC compatibility)
// =============================================================================

/**
 * Trigger AI streaming
 *
 * This mutation starts server-side AI streaming and returns immediately.
 * All events are published to event bus - client subscribes via useEventStream.
 *
 * tRPC-compatible interface for existing client code.
 */
export const triggerStream = mutation()
	.args(
		z.object({
			sessionId: z.string().nullable().optional(),
			agentId: z.string().optional(),
			provider: z.string().optional(),
			model: z.string().optional(),
			content: z.array(ContentPartSchema),
		}),
	)
	.returns(
		z.object({
			success: z.boolean(),
			sessionId: z.string(),
			queued: z.boolean().optional(),
		}),
	)
	.resolve(async ({ args, ctx }: {
		args: {
			sessionId?: string | null;
			agentId?: string;
			provider?: string;
			model?: string;
			content: Array<{ type: string; content?: string; [key: string]: unknown }>;
		};
		ctx: LensContext;
	}) => {
		const { triggerStreamMutation } = await import(
			"../services/streaming-mutations.service.js"
		);
		const { loadAIConfig } = await import("@sylphx/code-core");

		// Load aiConfig from disk (same as tRPC context does)
		let aiConfig: any = { providers: {} };
		try {
			const result = await loadAIConfig();
			if (result.success) {
				aiConfig = result.data;
			}
		} catch (error) {
			console.error("[triggerStream] Failed to load AI config:", error);
		}

		const result = await triggerStreamMutation({
			appContext: ctx.appContext,
			sessionRepository: ctx.appContext.database.getRepository(),
			messageRepository: ctx.appContext.database.getMessageRepository(),
			aiConfig,
			input: {
				sessionId: args.sessionId,
				agentId: args.agentId,
				provider: args.provider,
				model: args.model,
				content: args.content,
			},
		});

		return result;
	});

// =============================================================================
// MCP Server Mutations
// =============================================================================

/**
 * Connect to MCP server
 *
 * Live: Publishes mcp-server-connected event for listMcpServers subscribers
 */
export const connectMcpServer = mutation()
	.args(z.object({
		serverId: z.string(),
		cwd: z.string().optional(),
	}))
	.returns(z.object({
		success: z.boolean(),
		serverId: z.string(),
		toolCount: z.number().optional(),
		error: z.string().optional(),
	}))
	.resolve(async ({ args, ctx }: { args: { serverId: string; cwd?: string }; ctx: LensContext }) => {
		try {
			// TODO: Implement MCP server connection via mcpManager
			// const mcpManager = ctx.appContext.mcpManager;
			// await mcpManager.connect(args.serverId);
			// const tools = mcpManager.getServerTools(args.serverId);

			// Publish event for live query subscribers
			await ctx.eventStream.publish("mcp-events", {
				type: "mcp-server-connected",
				serverId: args.serverId,
				toolCount: 0,
			});

			return {
				success: true,
				serverId: args.serverId,
				toolCount: 0,
			};
		} catch (error) {
			await ctx.eventStream.publish("mcp-events", {
				type: "mcp-server-error",
				serverId: args.serverId,
				error: error instanceof Error ? error.message : "Connection failed",
			});

			return {
				success: false,
				serverId: args.serverId,
				error: error instanceof Error ? error.message : "Connection failed",
			};
		}
	});

/**
 * Disconnect from MCP server
 *
 * Live: Publishes mcp-server-disconnected event for listMcpServers subscribers
 */
export const disconnectMcpServer = mutation()
	.args(z.object({
		serverId: z.string(),
	}))
	.returns(z.object({
		success: z.boolean(),
		serverId: z.string(),
	}))
	.resolve(async ({ args, ctx }: { args: { serverId: string }; ctx: LensContext }) => {
		// TODO: Implement MCP server disconnection via mcpManager
		// const mcpManager = ctx.appContext.mcpManager;
		// await mcpManager.disconnect(args.serverId);

		// Publish event for live query subscribers
		await ctx.eventStream.publish("mcp-events", {
			type: "mcp-server-disconnected",
			serverId: args.serverId,
		});

		return {
			success: true,
			serverId: args.serverId,
		};
	});

// =============================================================================
// Credential Mutations
// =============================================================================

/**
 * Create credential
 *
 * Live: Publishes credential-created event for listCredentials subscribers
 */
export const createCredential = mutation()
	.args(z.object({
		providerId: z.string(),
		label: z.string(),
		apiKey: z.string(),
		scope: z.enum(["global", "project"]).optional(),
		isDefault: z.boolean().optional(),
	}))
	.returns(z.object({
		success: z.boolean(),
		credentialId: z.string().optional(),
		error: z.string().optional(),
	}))
	.resolve(async ({ args, ctx }: { args: { providerId: string; label: string; apiKey: string; scope?: "global" | "project"; isDefault?: boolean }; ctx: LensContext }) => {
		try {
			const { createCredential: createCred } = await import("@sylphx/code-core");

			const credential = createCred({
				providerId: args.providerId,
				label: args.label,
				apiKey: args.apiKey,
				scope: args.scope || "global",
				isDefault: args.isDefault ?? true,
			});

			// Publish event for live query subscribers
			await ctx.eventStream.publish("credential-events", {
				type: "credential-created",
				credential: {
					id: credential.id,
					providerId: args.providerId,
					label: args.label,
					scope: args.scope || "global",
					isDefault: args.isDefault ?? true,
					createdAt: Date.now(),
				},
			});

			return {
				success: true,
				credentialId: credential.id,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to create credential",
			};
		}
	});

/**
 * Delete credential
 *
 * Live: Publishes credential-deleted event for listCredentials subscribers
 */
export const deleteCredential = mutation()
	.args(z.object({
		credentialId: z.string(),
	}))
	.returns(z.object({
		success: z.boolean(),
		error: z.string().optional(),
	}))
	.resolve(async ({ args, ctx }: { args: { credentialId: string }; ctx: LensContext }) => {
		try {
			const { deleteCredential: deleteCred } = await import("@sylphx/code-core");

			deleteCred(args.credentialId);

			// Publish event for live query subscribers
			await ctx.eventStream.publish("credential-events", {
				type: "credential-deleted",
				credentialId: args.credentialId,
			});

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to delete credential",
			};
		}
	});

// =============================================================================
// Tool Mutations
// =============================================================================

/**
 * Toggle tool enabled/disabled
 *
 * Live: Publishes tool-toggled event for listTools subscribers
 */
export const toggleTool = mutation()
	.args(z.object({
		toolId: z.string(),
		enabled: z.boolean(),
		sessionId: z.string().optional(), // Scope to session if provided
	}))
	.returns(z.object({
		success: z.boolean(),
		toolId: z.string(),
		enabled: z.boolean(),
	}))
	.resolve(async ({ args, ctx }: { args: { toolId: string; enabled: boolean; sessionId?: string }; ctx: LensContext }) => {
		// TODO: Implement tool toggle in session config or global config
		// If sessionId provided, toggle per-session
		// Otherwise, toggle globally

		// Publish event for live query subscribers
		await ctx.eventStream.publish("tool-events", {
			type: "tool-toggled",
			toolId: args.toolId,
			isEnabled: args.enabled,
		});

		return {
			success: true,
			toolId: args.toolId,
			enabled: args.enabled,
		};
	});

// =============================================================================
// Rule Mutations
// =============================================================================

/**
 * Toggle rule enabled/disabled for session
 *
 * Live: Updates session's enabledRuleIds and publishes event
 */
export const toggleRule = mutation()
	.args(z.object({
		sessionId: z.string(),
		ruleId: z.string(),
		enabled: z.boolean(),
	}))
	.returns(z.object({
		success: z.boolean(),
		ruleId: z.string(),
		enabled: z.boolean(),
		enabledRuleIds: z.array(z.string()),
	}))
	.resolve(async ({ args, ctx }: { args: { sessionId: string; ruleId: string; enabled: boolean }; ctx: LensContext }) => {
		// Get current session
		const session = await ctx.db.session.findUnique({
			where: { id: args.sessionId },
		});

		if (!session) {
			throw new Error(`Session not found: ${args.sessionId}`);
		}

		// Update enabledRuleIds
		let enabledRuleIds = session.enabledRuleIds || [];
		if (args.enabled && !enabledRuleIds.includes(args.ruleId)) {
			enabledRuleIds = [...enabledRuleIds, args.ruleId];
		} else if (!args.enabled) {
			enabledRuleIds = enabledRuleIds.filter((id: string) => id !== args.ruleId);
		}

		// Update session
		await ctx.db.session.update({
			where: { id: args.sessionId },
			data: { enabledRuleIds },
		});

		// Publish session update event
		await ctx.eventStream.publish("session-events", {
			type: "session-updated",
			session: { ...session, enabledRuleIds },
		});

		return {
			success: true,
			ruleId: args.ruleId,
			enabled: args.enabled,
			enabledRuleIds,
		};
	});
