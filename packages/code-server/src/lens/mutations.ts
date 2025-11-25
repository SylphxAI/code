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

import { mutation, tempId } from "@lens/core";
import { z } from "zod";
import { Session, Message, Step, Part, Todo } from "./entities.js";
import type { LensContext } from "./context.js";

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
// Session Mutations
// =============================================================================

/**
 * Create a new session
 *
 * Auto-optimistic: "createSession" → 'create' strategy
 * Client immediately sees new session, server confirms.
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
	.resolve(async ({ input, ctx }: { input: { title?: string; agentId?: string; modelId?: string; provider?: string; model?: string; enabledRuleIds?: string[] }; ctx: LensContext }) => {
		const now = Date.now();

		const session = await ctx.db.session.create({
			data: {
				id: crypto.randomUUID(),
				title: input.title || "New Chat",
				agentId: input.agentId || "coder",
				modelId: input.modelId,
				provider: input.provider,
				model: input.model,
				enabledRuleIds: input.enabledRuleIds || [],
				nextTodoId: 1,
				createdAt: now,
				updatedAt: now,
			},
		});

		return session;
	});

/**
 * Update session
 *
 * Auto-optimistic: "updateSession" → 'merge' strategy
 * Client immediately sees changes, server confirms.
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
	.resolve(async ({ input, ctx }: { input: { id: string; title?: string; agentId?: string; modelId?: string; provider?: string; model?: string; enabledRuleIds?: string[] }; ctx: LensContext }) => {
		const { id, ...data } = input;

		return ctx.db.session.update({
			where: { id },
			data: {
				...data,
				updatedAt: Date.now(),
			},
		});
	});

/**
 * Delete session
 *
 * Auto-optimistic: "deleteSession" → 'delete' strategy
 * Client immediately removes session, server confirms.
 */
export const deleteSession = mutation()
	.input(z.object({ id: z.string() }))
	.returns(Session)
	.resolve(async ({ input, ctx }: { input: { id: string }; ctx: LensContext }) => {
		return ctx.db.session.delete({ where: { id: input.id } });
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
	// Explicit optimistic (complex multi-entity return)
	.optimistic(({ input }) => ({
		session: input.sessionId
			? { id: input.sessionId }
			: { id: tempId(), title: "New Chat" },
		userMessage: {
			id: tempId(),
			sessionId: input.sessionId || tempId(),
			role: "user",
			status: "completed",
			timestamp: Date.now(),
			ordering: 0,
		},
		assistantMessage: {
			id: tempId(),
			sessionId: input.sessionId || tempId(),
			role: "assistant",
			status: "active",
			timestamp: Date.now(),
			ordering: 1,
		},
	}))
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
					createdAt: Date.now(),
					updatedAt: Date.now(),
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
 */
export const abortStream = mutation()
	.input(z.object({ sessionId: z.string() }))
	.returns(z.object({ success: z.boolean() }))
	.resolve(async ({ input }: { input: { sessionId: string } }) => {
		const { abortStreamMutation } = await import(
			"../services/streaming-mutations.service.js"
		);

		const success = abortStreamMutation(input.sessionId);
		return { success };
	});

// =============================================================================
// Todo Mutations
// =============================================================================

/**
 * Create todo
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
				createdAt: Date.now(),
			},
		});

		// Increment session's nextTodoId
		await ctx.db.session.update({
			where: { id: input.sessionId },
			data: { nextTodoId: todoId + 1 },
		});

		return todo;
	});

/**
 * Update todo
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
	.resolve(async ({ input, ctx }: { input: { sessionId: string; id: number; content?: string; activeForm?: string; status?: "pending" | "in_progress" | "completed" }; ctx: LensContext }) => {
		const { sessionId, id, ...data } = input;

		const updateData: any = { ...data };
		if (data.status === "completed") {
			updateData.completedAt = Date.now();
		}

		return ctx.db.todo.update({
			where: { sessionId, id },
			data: updateData,
		});
	});

/**
 * Delete todo
 */
export const deleteTodo = mutation()
	.input(
		z.object({
			sessionId: z.string(),
			id: z.number(),
		}),
	)
	.returns(z.object({ success: z.boolean() }))
	.resolve(async ({ input, ctx }: { input: { sessionId: string; id: number }; ctx: LensContext }) => {
		await ctx.db.todo.delete({
			where: { sessionId: input.sessionId, id: input.id },
		});
		return { success: true };
	});

/**
 * Batch update todos (for todo list sync)
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
						createdAt: Date.now(),
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

		return results;
	});

// =============================================================================
// Config Mutations
// =============================================================================

/**
 * Save AI config
 */
export const saveConfig = mutation()
	.input(z.object({
		config: z.any(),
		cwd: z.string().optional(),
	}))
	.returns(z.object({ success: z.boolean(), error: z.string().optional() }))
	.resolve(async ({ input }: { input: { config: any; cwd?: string } }) => {
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
			return { success: true };
		}
		return { success: false, error: result.error.message };
	});

/**
 * Set provider secret (API key)
 */
export const setProviderSecret = mutation()
	.input(z.object({
		providerId: z.string(),
		fieldName: z.string(),
		value: z.string(),
		cwd: z.string().optional(),
	}))
	.returns(z.object({ success: z.boolean(), error: z.string().optional() }))
	.resolve(async ({ input }: { input: { providerId: string; fieldName: string; value: string; cwd?: string } }) => {
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
			return { success: true };
		}
		return { success: false, error: saveResult.error.message };
	});

