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
import { entity as e, temp, now } from "@sylphx/reify";
import { Session, Message, Step, Part, Todo } from "./entities.js";
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
	.input(
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
	.resolve(async ({ input, ctx }: { input: { title?: string; agentId?: string; modelId?: string; provider?: string; model?: string; enabledRuleIds?: string[] }; ctx: LensContext }) => {
		const now = Date.now();
		const sessionId = crypto.randomUUID();

		const agentId = input.agentId || "coder";
		const modelName = input.model;
		const enabledRuleIds = input.enabledRuleIds || [];

		const session = await ctx.db.session.create({
			data: {
				id: sessionId,
				title: input.title || "New Chat",
				agentId,
				modelId: input.modelId,
				provider: input.provider,
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
	.input(
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
	.resolve(async ({ input, ctx }: { input: { id: string; title?: string; agentId?: string; modelId?: string; provider?: string; model?: string; enabledRuleIds?: string[] }; ctx: LensContext }) => {
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
	.input(z.object({ id: z.string() }))
	.returns(Session)
	.optimistic("delete")
	.resolve(async ({ input, ctx }: { input: { id: string }; ctx: LensContext }) => {
		const session = await ctx.db.session.delete({ where: { id: input.id } });

		// Publish event for live query subscribers
		await ctx.eventStream.publish("session-events", {
			type: "session-deleted",
			sessionId: input.id,
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
	.input(
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
	// Multi-entity optimistic update using Reify pipeline
	.optimistic(({ input }) => [
		// Create user message optimistically
		e.create(Message, {
			id: temp(),
			sessionId: input.sessionId || temp(),
			role: "user",
			timestamp: now(),
			ordering: 0, // Will be corrected by server
			status: "completed",
		}),
		// Create assistant message placeholder
		e.create(Message, {
			id: temp(),
			sessionId: input.sessionId || temp(),
			role: "assistant",
			timestamp: now(),
			ordering: 1, // Will be corrected by server
			status: "active",
		}),
		// Update session timestamp (only if sessionId exists)
		...(input.sessionId ? [
			e.update(Session, {
				id: input.sessionId,
				updated: now(),
			}),
		] : []),
	])
	.resolve(async function* ({ input, ctx }: { input: { sessionId?: string | null; content: any[]; agentId?: string; provider?: string; model?: string }; ctx: LensContext }) {
		// Import streaming service
		const { triggerStreamMutation } = await import(
			"../services/streaming-mutations.service.js"
		);

		// Get or create session
		let session: any;
		let sessionId = input.sessionId;

		if (!sessionId) {
			// Create new session
			session = await ctx.db.session.create({
				data: {
					id: crypto.randomUUID(),
					title: "New Chat",
					agentId: input.agentId || "coder",
					provider: input.provider,
					model: input.model,
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
		for (let i = 0; i < input.content.length; i++) {
			const part = input.content[i];
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
				aiConfig: ctx.appContext.aiConfig,
				input: {
					sessionId,
					agentId: input.agentId,
					provider: input.provider,
					model: input.model,
					content: input.content as any,
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
	.input(z.object({ sessionId: z.string() }))
	.returns(z.object({ success: z.boolean() }))
	.resolve(async ({ input, ctx }: { input: { sessionId: string }; ctx: LensContext }) => {
		const { abortStreamMutation } = await import(
			"../services/streaming-mutations.service.js"
		);

		const success = abortStreamMutation(input.sessionId);

		if (success) {
			// Publish event for live query subscribers
			await ctx.eventStream.publish(`session-stream:${input.sessionId}`, {
				type: "stream-aborted",
				sessionId: input.sessionId,
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
	.input(
		z.object({
			sessionId: z.string(),
			content: z.string(),
			activeForm: z.string(),
			status: z.enum(["pending", "in_progress", "completed"]).optional(),
		}),
	)
	.returns(Todo)
	.optimistic("create")
	.resolve(async ({ input, ctx }: { input: { sessionId: string; content: string; activeForm: string; status?: "pending" | "in_progress" | "completed" }; ctx: LensContext }) => {
		// Get next todo ID
		const session = await ctx.db.session.findUnique({
			where: { id: input.sessionId },
		});
		const todoId = session?.nextTodoId || 1;

		// Create todo
		const todo = await ctx.db.todo.create({
			data: {
				id: todoId,
				sessionId: input.sessionId,
				content: input.content,
				activeForm: input.activeForm,
				status: input.status || "pending",
				ordering: todoId,
				created: Date.now(),
			},
		});

		// Increment session's nextTodoId
		await ctx.db.session.update({
			where: { id: input.sessionId },
			data: { nextTodoId: todoId + 1 },
		});

		// Publish event for live query subscribers
		await ctx.eventStream.publish(`session-stream:${input.sessionId}`, {
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
	.input(
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
	.resolve(async ({ input, ctx }: { input: { sessionId: string; id: number; content?: string; activeForm?: string; status?: "pending" | "in_progress" | "completed" }; ctx: LensContext }) => {
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
	.input(
		z.object({
			sessionId: z.string(),
			id: z.number(),
		}),
	)
	.returns(Todo)
	.optimistic("delete")
	.resolve(async ({ input, ctx }: { input: { sessionId: string; id: number }; ctx: LensContext }) => {
		// Get todo before deletion for return value
		const todo = await ctx.db.todo.findUnique({
			where: { sessionId: input.sessionId, id: input.id },
		});

		if (!todo) {
			throw new Error(`Todo not found: ${input.sessionId}/${input.id}`);
		}

		await ctx.db.todo.delete({
			where: { sessionId: input.sessionId, id: input.id },
		});

		// Publish event for live query subscribers
		await ctx.eventStream.publish(`session-stream:${input.sessionId}`, {
			type: "todo-deleted",
			todoId: input.id,
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
 * already has the complete new state in input.
 */
export const syncTodos = mutation()
	.input(
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
	.resolve(async ({ input, ctx }: { input: { sessionId: string; todos: { id?: number; content: string; activeForm: string; status: "pending" | "in_progress" | "completed" }[] }; ctx: LensContext }) => {
		const results: any[] = [];

		// Get current session
		const session = await ctx.db.session.findUnique({
			where: { id: input.sessionId },
		});
		let nextId = session?.nextTodoId || 1;

		for (let i = 0; i < input.todos.length; i++) {
			const todo = input.todos[i];

			if (todo.id) {
				// Update existing
				const updated = await ctx.db.todo.update({
					where: { sessionId: input.sessionId, id: todo.id },
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
						sessionId: input.sessionId,
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
			where: { id: input.sessionId },
			data: { nextTodoId: nextId },
		});

		// Publish event for live query subscribers (full list replacement)
		await ctx.eventStream.publish(`session-stream:${input.sessionId}`, {
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
	.input(z.object({
		config: z.any(),
		cwd: z.string().optional(),
	}))
	.returns(z.object({ success: z.boolean(), error: z.string().optional() }))
	.resolve(async ({ input, ctx }: { input: { config: any; cwd?: string }; ctx: LensContext }) => {
		const { loadAIConfig, saveAIConfig } = await import("@sylphx/code-core");
		const { mergeConfigWithSecrets } = await import("./config-utils.js");
		const cwd = input.cwd || process.cwd();

		// Load current config to preserve secrets
		const currentResult = await loadAIConfig(cwd);
		const currentConfig = currentResult.success ? currentResult.data : { providers: {} };

		// Merge with secrets preserved
		const mergedConfig = mergeConfigWithSecrets(input.config, currentConfig);

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
	.input(z.object({
		providerId: z.string(),
		fieldName: z.string(),
		value: z.string(),
		cwd: z.string().optional(),
	}))
	.returns(z.object({ success: z.boolean(), error: z.string().optional() }))
	.resolve(async ({ input, ctx }: { input: { providerId: string; fieldName: string; value: string; cwd?: string }; ctx: LensContext }) => {
		const { loadAIConfig, saveAIConfig, getProvider, createCredential, getDefaultCredential, updateCredential } = await import("@sylphx/code-core");
		const cwd = input.cwd || process.cwd();

		const result = await loadAIConfig(cwd);
		if (!result.success) {
			return { success: false, error: result.error.message };
		}

		// Verify field is a secret field
		try {
			const provider = getProvider(input.providerId as any);
			const configSchema = provider.getConfigSchema();
			const field = configSchema.find(f => f.key === input.fieldName);

			if (!field) {
				return { success: false, error: `Field ${input.fieldName} not found` };
			}
			if (!field.secret) {
				return { success: false, error: `Field ${input.fieldName} is not a secret field` };
			}
		} catch (_error) {
			return { success: false, error: `Provider ${input.providerId} not found` };
		}

		// Create or update credential
		const credential = getDefaultCredential(input.providerId) ||
			createCredential({
				providerId: input.providerId,
				label: `${input.providerId} API key`,
				apiKey: input.value,
				scope: "global",
				isDefault: true,
			});

		if (!credential.isDefault) {
			updateCredential(credential.id, { apiKey: input.value });
		}

		// Update provider config
		const currentProviderConfig = result.data.providers?.[input.providerId] || {};
		const { apiKey: _removed, ...configWithoutApiKey } = currentProviderConfig;
		const updatedProviderConfig = {
			...configWithoutApiKey,
			credentialId: credential.id,
		};

		const updated = {
			...result.data,
			providers: {
				...result.data.providers,
				[input.providerId]: updatedProviderConfig,
			},
		};

		const saveResult = await saveAIConfig(updated, cwd);
		if (saveResult.success) {
			// Publish event for live query subscribers
			await ctx.eventStream.publish("credential-events", {
				type: "credential-updated",
				providerId: input.providerId,
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
	.input(z.object({
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
	.resolve(async ({ input, ctx }: { input: { command: string; mode?: "active" | "background"; cwd?: string; timeout?: number }; ctx: LensContext }) => {
		const bashId = await ctx.appContext.bashManagerV2.execute(input.command, {
			mode: input.mode || "active",
			cwd: input.cwd,
			timeout: input.timeout,
		});

		const bash = {
			bashId,
			command: input.command,
			mode: input.mode || "active",
		};

		// Publish event for live query subscribers
		await ctx.eventStream.publish("bash-events", {
			type: "bash-created",
			bash: {
				id: bashId,
				command: input.command,
				mode: input.mode || "active",
				status: "running",
				startTime: Date.now(),
				cwd: input.cwd || process.cwd(),
			},
		});

		// If active, also publish activation event
		if (input.mode !== "background") {
			await ctx.eventStream.publish("bash-events", {
				type: "bash-activated",
				bash: {
					id: bashId,
					command: input.command,
					mode: "active",
					status: "running",
					startTime: Date.now(),
					cwd: input.cwd || process.cwd(),
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
	.input(z.object({ bashId: z.string() }))
	.returns(z.object({ success: z.boolean(), bashId: z.string() }))
	.resolve(async ({ input, ctx }: { input: { bashId: string }; ctx: LensContext }) => {
		const success = ctx.appContext.bashManagerV2.kill(input.bashId);
		if (!success) {
			throw new Error(`Failed to kill bash process: ${input.bashId}`);
		}

		// Publish event for live query subscribers
		await ctx.eventStream.publish("bash-events", {
			type: "bash-completed",
			bashId: input.bashId,
			exitCode: -1, // Killed
			endTime: Date.now(),
		});

		await ctx.eventStream.publish(`bash:${input.bashId}`, {
			type: "bash-completed",
			bashId: input.bashId,
			exitCode: -1,
			endTime: Date.now(),
		});

		return { success: true, bashId: input.bashId };
	});

/**
 * Demote active bash to background
 *
 * Live: Publishes bash-deactivated event for getActiveBash subscribers
 */
export const demoteBash = mutation()
	.input(z.object({ bashId: z.string() }))
	.returns(z.object({ success: z.boolean(), bashId: z.string(), mode: z.string() }))
	.resolve(async ({ input, ctx }: { input: { bashId: string }; ctx: LensContext }) => {
		const success = ctx.appContext.bashManagerV2.demote(input.bashId);
		if (!success) {
			throw new Error(`Failed to demote bash: ${input.bashId}`);
		}

		// Publish event for live query subscribers
		await ctx.eventStream.publish("bash-events", {
			type: "bash-deactivated",
			bashId: input.bashId,
		});

		return { success: true, bashId: input.bashId, mode: "background" };
	});

/**
 * Promote background bash to active
 *
 * Live: Publishes bash-activated event for getActiveBash subscribers
 */
export const promoteBash = mutation()
	.input(z.object({ bashId: z.string() }))
	.returns(z.object({ success: z.boolean(), bashId: z.string(), mode: z.string() }))
	.resolve(async ({ input, ctx }: { input: { bashId: string }; ctx: LensContext }) => {
		const success = await ctx.appContext.bashManagerV2.promote(input.bashId);
		if (!success) {
			throw new Error(`Failed to promote bash: ${input.bashId}`);
		}

		// Get bash details for event
		const proc = ctx.appContext.bashManagerV2.get(input.bashId);

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
			} : { id: input.bashId, mode: "active" },
		});

		return { success: true, bashId: input.bashId, mode: "active" };
	});

// =============================================================================
// File Mutations
// =============================================================================

/**
 * Upload file
 */
export const uploadFile = mutation()
	.input(z.object({
		relativePath: z.string(),
		mediaType: z.string(),
		size: z.number(),
		content: z.string(), // base64
	}))
	.returns(z.object({ fileId: z.string() }))
	.resolve(async ({ input, ctx }: { input: { relativePath: string; mediaType: string; size: number; content: string }; ctx: LensContext }) => {
		const fileId = await ctx.appContext.fileStorage.upload({
			relativePath: input.relativePath,
			mediaType: input.mediaType,
			size: input.size,
			content: input.content,
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
	.input(z.object({
		sessionId: z.string(),
		questionId: z.string(),
		answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
	}))
	.returns(z.object({ success: z.boolean() }))
	.resolve(async ({ input, ctx }: { input: { sessionId: string; questionId: string; answers: Record<string, string | string[]> }; ctx: LensContext }) => {
		// Resolve the pending ask using the new ask manager
		const { resolvePendingAsk } = await import("../services/ask-manager.service.js");
		const resolved = await resolvePendingAsk(input.questionId, input.answers);

		if (resolved) {
			// Publish event for live query subscribers
			await ctx.eventStream.publish(`session-stream:${input.sessionId}`, {
				type: "ask-answered",
				questionId: input.questionId,
				askRequestId: input.questionId,
				answers: input.answers,
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
	.input(
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
	.resolve(async ({ input, ctx }: {
		input: {
			sessionId?: string | null;
			role: "user" | "assistant" | "system";
			content: string;
			provider?: string;
			model?: string;
		};
		ctx: LensContext;
	}) => {
		let sessionId = input.sessionId;
		let isNewSession = false;

		// Create session if needed
		if (!sessionId) {
			const session = await ctx.db.session.create({
				data: {
					id: crypto.randomUUID(),
					title: "New Chat",
					agentId: "coder",
					provider: input.provider,
					model: input.model,
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
				role: input.role,
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
				content: { type: "text", content: input.content },
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
				role: input.role,
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
						content: input.content,
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
	.input(
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
	.resolve(async ({ input, ctx }: {
		input: {
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
				sessionId: input.sessionId,
				agentId: input.agentId,
				provider: input.provider,
				model: input.model,
				content: input.content,
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
	.input(z.object({
		serverId: z.string(),
		cwd: z.string().optional(),
	}))
	.returns(z.object({
		success: z.boolean(),
		serverId: z.string(),
		toolCount: z.number().optional(),
		error: z.string().optional(),
	}))
	.resolve(async ({ input, ctx }: { input: { serverId: string; cwd?: string }; ctx: LensContext }) => {
		try {
			// TODO: Implement MCP server connection via mcpManager
			// const mcpManager = ctx.appContext.mcpManager;
			// await mcpManager.connect(input.serverId);
			// const tools = mcpManager.getServerTools(input.serverId);

			// Publish event for live query subscribers
			await ctx.eventStream.publish("mcp-events", {
				type: "mcp-server-connected",
				serverId: input.serverId,
				toolCount: 0,
			});

			return {
				success: true,
				serverId: input.serverId,
				toolCount: 0,
			};
		} catch (error) {
			await ctx.eventStream.publish("mcp-events", {
				type: "mcp-server-error",
				serverId: input.serverId,
				error: error instanceof Error ? error.message : "Connection failed",
			});

			return {
				success: false,
				serverId: input.serverId,
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
	.input(z.object({
		serverId: z.string(),
	}))
	.returns(z.object({
		success: z.boolean(),
		serverId: z.string(),
	}))
	.resolve(async ({ input, ctx }: { input: { serverId: string }; ctx: LensContext }) => {
		// TODO: Implement MCP server disconnection via mcpManager
		// const mcpManager = ctx.appContext.mcpManager;
		// await mcpManager.disconnect(input.serverId);

		// Publish event for live query subscribers
		await ctx.eventStream.publish("mcp-events", {
			type: "mcp-server-disconnected",
			serverId: input.serverId,
		});

		return {
			success: true,
			serverId: input.serverId,
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
	.input(z.object({
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
	.resolve(async ({ input, ctx }: { input: { providerId: string; label: string; apiKey: string; scope?: "global" | "project"; isDefault?: boolean }; ctx: LensContext }) => {
		try {
			const { createCredential: createCred } = await import("@sylphx/code-core");

			const credential = createCred({
				providerId: input.providerId,
				label: input.label,
				apiKey: input.apiKey,
				scope: input.scope || "global",
				isDefault: input.isDefault ?? true,
			});

			// Publish event for live query subscribers
			await ctx.eventStream.publish("credential-events", {
				type: "credential-created",
				credential: {
					id: credential.id,
					providerId: input.providerId,
					label: input.label,
					scope: input.scope || "global",
					isDefault: input.isDefault ?? true,
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
	.input(z.object({
		credentialId: z.string(),
	}))
	.returns(z.object({
		success: z.boolean(),
		error: z.string().optional(),
	}))
	.resolve(async ({ input, ctx }: { input: { credentialId: string }; ctx: LensContext }) => {
		try {
			const { deleteCredential: deleteCred } = await import("@sylphx/code-core");

			deleteCred(input.credentialId);

			// Publish event for live query subscribers
			await ctx.eventStream.publish("credential-events", {
				type: "credential-deleted",
				credentialId: input.credentialId,
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
	.input(z.object({
		toolId: z.string(),
		enabled: z.boolean(),
		sessionId: z.string().optional(), // Scope to session if provided
	}))
	.returns(z.object({
		success: z.boolean(),
		toolId: z.string(),
		enabled: z.boolean(),
	}))
	.resolve(async ({ input, ctx }: { input: { toolId: string; enabled: boolean; sessionId?: string }; ctx: LensContext }) => {
		// TODO: Implement tool toggle in session config or global config
		// If sessionId provided, toggle per-session
		// Otherwise, toggle globally

		// Publish event for live query subscribers
		await ctx.eventStream.publish("tool-events", {
			type: "tool-toggled",
			toolId: input.toolId,
			isEnabled: input.enabled,
		});

		return {
			success: true,
			toolId: input.toolId,
			enabled: input.enabled,
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
	.input(z.object({
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
	.resolve(async ({ input, ctx }: { input: { sessionId: string; ruleId: string; enabled: boolean }; ctx: LensContext }) => {
		// Get current session
		const session = await ctx.db.session.findUnique({
			where: { id: input.sessionId },
		});

		if (!session) {
			throw new Error(`Session not found: ${input.sessionId}`);
		}

		// Update enabledRuleIds
		let enabledRuleIds = session.enabledRuleIds || [];
		if (input.enabled && !enabledRuleIds.includes(input.ruleId)) {
			enabledRuleIds = [...enabledRuleIds, input.ruleId];
		} else if (!input.enabled) {
			enabledRuleIds = enabledRuleIds.filter((id: string) => id !== input.ruleId);
		}

		// Update session
		await ctx.db.session.update({
			where: { id: input.sessionId },
			data: { enabledRuleIds },
		});

		// Publish session update event
		await ctx.eventStream.publish("session-events", {
			type: "session-updated",
			session: { ...session, enabledRuleIds },
		});

		return {
			success: true,
			ruleId: input.ruleId,
			enabled: input.enabled,
			enabledRuleIds,
		};
	});