// =============================================================================
// Bash Mutations
// =============================================================================

/**
 * Execute bash command
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
		return {
			bashId,
			command: input.command,
			mode: input.mode || "active",
		};
	});

/**
 * Kill bash process
 */
export const killBash = mutation()
	.input(z.object({ bashId: z.string() }))
	.returns(z.object({ success: z.boolean(), bashId: z.string() }))
	.resolve(async ({ input, ctx }: { input: { bashId: string }; ctx: LensContext }) => {
		const success = ctx.appContext.bashManagerV2.kill(input.bashId);
		if (!success) {
			throw new Error(`Failed to kill bash process: ${input.bashId}`);
		}
		return { success: true, bashId: input.bashId };
	});

/**
 * Demote active bash to background
 */
export const demoteBash = mutation()
	.input(z.object({ bashId: z.string() }))
	.returns(z.object({ success: z.boolean(), bashId: z.string(), mode: z.string() }))
	.resolve(async ({ input, ctx }: { input: { bashId: string }; ctx: LensContext }) => {
		const success = ctx.appContext.bashManagerV2.demote(input.bashId);
		if (!success) {
			throw new Error(`Failed to demote bash: ${input.bashId}`);
		}
		return { success: true, bashId: input.bashId, mode: "background" };
	});

/**
 * Promote background bash to active
 */
export const promoteBash = mutation()
	.input(z.object({ bashId: z.string() }))
	.returns(z.object({ success: z.boolean(), bashId: z.string(), mode: z.string() }))
	.resolve(async ({ input, ctx }: { input: { bashId: string }; ctx: LensContext }) => {
		const success = await ctx.appContext.bashManagerV2.promote(input.bashId);
		if (!success) {
			throw new Error(`Failed to promote bash: ${input.bashId}`);
		}
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
 */
export const answerAsk = mutation()
	.input(z.object({
		sessionId: z.string(),
		messageId: z.string(),
		answer: z.enum(["yes", "no", "always", "never"]),
	}))
	.returns(z.object({ success: z.boolean() }))
	.resolve(async ({ input, ctx }: { input: { sessionId: string; messageId: string; answer: "yes" | "no" | "always" | "never" }; ctx: LensContext }) => {
		// Store the answer for the streaming service to pick up
		ctx.appContext.askManager?.setAnswer(input.sessionId, input.messageId, input.answer);
		return { success: true };
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
