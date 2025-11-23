/**
 * Sylphx Code API - Lens definitions
 *
 * All API endpoints defined using Lens framework
 * Provides type-safe queries, mutations, and subscriptions
 */

import { createLensBuilder } from "@sylphx/lens-core";
import type { Observable } from "rxjs";
import { z } from "zod";
import {
	MessageSchema,
	PaginatedSessionsSchema,
	PartialSessionSchema,
	ParsedContentPartSchema,
	SessionMetadataSchema,
	SessionSchema,
	StreamEventSchema,
	TodoSchema,
	type Message,
	type PaginatedSessions,
	type PartialSession,
	type Session,
	type SessionMetadata,
	type StreamEvent,
	type Todo,
} from "./schemas/index.js";

/**
 * Typed context for API resolvers
 * Auto-inferred in all handlers - no manual type annotations needed!
 *
 * Design: TypeScript-first with full type inference
 * - Context defined once
 * - Auto-inferred everywhere
 * - Full autocomplete for all fields
 * - Compile-time type checking
 */
export interface CodeContext {
	sessionRepository: any;  // TODO: Import SessionRepository type from code-server
	messageRepository: any;  // TODO: Import MessageRepository type from code-server
	todoRepository: any;     // TODO: Import TodoRepository type from code-server
	aiConfig: any;           // TODO: Import AIConfig type from code-core
	appContext: any;         // Full AppContext with all services (database, managers, etc.)
}

/**
 * Create typed Lens builder with CodeContext
 * All handlers will auto-infer ctx: CodeContext
 */
const lens = createLensBuilder<CodeContext>();

/**
 * Session API
 *
 * ARCHITECTURE: Resolvers receive APIContext with repositories
 */
export const sessionAPI = lens.object({
	/**
	 * Get recent sessions with cursor-based pagination
	 * DATA ON DEMAND: Returns only metadata (id, title, provider, model, timestamps, messageCount)
	 */
	getRecent: lens
		.input(z.object({
			limit: z.number().min(1).max(100).default(20),
			cursor: z.number().optional(),
		}))
		.output(PaginatedSessionsSchema)
		.query(async ({ input, ctx }) => {
			const { limit, cursor } = input;
			return await ctx.sessionRepository.getRecentSessionsMetadata(limit, cursor);
		}),

	/**
	 * Get session by ID with full data
	 * FRONTEND-DRIVEN:
	 * - Client controls field selection via `select`
	 * - Can subscribe for real-time updates
	 * - Lazy loading: Only called when user opens session
	 */
	getById: lens
		.input(z.object({ sessionId: z.string() }))
		.output(PartialSessionSchema.nullable()) // Use PartialSessionSchema to allow partial updates from subscriptions
		.query(
			// Query: One-time fetch
			async ({ input, ctx }) => {
				const { sessionId } = input;
				const session = await ctx.sessionRepository.getSessionById(sessionId);
				if (!session) {
					return null;
				}

				// Validate model availability (server-side autonomous)
				let modelStatus: "available" | "unavailable" | "unknown" = "unknown";

				try {
					const { getProvider } = await import("@sylphx/code-core");
					const provider = getProvider(session.provider);
					const providerConfig = ctx.aiConfig.providers[session.provider];

					if (provider && providerConfig) {
						const models = await provider.fetchModels(providerConfig);
						modelStatus = models.some((m: any) => m.id === session.model)
							? "available"
							: "unavailable";
					}
				} catch (err) {
					console.error("[session.getById] Failed to validate model:", err);
					modelStatus = "unknown";
				}

				return {
					...session,
					modelStatus,
				};
			},
			// Subscribe: Real-time updates
			({ input, ctx }): Observable<Session | null> => {
				const { sessionId } = input;
				const { Observable: RxObservable } = require("rxjs");
				const { startWith, map, filter } = require("rxjs/operators");

				return ctx.appContext.eventStream
					.subscribe(`session:${sessionId}`)
					.pipe(
						startWith(null), // Will trigger initial fetch via resolve
						map((event: any) => {
							if (!event) return null;
							if (event.type === 'session-updated') {
								return event.payload.session;
							}
							return null;
						}),
						filter((session: Session | null) => session !== null)
					);
			}
		),

	/**
	 * Get session count
	 */
	getCount: lens
		.output(z.number())
		.query(async ({ ctx }) => {
			return await ctx.sessionRepository.getSessionCount();
		}),

	/**
	 * Get last session (for headless mode)
	 */
	getLast: lens
		.output(SessionSchema.nullable())
		.query(async ({ ctx }) => {
			return await ctx.sessionRepository.getLastSession();
		}),

	/**
	 * Search sessions by title
	 */
	search: lens
		.input(z.object({
			query: z.string(),
			limit: z.number().min(1).max(100).default(20),
			cursor: z.number().optional(),
		}))
		.output(PaginatedSessionsSchema)
		.query(async ({ input, ctx }) => {
			const { query, limit, cursor } = input;
			return await ctx.sessionRepository.searchSessionsMetadata(query, limit, cursor);
		}),

	/**
	 * Create new session
	 * REACTIVE: Publishes to 'sessions' channel for session list updates
	 */
	create: lens
		.input(z.object({
			provider: z.string(),
			model: z.string(),
			agentId: z.string().optional(),
			enabledRuleIds: z.array(z.string()).optional(),
		}))
		.output(SessionSchema)
		.mutation(async ({ input, ctx }) => {
			const { provider, model, agentId, enabledRuleIds } = input;
			// Load global config for defaults
			const cwd = process.cwd();
			const { loadAIConfig, loadAllRules } = await import("@sylphx/code-core");
			const configResult = await loadAIConfig(cwd);
			const config = configResult.success ? configResult.data : null;

			// Priority: explicit input > global config > fallback
			let finalAgentId = agentId;
			if (!finalAgentId && config?.defaultAgentId) {
				finalAgentId = config.defaultAgentId;
			}
			if (!finalAgentId) {
				finalAgentId = "coder";
			}

			let finalEnabledRuleIds = enabledRuleIds;
			if (!finalEnabledRuleIds && config?.defaultEnabledRuleIds) {
				finalEnabledRuleIds = config.defaultEnabledRuleIds;
			}
			if (!finalEnabledRuleIds) {
				const allRules = await loadAllRules(cwd);
				finalEnabledRuleIds = allRules
					.filter((rule: any) => rule.metadata.enabled === true)
					.map((rule: any) => rule.id);
			}

			const session = await ctx.sessionRepository.createSession(
				provider,
				model,
				finalAgentId,
				finalEnabledRuleIds,
			);

			// Publish to global sessions channel for session list updates
			await ctx.appContext.eventStream.publish("sessions", {
				type: "session-created",
				payload: { session },
			});

			return session;
		}),

	/**
	 * Update session title
	 * REACTIVE: Publishes to session:{id} channel
	 * Frontend receives via subscription (using patch strategy for minimal transmission)
	 * OPTIMISTIC: UI updates immediately, confirms on success, rolls back on error
	 */
	updateTitle: lens
		.input(z.object({
			sessionId: z.string(),
			title: z.string(),
		}))
		.output(SessionSchema)
		.optimistic((opt) => opt
			.entity('Session')
			.id($ => $.sessionId)
			.apply((draft, input, t) => {
				draft.title = input.title;
				draft.updatedAt = t.now();
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { sessionId, title } = input;
			// 1. Update database
			await ctx.sessionRepository.updateSessionTitle(sessionId, title);

			// 2. Get updated session
			const session = await ctx.sessionRepository.getSessionById(sessionId);

			// 3. Publish model-level event (subscriptions auto-update)
			await ctx.appContext.eventStream.publish(`session:${sessionId}`, {
				type: 'session-updated',
				payload: { session },
			});

			return session;
		}),

	/**
	 * Update session model
	 * REACTIVE: Publishes to session:{id} channel
	 * OPTIMISTIC: UI updates immediately, confirms on success, rolls back on error
	 */
	updateModel: lens
		.input(z.object({
			sessionId: z.string(),
			model: z.string(),
		}))
		.output(SessionSchema)
		.optimistic((opt) => opt
			.entity('Session')
			.id($ => $.sessionId)
			.apply((draft, input, t) => {
				draft.model = input.model;
				draft.updatedAt = t.now();
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { sessionId, model } = input;
			await ctx.sessionRepository.updateSessionModel(sessionId, model);
			const session = await ctx.sessionRepository.getSessionById(sessionId);

			await ctx.appContext.eventStream.publish(`session:${sessionId}`, {
				type: 'session-updated',
				payload: { session },
			});

			return session;
		}),

	/**
	 * Update session provider and model
	 * REACTIVE: Publishes to session:{id} channel
	 * OPTIMISTIC: UI updates immediately, confirms on success, rolls back on error
	 */
	updateProvider: lens
		.input(z.object({
			sessionId: z.string(),
			provider: z.string(),
			model: z.string(),
		}))
		.output(SessionSchema)
		.optimistic((opt) => opt
			.entity('Session')
			.id($ => $.sessionId)
			.apply((draft, input, t) => {
				draft.provider = input.provider as any;
				draft.model = input.model;
				draft.updatedAt = t.now();
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { sessionId, provider, model } = input;
			await ctx.sessionRepository.updateSessionProvider(sessionId, provider, model);
			const session = await ctx.sessionRepository.getSessionById(sessionId);

			await ctx.appContext.eventStream.publish(`session:${sessionId}`, {
				type: 'session-updated',
				payload: { session },
			});

			return session;
		}),

	/**
	 * Update session enabled rules
	 * REACTIVE: Publishes to session:{id} channel
	 * OPTIMISTIC: UI updates immediately, confirms on success, rolls back on error
	 */
	updateRules: lens
		.input(z.object({
			sessionId: z.string(),
			enabledRuleIds: z.array(z.string()),
		}))
		.output(SessionSchema)
		.optimistic((opt) => opt
			.entity('Session')
			.id($ => $.sessionId)
			.apply((draft, input, t) => {
				draft.enabledRuleIds = input.enabledRuleIds;
				draft.updatedAt = t.now();
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { sessionId, enabledRuleIds } = input;
			await ctx.sessionRepository.updateSession(sessionId, {
				enabledRuleIds,
			});
			const session = await ctx.sessionRepository.getSessionById(sessionId);

			await ctx.appContext.eventStream.publish(`session:${sessionId}`, {
				type: 'session-updated',
				payload: { session },
			});

			return session;
		}),

	/**
	 * Update session agent
	 * REACTIVE: Publishes to session:{id} channel
	 * OPTIMISTIC: UI updates immediately, confirms on success, rolls back on error
	 */
	updateAgent: lens
		.input(z.object({
			sessionId: z.string(),
			agentId: z.string(),
		}))
		.output(SessionSchema)
		.optimistic((opt) => opt
			.entity('Session')
			.id($ => $.sessionId)
			.apply((draft, input, t) => {
				draft.agentId = input.agentId;
				draft.updatedAt = t.now();
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { sessionId, agentId } = input;
			await ctx.sessionRepository.updateSession(sessionId, {
				agentId,
			});
			const session = await ctx.sessionRepository.getSessionById(sessionId);

			await ctx.appContext.eventStream.publish(`session:${sessionId}`, {
				type: 'session-updated',
				payload: { session },
			});

			return session;
		}),

	/**
	 * Delete session
	 * CASCADE: Automatically deletes all messages, todos, attachments
	 * REACTIVE: Publishes to both session:{id} and sessions channels
	 */
	delete: lens
		.input(z.object({ sessionId: z.string() }))
		.output(z.object({ success: z.boolean(), sessionId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const { sessionId } = input;
			await ctx.sessionRepository.deleteSession(sessionId);

			// Publish to session-specific channel (for getById subscribers)
			await ctx.appContext.eventStream.publish(`session:${sessionId}`, {
				type: 'session-deleted',
				payload: { sessionId },
			});

			// Publish to global sessions channel (for session list subscribers)
			await ctx.appContext.eventStream.publish("sessions", {
				type: 'session-deleted',
				payload: { sessionId },
			});

			return { success: true, sessionId };
		}),

	/**
	 * Compact session: Summarize conversation and create new session
	 */
	compact: lens
		.input(z.object({ sessionId: z.string() }))
		.output(z.object({
			success: z.boolean(),
			error: z.string().optional(),
			newSessionId: z.string().optional(),
			summary: z.string().optional(),
			messageCount: z.number().optional(),
		}))
		.mutation(async ({ input, ctx }) => {
			const { sessionId } = input;
			const { compactSession, getProviderConfigWithApiKey } = await import("@sylphx/code-core");

			const session = await ctx.sessionRepository.getSessionById(sessionId);
			if (!session) {
				return { success: false, error: "Session not found" };
			}

			const providerConfig = await getProviderConfigWithApiKey(ctx.aiConfig, session.provider);

			if (!providerConfig) {
				return {
					success: false,
					error: `Provider ${session.provider} is not configured`,
				};
			}

			const result = await compactSession(
				ctx.sessionRepository,
				sessionId,
				providerConfig,
				(status: string, detail?: string) => {
					console.log(`[Compact] ${status}: ${detail || ""}`);
				},
			);

			if (!result.success) {
				return { success: false, error: result.error };
			}

			// Get new session for publishing
			const newSession = await ctx.sessionRepository.getSessionById(result.newSessionId!);

			// Publish session-deleted for old session
			await ctx.appContext.eventStream.publish(`session:${sessionId}`, {
				type: 'session-deleted',
				payload: { sessionId },
			});

			// Publish session-created for new session
			await ctx.appContext.eventStream.publish("sessions", {
				type: "session-created",
				payload: { session: newSession },
			});

			// Also publish compacted event to sessions channel for special handling
			await ctx.appContext.eventStream.publish("sessions", {
				type: "session-compacted",
				payload: {
					oldSessionId: sessionId,
					newSessionId: result.newSessionId!,
					summary: result.summary!,
					messageCount: result.messageCount!,
				},
			});

			return result;
		}),
});

/**
 * Message API
 */
export const messageAPI = lens.object({
	/**
	 * Trigger AI streaming
	 * MUTATION: Starts streaming in background, returns sessionId
	 *
	 * Architecture:
	 * - Client calls this mutation to trigger streaming
	 * - Server streams in background and publishes events to event bus
	 * - Client receives events via events.subscribeToSession
	 *
	 * Queue Logic:
	 * - If session is already streaming, enqueues message instead
	 * - Returns { sessionId, queued: true }
	 *
	 * Lazy Sessions:
	 * - If sessionId is null, creates new session
	 * - Returns new sessionId
	 */
	triggerStream: lens
		.input(z.object({
			sessionId: z.string().nullish(),
			agentId: z.string().optional(),
			provider: z.string().optional(), // Required if sessionId is null
			model: z.string().optional(), // Required if sessionId is null
			content: z.array(ParsedContentPartSchema), // User message content
		}))
		.output(z.object({
			success: z.boolean(),
			sessionId: z.string(),
			queued: z.boolean().optional(),
		}))
		.mutation(async ({ input, ctx }) => {
			// Import streaming orchestration (implemented in code-server)
			const { triggerStreamMutation } = await import("../../code-server/src/services/streaming-mutations.service.js");

			return await triggerStreamMutation({
				appContext: ctx.appContext,
				sessionRepository: ctx.sessionRepository,
				messageRepository: ctx.messageRepository,
				aiConfig: ctx.aiConfig,
				input,
			});
		}),

	/**
	 * Abort active stream
	 * MUTATION: Aborts server-side streaming for a session
	 */
	abortStream: lens
		.input(z.object({
			sessionId: z.string(),
		}))
		.output(z.object({
			success: z.boolean(),
			message: z.string(),
		}))
		.mutation(async ({ input }) => {
			// Import abort logic (implemented in code-server)
			const { abortStreamMutation } = await import("../../code-server/src/services/streaming-mutations.service.js");

			return await abortStreamMutation(input.sessionId);
		}),

	/**
	 * Stream AI response (DEPRECATED - use triggerStream + events.subscribeToSession)
	 * REACTIVE: Returns Observable of streaming events
	 */
	streamResponse: lens
		.input(z.object({
			sessionId: z.string(),
			userMessageContent: z.string().nullable(),
		}))
		.output(StreamEventSchema)
		.query(
			async ({ input, ctx }) => {
				const { sessionId, userMessageContent } = input;
				throw new Error("Use subscribe() method for streaming");
			},
			({ input, ctx }): Observable<StreamEvent> => {
				const { sessionId, userMessageContent } = input;
				const { streamAIResponse } = require("../../code-server/src/services/streaming.service.js");

				return streamAIResponse({
					appContext: ctx.appContext,
					sessionRepository: ctx.sessionRepository,
					messageRepository: ctx.messageRepository,
					aiConfig: ctx.aiConfig,
					sessionId,
					userMessageContent,
				});
			}
		),
});

/**
 * Todo API
 */
export const todoAPI = lens.object({
	/**
	 * Update todos for session
	 * Atomically replaces all todos
	 * OPTIMISTIC: UI updates immediately, confirms on success, rolls back on error
	 */
	update: lens
		.input(z.object({
			sessionId: z.string(),
			todos: z.array(TodoSchema),
			nextTodoId: z.number(),
		}))
		.output(z.void())
		.optimistic((opt) => opt
			.entity('Session')
			.id($ => $.sessionId)
			.apply((draft, input, t) => {
				draft.todos = input.todos as any;
				draft.updatedAt = t.now();
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { sessionId, todos, nextTodoId } = input;
			await ctx.todoRepository.updateTodos(sessionId, todos, nextTodoId);
			// Note: Todos are stored per-session, no real-time sync needed
		}),
});

/**
 * File API
 * Handles immediate file uploads and downloads for multi-client architecture
 * ARCHITECTURE: Files uploaded immediately on paste/select, stored in object storage, referenced by fileId
 */
export const fileAPI = lens.object({
	/**
	 * Upload file to object storage
	 * Returns fileId for referencing in messages
	 *
	 * Flow:
	 * 1. User pastes/selects file
	 * 2. Client uploads immediately (this endpoint)
	 * 3. Returns fileId
	 * 4. Client stores fileId in state
	 * 5. On submit, client sends fileId (not content)
	 *
	 * ORPHAN HANDLING: Files uploaded but not used in messages within 24h are cleaned up
	 */
	upload: lens
		.input(z.object({
			relativePath: z.string(), // Display name (e.g., "image.png" or "src/app.ts")
			mediaType: z.string(), // MIME type (e.g., "image/png")
			size: z.number(), // File size in bytes
			content: z.string(), // Base64 encoded file content
		}))
		.output(z.object({
			fileId: z.string(),
			sha256: z.string(),
			url: z.string(),
		}))
		.mutation(async ({ input, ctx }) => {
			const { relativePath, mediaType, size, content } = input;
			const { createHash } = await import("node:crypto");

			// Get FileRepository via MessageRepository
			const fileRepo = ctx.messageRepository.getFileRepository();

			// Decode base64 to Buffer
			const buffer = Buffer.from(content, "base64");

			// Validate size matches
			if (buffer.length !== size) {
				throw new Error(`Size mismatch: expected ${size} bytes, got ${buffer.length} bytes`);
			}

			// Calculate SHA256 for deduplication
			const sha256 = createHash("sha256").update(buffer).digest("hex");

			// Store file to object storage
			// ORPHAN: stepId is temporary UUID, will be replaced when associated with message
			// Use null for orphaned files (ChatGPT-style immediate upload)
			const fileId = await fileRepo.storeFileContent(
				{
					stepId: undefined as any, // Orphaned file - will be linked when message created
					ordering: 0,
					relativePath,
					mediaType,
					content: buffer,
				},
				undefined, // No transaction
			);

			return {
				fileId,
				sha256,
				url: `/api/trpc/file.download?input=${encodeURIComponent(JSON.stringify({ fileId }))}`,
			};
		}),

	/**
	 * Download file from object storage
	 * Returns file content for preview/download
	 *
	 * PUBLIC: Allow clients to fetch files they have fileId for
	 * (fileIds are UUIDs, hard to guess)
	 */
	download: lens
		.input(z.object({
			fileId: z.string(),
		}))
		.output(z.object({
			fileId: z.string(),
			relativePath: z.string(),
			mediaType: z.string(),
			size: z.number(),
			content: z.string(), // Base64 encoded
			sha256: z.string(),
			createdAt: z.number(),
		}))
		.query(async ({ input, ctx }) => {
			const { fileId } = input;
			// Get FileRepository via MessageRepository
			const fileRepo = ctx.messageRepository.getFileRepository();

			// Fetch file from object storage
			const file = await fileRepo.getFileContent(fileId);

			if (!file) {
				throw new Error(`File not found: ${fileId}`);
			}

			return {
				fileId: file.id,
				relativePath: file.relativePath,
				mediaType: file.mediaType,
				size: file.size,
				content: file.content.toString("base64"),
				sha256: file.sha256,
				createdAt: file.createdAt,
			};
		}),

	/**
	 * Get file metadata without content
	 * Useful for checking if file exists and getting size/type
	 */
	getMetadata: lens
		.input(z.object({
			fileId: z.string(),
		}))
		.output(z.object({
			fileId: z.string(),
			relativePath: z.string(),
			mediaType: z.string(),
			size: z.number(),
			sha256: z.string(),
			createdAt: z.number(),
		}))
		.query(async ({ input, ctx }) => {
			const { fileId } = input;
			const fileRepo = ctx.messageRepository.getFileRepository();
			const file = await fileRepo.getFileContent(fileId);

			if (!file) {
				throw new Error(`File not found: ${fileId}`);
			}

			return {
				fileId: file.id,
				relativePath: file.relativePath,
				mediaType: file.mediaType,
				size: file.size,
				sha256: file.sha256,
				createdAt: file.createdAt,
			};
		}),
});

/**
 * Bash API
 * tRPC API for bash process management
 */
export const bashAPI = lens.object({
	/**
	 * Execute bash command (active/background)
	 *
	 * Usage:
	 * - Active bash: blocks if slot occupied
	 * - Background bash: spawns immediately
	 */
	execute: lens
		.input(z.object({
			command: z.string().min(1),
			mode: z.enum(["active", "background"]).default("active"),
			cwd: z.string().optional(),
			timeout: z.number().min(1000).max(600000).default(120000).optional(),
		}))
		.output(z.object({
			bashId: z.string(),
			command: z.string(),
			mode: z.enum(["active", "background"]),
		}))
		.mutation(async ({ input, ctx }) => {
			const { command, mode, cwd, timeout } = input;
			const { bashManagerV2 } = ctx.appContext;

			const bashId = await bashManagerV2.execute(command, {
				mode,
				cwd,
				timeout,
			});

			return {
				bashId,
				command,
				mode,
			};
		}),

	/**
	 * List all bash processes
	 */
	list: lens
		.output(z.array(z.any())) // BashProcess array
		.query(async ({ ctx }) => {
			const { bashManagerV2 } = ctx.appContext;
			return bashManagerV2.list();
		}),

	/**
	 * Get bash process info
	 */
	get: lens
		.input(z.object({
			bashId: z.string(),
		}))
		.output(z.object({
			id: z.string(),
			command: z.string(),
			mode: z.enum(["active", "background"]),
			status: z.enum(["running", "completed", "failed", "killed", "timeout"]),
			isActive: z.boolean(),
			startTime: z.number(),
			endTime: z.number().optional(),
			exitCode: z.number().optional(),
			cwd: z.string().optional(),
			duration: z.number(),
			stdout: z.string(),
			stderr: z.string(),
		}))
		.query(async ({ input, ctx }) => {
			const { bashId } = input;
			const { bashManagerV2 } = ctx.appContext;
			const proc = bashManagerV2.get(bashId);

			if (!proc) {
				throw new Error(`Bash process not found: ${bashId}`);
			}

			return {
				id: proc.id,
				command: proc.command,
				mode: proc.mode,
				status: proc.status,
				isActive: bashManagerV2.getActiveBashId() === proc.id,
				startTime: proc.startTime,
				endTime: proc.endTime,
				exitCode: proc.exitCode,
				cwd: proc.cwd,
				duration: (proc.endTime || Date.now()) - proc.startTime,
				stdout: proc.stdout,
				stderr: proc.stderr,
			};
		}),

	/**
	 * Kill bash process
	 */
	kill: lens
		.input(z.object({
			bashId: z.string(),
		}))
		.output(z.object({
			success: z.boolean(),
			bashId: z.string(),
		}))
		.mutation(async ({ input, ctx }) => {
			const { bashId } = input;
			const { bashManagerV2 } = ctx.appContext;
			const success = bashManagerV2.kill(bashId);

			if (!success) {
				throw new Error(`Failed to kill bash process: ${bashId}`);
			}

			return { success: true, bashId };
		}),

	/**
	 * Demote active bash → background (Ctrl+B)
	 */
	demote: lens
		.input(z.object({
			bashId: z.string(),
		}))
		.output(z.object({
			success: z.boolean(),
			bashId: z.string(),
			mode: z.literal("background"),
		}))
		.mutation(async ({ input, ctx }) => {
			const { bashId } = input;
			const { bashManagerV2 } = ctx.appContext;
			const success = bashManagerV2.demote(bashId);

			if (!success) {
				throw new Error(`Failed to demote bash: ${bashId} (not active or not found)`);
			}

			return { success: true, bashId, mode: "background" as const };
		}),

	/**
	 * Promote background bash → active (waits for slot)
	 */
	promote: lens
		.input(z.object({
			bashId: z.string(),
		}))
		.output(z.object({
			success: z.boolean(),
			bashId: z.string(),
			mode: z.literal("active"),
		}))
		.mutation(async ({ input, ctx }) => {
			const { bashId } = input;
			const { bashManagerV2 } = ctx.appContext;
			const success = await bashManagerV2.promote(bashId);

			if (!success) {
				throw new Error(`Failed to promote bash: ${bashId} (not background, not running, or not found)`);
			}

			return { success: true, bashId, mode: "active" as const };
		}),

	/**
	 * Get active bash info
	 */
	getActive: lens
		.output(z.object({
			id: z.string(),
			command: z.string(),
			mode: z.enum(["active", "background"]),
			status: z.enum(["running", "completed", "failed", "killed", "timeout"]),
			startTime: z.number(),
			cwd: z.string().optional(),
			duration: z.number(),
		}).nullable())
		.query(async ({ ctx }) => {
			const { bashManagerV2 } = ctx.appContext;
			const activeBashId = bashManagerV2.getActiveBashId();

			if (!activeBashId) {
				return null;
			}

			const proc = bashManagerV2.get(activeBashId);
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
		}),

	/**
	 * Get active queue length
	 */
	getActiveQueueLength: lens
		.output(z.object({
			count: z.number(),
		}))
		.query(async ({ ctx }) => {
			const { bashManagerV2 } = ctx.appContext;
			return { count: bashManagerV2.getActiveQueueLength() };
		}),
});

/**
 * Admin API
 * System management operations (admin-only)
 * SECURITY: Function level authorization (OWASP API5) + API Inventory (OWASP API9)
 */
export const adminAPI = lens.object({
	/**
	 * Delete all sessions (admin-only)
	 * SECURITY: Requires admin role (in-process CLI only)
	 * Dangerous operation - removes all data
	 */
	deleteAllSessions: lens
		.input(z.object({
			confirm: z.literal(true),
		}))
		.output(z.object({
			success: z.boolean(),
			deletedCount: z.number(),
			message: z.string(),
		}))
		.mutation(async ({ input, ctx }) => {
			const { confirm } = input;
			// Get all sessions
			const sessions = await ctx.sessionRepository.getRecentSessionsMetadata(1000);

			// Clear ask queues and delete each session (cascade deletes messages, todos, attachments)
			const { clearSessionAsks } = await import("../../code-server/src/services/ask-queue.service.js");
			let deletedCount = 0;
			for (const session of sessions.sessions) {
				clearSessionAsks(session.id);
				await ctx.sessionRepository.deleteSession(session.id);
				deletedCount++;
			}

			return {
				success: true,
				deletedCount,
				message: `Deleted ${deletedCount} sessions`,
			};
		}),

	/**
	 * Get system statistics (admin-only)
	 * SECURITY: Requires admin role
	 * Shows internal metrics not exposed to regular users
	 */
	getSystemStats: lens
		.output(z.object({
			sessions: z.object({
				total: z.number(),
				avgMessagesPerSession: z.number(),
			}),
			messages: z.object({
				total: z.number(),
			}),
			config: z.object({
				providers: z.array(z.string()),
				defaultProvider: z.string().optional(),
				defaultModel: z.string().optional(),
			}),
		}))
		.query(async ({ ctx }) => {
			const sessionCount = await ctx.sessionRepository.getSessionCount();

			// Get all sessions to calculate stats
			const sessions = await ctx.sessionRepository.getRecentSessionsMetadata(1000);

			// Calculate message count across all sessions
			let totalMessages = 0;
			for (const session of sessions.sessions) {
				totalMessages += session.messageCount || 0;
			}

			return {
				sessions: {
					total: sessionCount,
					avgMessagesPerSession: sessionCount > 0 ? totalMessages / sessionCount : 0,
				},
				messages: {
					total: totalMessages,
				},
				config: {
					providers: Object.keys(ctx.aiConfig.providers || {}),
					defaultProvider: ctx.aiConfig.defaultProvider,
					defaultModel: ctx.aiConfig.defaultModel,
				},
			};
		}),

	/**
	 * Get server health (public - for monitoring)
	 * No authorization required
	 */
	getHealth: lens
		.output(z.object({
			status: z.literal("ok"),
			timestamp: z.number(),
			uptime: z.number(),
			memory: z.object({
				used: z.number(),
				total: z.number(),
			}),
		}))
		.query(async ({ ctx }) => {
			return {
				status: "ok" as const,
				timestamp: Date.now(),
				uptime: process.uptime(),
				memory: {
					used: process.memoryUsage().heapUsed,
					total: process.memoryUsage().heapTotal,
				},
			};
		}),

	/**
	 * Force garbage collection (admin-only)
	 * SECURITY: Requires admin role
	 * System management operation
	 */
	forceGC: lens
		.output(z.object({
			success: z.boolean(),
			message: z.string(),
		}))
		.mutation(async ({ ctx }) => {
			if (global.gc) {
				global.gc();
				return { success: true, message: "Garbage collection triggered" };
			} else {
				return {
					success: false,
					message: "GC not exposed. Run with --expose-gc flag",
				};
			}
		}),

	/**
	 * Get API inventory (public - for documentation)
	 * SECURITY: OWASP API9 compliance
	 * Shows all available endpoints, their types, and requirements
	 */
	getAPIInventory: lens
		.output(z.any()) // API inventory structure
		.query(async ({ ctx }) => {
			const { getAPIInventory } = await import("../../code-server/src/utils/api-inventory.js");
			return getAPIInventory();
		}),

	/**
	 * Get API documentation (public - for developers)
	 * SECURITY: OWASP API9 compliance
	 * Returns Markdown-formatted API reference
	 */
	getAPIDocs: lens
		.input(z.object({
			format: z.enum(["json", "markdown"]).default("json"),
		}))
		.output(z.any()) // String (markdown) or object (json)
		.query(async ({ input, ctx }) => {
			const { format } = input;
			const { getAPIInventory, generateMarkdownDocs } = await import("../../code-server/src/utils/api-inventory.js");

			if (format === "markdown") {
				return generateMarkdownDocs();
			}
			return getAPIInventory();
		}),
});

/**
 * Events API
 * Generic event stream subscriptions with cursor-based replay
 *
 * Architecture:
 * - Channel-based routing (sessions, session:{id}, config:*, app:*)
 * - Exact channel matching subscriptions
 * - Cursor-based replay from database
 * - Real-time push via observables
 *
 * Channel Structure (Model-Level Events):
 * - 'sessions' - Global session list updates (create, delete, compact)
 * - 'session:{id}' - Specific session updates (title, model, provider, rules, agent)
 * - Update strategies (delta, patch, auto) handle transmission optimization
 */
export const eventsAPI = lens.object({
	/**
	 * Subscribe to events by channel
	 *
	 * Channel examples:
	 * - 'session:abc123' - Specific session (session-updated, session-deleted)
	 * - 'sessions' - All session list events (session-created, session-deleted, session-compacted)
	 * - 'config:ai' - AI config changes
	 *
	 * Cursor-based replay:
	 * - If fromCursor provided, replays events AFTER that cursor from database
	 * - Then continues with real-time events
	 */
	subscribe: lens
		.input(z.object({
			channel: z.string(), // Exact channel (e.g., 'session:abc123', 'session-events')
			fromCursor: z.object({
				timestamp: z.number(),
				sequence: z.number(),
			}).optional(), // Resume from cursor (undefined = only new events)
		}))
		.output(z.object({
			id: z.string(),
			cursor: z.object({
				timestamp: z.number(),
				sequence: z.number(),
			}),
			channel: z.string(),
			type: z.string(),
			timestamp: z.number(),
			payload: z.any(),
		}))
		.query(
			async ({ input, ctx }) => {
				const { channel, fromCursor } = input;
				throw new Error("Use subscribe() method for event streaming");
			},
			({ input, ctx }): Observable<any> => {
				const { channel, fromCursor } = input;
				return ctx.appContext.eventStream.subscribe(channel, fromCursor);
			}
		),

	/**
	 * Subscribe to specific session with auto-replay of latest N events
	 *
	 * Convenience wrapper around subscribe() for common use case.
	 * Automatically replays last N events + continues with real-time.
	 */
	subscribeToSession: lens
		.input(z.object({
			sessionId: z.string(),
			replayLast: z.number().min(0).max(100).default(0), // Replay last N events
		}))
		.output(z.object({
			id: z.string(),
			cursor: z.object({
				timestamp: z.number(),
				sequence: z.number(),
			}),
			channel: z.string(),
			type: z.string(),
			timestamp: z.number(),
			payload: z.any(),
		}))
		.query(
			async ({ input, ctx }) => {
				const { sessionId, replayLast } = input;
				throw new Error("Use subscribe() method for event streaming");
			},
			({ input, ctx }): Observable<any> => {
				const { sessionId, replayLast } = input;
				const channel = `session:${sessionId}`;
				return ctx.appContext.eventStream.subscribeWithHistory(channel, replayLast);
			}
		),

	/**
	 * Subscribe to all session events (session list sync)
	 *
	 * Subscribes to 'sessions' channel for multi-client session list sync.
	 * Receives events: session-created, session-deleted, session-compacted
	 * Model-level events only (no field-level events)
	 */
	subscribeToAllSessions: lens
		.input(z.object({
			replayLast: z.number().min(0).max(100).default(20), // Replay last N events
		}))
		.output(z.object({
			id: z.string(),
			cursor: z.object({
				timestamp: z.number(),
				sequence: z.number(),
			}),
			channel: z.string(),
			type: z.string(),
			timestamp: z.number(),
			payload: z.any(),
		}))
		.query(
			async ({ input, ctx }) => {
				const { replayLast } = input;
				throw new Error("Use subscribe() method for event streaming");
			},
			({ input, ctx }): Observable<any> => {
				const { replayLast } = input;
				const channel = "sessions";
				return ctx.appContext.eventStream.subscribeWithHistory(channel, replayLast);
			}
		),

	/**
	 * Get channel info (for debugging)
	 *
	 * Returns:
	 * - inMemoryCount: Number of active subscribers
	 * - persistedCount: Total events in database
	 * - firstId/lastId: Range of event IDs
	 */
	getChannelInfo: lens
		.input(z.object({
			channel: z.string(),
		}))
		.output(z.any()) // Channel info structure
		.query(async ({ input, ctx }) => {
			const { channel } = input;
			return await ctx.appContext.eventStream.info(channel);
		}),

	/**
	 * Cleanup old events from a channel
	 * Keeps last N events, deletes older ones
	 */
	cleanupChannel: lens
		.input(z.object({
			channel: z.string(),
			keepLast: z.number().min(1).max(1000).default(100),
		}))
		.output(z.object({
			success: z.boolean(),
		}))
		.mutation(async ({ input, ctx }) => {
			const { channel, keepLast } = input;
			await ctx.appContext.eventStream.cleanupChannel(channel, keepLast);
			return { success: true };
		}),
});

/**
 * Config API
 * Backend-only configuration management (file system access)
 * REACTIVE: Emits events for all state changes
 * SECURITY: Protected mutations (OWASP API2) + Rate limiting (OWASP API4)
 */
export const configAPI = lens.object({
	/**
	 * Load AI config from file system
	 * Backend reads files, UI stays clean
	 *
	 * SECURITY: Removes sensitive fields (API keys) before returning to client
	 * - API keys REMOVED entirely (not masked)
	 * - Client never sees keys (zero-knowledge)
	 * - Server merges keys from disk during save operations
	 */
	load: lens
		.input(z.object({
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.object({
			success: z.literal(true),
			config: z.any(), // AIConfig structure (sanitized)
		}))
		.query(async ({ input, ctx }) => {
			const { cwd } = input;
			const { loadAIConfig } = await import("@sylphx/code-core");

			// Sanitize config helper
			const sanitizeAIConfig = async (config: any): Promise<any> => {
				if (!config.providers) {
					return config;
				}

				const { getProvider } = await import("@sylphx/code-core");
				const sanitizedProviders: Record<string, any> = {};

				for (const [providerId, providerConfig] of Object.entries(config.providers)) {
					const sanitizedProvider: Record<string, any> = {};

					// Get provider schema to know which fields are secret
					let secretFields: Set<string>;
					try {
						const provider = getProvider(providerId as any);
						const configSchema = provider.getConfigSchema();
						// Extract field keys marked as secret
						secretFields = new Set(
							configSchema.filter((field: any) => field.secret === true).map((field: any) => field.key),
						);
					} catch (_error) {
						// Fallback: if provider not found, remove nothing
						console.warn(`Provider ${providerId} not found for config sanitization`);
						secretFields = new Set();
					}

					for (const [fieldName, fieldValue] of Object.entries(providerConfig as any)) {
						if (!secretFields.has(fieldName)) {
							// Keep non-secret field as-is
							sanitizedProvider[fieldName] = fieldValue;
						}
					}

					sanitizedProviders[providerId] = sanitizedProvider;
				}

				return {
					...config,
					providers: sanitizedProviders,
				};
			};

			const result = await loadAIConfig(cwd);
			if (result.success) {
				// Sanitize config: REMOVE sensitive fields
				const sanitizedConfig = await sanitizeAIConfig(result.data);
				return { success: true as const, config: sanitizedConfig };
			}
			// No config yet - return empty
			return { success: true as const, config: { providers: {} } };
		}),

	/**
	 * Get config file paths
	 * Useful for debugging
	 */
	getPaths: lens
		.input(z.object({
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.any()) // Path info structure
		.query(async ({ input, ctx }) => {
			const { cwd } = input;
			const { getAIConfigPaths } = await import("@sylphx/code-core");
			return getAIConfigPaths(cwd);
		}),

	/**
	 * Get all available providers
	 * Returns provider metadata (id, name, description, isConfigured)
	 * SECURITY: No sensitive data exposed
	 */
	getProviders: lens
		.input(z.object({
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.record(z.string(), z.object({
			id: z.string(),
			name: z.string(),
			description: z.string(),
			isConfigured: z.boolean(),
		})))
		.query(async ({ input, ctx }) => {
			const { cwd } = input;
			const { loadAIConfig, AI_PROVIDERS, getProvider } = await import("@sylphx/code-core");

			const configResult = await loadAIConfig(cwd);

			if (!configResult.success) {
				throw new Error("Failed to load AI config");
			}

			const config = configResult.data;

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
		}),

	/**
	 * Get provider config schema
	 * Returns the configuration fields required for a provider
	 * SECURITY: No sensitive data - just schema definition
	 */
	getProviderSchema: lens
		.input(z.object({
			providerId: z.string(),
		}))
		.output(z.union([
			z.object({
				success: z.literal(true),
				schema: z.array(z.any()),
			}),
			z.object({
				success: z.literal(false),
				error: z.string(),
			}),
		]))
		.query(async ({ input, ctx }) => {
			const { providerId } = input;
			try {
				const { getProvider } = await import("@sylphx/code-core");
				const provider = getProvider(providerId as any);
				const schema = provider.getConfigSchema();
				return { success: true as const, schema };
			} catch (error) {
				return {
					success: false as const,
					error: error instanceof Error ? error.message : "Failed to get provider schema",
				};
			}
		}),

	/**
	 * Get tokenizer info for a model
	 * Returns tokenizer name and status
	 */
	getTokenizerInfo: lens
		.input(z.object({
			model: z.string(),
		}))
		.output(z.any()) // Tokenizer info structure
		.query(async ({ input, ctx }) => {
			const { model } = input;
			const { getTokenizerInfo } = await import("@sylphx/code-core");
			return getTokenizerInfo(model);
		}),

	/**
	 * Count tokens for text
	 * Uses model-specific tokenizer
	 */
	countTokens: lens
		.input(z.object({
			text: z.string(),
			model: z.string().optional(),
		}))
		.output(z.object({
			count: z.number(),
		}))
		.query(async ({ input, ctx }) => {
			const { text, model } = input;
			const { countTokens } = await import("@sylphx/code-core");
			const count = await countTokens(text, model);
			return { count };
		}),

	/**
	 * Count tokens for file
	 * Reads file from disk and counts tokens using model-specific tokenizer
	 * ARCHITECTURE: Server reads file, client should never read files directly
	 */
	countFileTokens: lens
		.input(z.object({
			filePath: z.string(),
			model: z.string().optional(),
		}))
		.output(z.union([
			z.object({
				success: z.literal(true),
				count: z.number(),
			}),
			z.object({
				success: z.literal(false),
				error: z.string(),
			}),
		]))
		.query(async ({ input, ctx }) => {
			const { filePath, model } = input;
			const { readFile } = await import("node:fs/promises");
			const { countTokens } = await import("@sylphx/code-core");

			try {
				const content = await readFile(filePath, "utf8");
				const count = await countTokens(content, model);
				return { success: true as const, count };
			} catch (error) {
				return {
					success: false as const,
					error: error instanceof Error ? error.message : "Failed to read file",
				};
			}
		}),

	/**
	 * Scan project files
	 * Returns filtered file list
	 */
	scanProjectFiles: lens
		.input(z.object({
			cwd: z.string().default(process.cwd()),
			query: z.string().optional(),
		}))
		.output(z.object({
			files: z.array(z.string()),
		}))
		.query(async ({ input, ctx }) => {
			const { cwd, query } = input;
			const { scanProjectFiles, filterFiles } = await import("@sylphx/code-core");
			const fileInfos = await scanProjectFiles(cwd);
			const files = query ? filterFiles(fileInfos, query).map(f => f.relativePath) : fileInfos.map(f => f.relativePath);
			return { files };
		}),

	/**
	 * Get model details (context length, pricing, capabilities, etc.)
	 * SECURITY: No API keys needed - uses hardcoded metadata
	 */
	getModelDetails: lens
		.input(z.object({
			providerId: z.string(),
			modelId: z.string(),
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.union([
			z.object({
				success: z.literal(true),
				details: z.any(), // Model details structure
			}),
			z.object({
				success: z.literal(false),
				error: z.string(),
			}),
		]))
		.query(async ({ input, ctx }) => {
			const { providerId, modelId, cwd } = input;
			try {
				const { getProvider, loadAIConfig, getProviderConfigWithApiKey, enrichModelDetails, enrichCapabilities } = await import("@sylphx/code-core");
				const provider = getProvider(providerId as any);

				// Try to get provider config with API key (optional)
				let config: any;
				try {
					const aiConfigResult = await loadAIConfig(cwd);
					if (aiConfigResult.success) {
						const aiConfig = aiConfigResult.data;
						config = await getProviderConfigWithApiKey(aiConfig, providerId as any);
					}
				} catch {
					// Config not available - continue without it
				}

				// Get model details and capabilities from provider
				const details = await provider.getModelDetails(modelId, config);
				const providerCapabilities = provider.getModelCapabilities(modelId);

				// Enrich with models.dev fallback
				const enrichedDetails = await enrichModelDetails(modelId, details);

				// Fetch models.dev data for capabilities enrichment
				const modelsDevData = await fetch("https://models.dev/api.json", {
					signal: AbortSignal.timeout(10000),
				})
					.then((res) => (res.ok ? res.json() : null))
					.catch(() => null);

				const enrichedCapabilities = enrichCapabilities(
					modelId,
					providerCapabilities,
					modelsDevData as any,
				);

				return {
					success: true as const,
					details: {
						...enrichedDetails,
						capabilities: enrichedCapabilities,
					},
				};
			} catch (error) {
				return {
					success: false as const,
					error: error instanceof Error ? error.message : "Failed to get model details",
				};
			}
		}),

	/**
	 * Fetch models from provider API
	 * SERVER-SIDE: Loads config with API keys, calls provider API
	 * ARCHITECTURE: Client = Pure UI, Server = Business logic + File access
	 */
	fetchModels: lens
		.input(z.object({
			providerId: z.string(),
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.union([
			z.object({
				success: z.literal(true),
				models: z.array(z.object({
					id: z.string(),
					name: z.string(),
				})),
			}),
			z.object({
				success: z.literal(false),
				error: z.string(),
			}),
		]))
		.query(async ({ input, ctx }) => {
			const { providerId, cwd } = input;
			try {
				const { loadAIConfig, fetchModels } = await import("@sylphx/code-core");

				// Load config with API keys (server-side only)
				const aiConfigResult = await loadAIConfig(cwd);
				if (!aiConfigResult.success) {
					return {
						success: false as const,
						error: aiConfigResult.error.message,
					};
				}

				const aiConfig = aiConfigResult.data;
				const providerConfig = aiConfig.providers?.[providerId];

				if (!providerConfig) {
					return {
						success: false as const,
						error: `Provider ${providerId} is not configured. Please configure it using /provider first.`,
					};
				}

				// Fetch models from provider API (server-side)
				const models = await fetchModels(providerId as any, providerConfig);

				// Transform to completion format
				const modelList = models.map((m: any) => ({
					id: m.id,
					name: m.name,
				}));

				return {
					success: true as const,
					models: modelList,
				};
			} catch (error) {
				return {
					success: false as const,
					error: error instanceof Error ? error.message : "Failed to fetch models",
				};
			}
		}),

	/**
	 * Update default provider
	 * REACTIVE: Emits config:default-provider-updated event
	 */
	updateDefaultProvider: lens
		.input(z.object({
			provider: z.string(),
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.union([
			z.object({ success: z.literal(true) }),
			z.object({ success: z.literal(false), error: z.string() }),
		]))
		.mutation(async ({ input, ctx }) => {
			const { provider, cwd } = input;
			const { loadAIConfig, saveAIConfig } = await import("@sylphx/code-core");

			const result = await loadAIConfig(cwd);
			if (!result.success) {
				return { success: false as const, error: result.error.message };
			}

			const updated = { ...result.data, defaultProvider: provider };
			const saveResult = await saveAIConfig(updated, cwd);

			if (saveResult.success) {
				return { success: true as const };
			}
			return { success: false as const, error: saveResult.error.message };
		}),

	/**
	 * Update default model
	 * REACTIVE: Emits config:default-model-updated event
	 */
	updateDefaultModel: lens
		.input(z.object({
			model: z.string(),
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.union([
			z.object({ success: z.literal(true) }),
			z.object({ success: z.literal(false), error: z.string() }),
		]))
		.mutation(async ({ input, ctx }) => {
			const { model, cwd } = input;
			const { loadAIConfig, saveAIConfig } = await import("@sylphx/code-core");

			const result = await loadAIConfig(cwd);
			if (!result.success) {
				return { success: false as const, error: result.error.message };
			}

			const updated = { ...result.data, defaultModel: model };
			const saveResult = await saveAIConfig(updated, cwd);

			if (saveResult.success) {
				return { success: true as const };
			}
			return { success: false as const, error: saveResult.error.message };
		}),

	/**
	 * Update provider configuration
	 * REACTIVE: Emits config:provider-updated or config:provider-added event
	 *
	 * ZERO-KNOWLEDGE: Client never sends secrets
	 * - Client only sends non-secret fields (model, etc)
	 * - Server auto-merges ALL secret fields from disk
	 * - To update secrets, use dedicated setProviderSecret mutation
	 */
	updateProviderConfig: lens
		.input(z.object({
			providerId: z.string(),
			config: z.record(z.string(), z.any()),
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.union([
			z.object({ success: z.literal(true) }),
			z.object({ success: z.literal(false), error: z.string() }),
		]))
		.mutation(async ({ input, ctx }) => {
			const { providerId, config, cwd } = input;
			const { loadAIConfig, saveAIConfig, getProvider } = await import("@sylphx/code-core");

			const result = await loadAIConfig(cwd);
			if (!result.success) {
				return { success: false as const, error: result.error.message };
			}

			const currentProviderConfig = result.data.providers?.[providerId] || {};
			const mergedProviderConfig: Record<string, any> = { ...config };

			// Always merge ALL secret fields from disk (client never sends them)
			try {
				const provider = getProvider(providerId as any);
				const configSchema = provider.getConfigSchema();
				const secretFields = new Set(
					configSchema.filter((field: any) => field.secret === true).map((field: any) => field.key),
				);

				// Preserve all secrets from disk
				for (const fieldName of secretFields) {
					const currentValue = currentProviderConfig[fieldName];
					if (currentValue !== undefined) {
						mergedProviderConfig[fieldName] = currentValue;
					}
				}
			} catch (_error) {
				console.warn(`Provider ${providerId} not found during config merge`);
			}

			const updated = {
				...result.data,
				providers: {
					...result.data.providers,
					[providerId]: mergedProviderConfig,
				},
			};

			const saveResult = await saveAIConfig(updated, cwd);

			if (saveResult.success) {
				return { success: true as const };
			}
			return { success: false as const, error: saveResult.error.message };
		}),

	/**
	 * Set a provider secret field (API key, token, etc)
	 *
	 * Dedicated endpoint for updating secrets
	 * - Client can set new secret without seeing existing value
	 * - Follows GitHub/Vercel pattern: blind update
	 * - Only way to update secret fields
	 */
	setProviderSecret: lens
		.input(z.object({
			providerId: z.string(),
			fieldName: z.string(),
			value: z.string(),
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.union([
			z.object({ success: z.literal(true) }),
			z.object({ success: z.literal(false), error: z.string() }),
		]))
		.mutation(async ({ input, ctx }) => {
			const { providerId, fieldName, value, cwd } = input;
			const { loadAIConfig, saveAIConfig, getProvider, createCredential, getDefaultCredential, updateCredential } = await import("@sylphx/code-core");

			const result = await loadAIConfig(cwd);
			if (!result.success) {
				return { success: false as const, error: result.error.message };
			}

			// Verify field is actually a secret field
			try {
				const provider = getProvider(providerId as any);
				const configSchema = provider.getConfigSchema();
				const field = configSchema.find((f: any) => f.key === fieldName);

				if (!field) {
					return {
						success: false as const,
						error: `Field ${fieldName} not found in provider ${providerId} schema`,
					};
				}

				if (!field.secret) {
					return {
						success: false as const,
						error: `Field ${fieldName} is not a secret field. Use updateProviderConfig instead.`,
					};
				}
			} catch (_error) {
				return {
					success: false as const,
					error: `Provider ${providerId} not found`,
				};
			}

			// Create or update credential in registry
			const credential =
				getDefaultCredential(providerId) ||
				createCredential({
					providerId,
					label: `${providerId} API key`,
					apiKey: value,
					scope: "global",
					isDefault: true,
				});

			// Update credential with new API key if it already exists
			if (!credential.isDefault) {
				updateCredential(credential.id, { apiKey: value });
			}

			// Update provider config to reference the credential
			const currentProviderConfig = result.data.providers?.[providerId] || {};
			const { apiKey: _removed, ...configWithoutApiKey } = currentProviderConfig;
			const updatedProviderConfig = {
				...configWithoutApiKey,
				credentialId: credential.id,
			};

			const updated = {
				...result.data,
				providers: {
					...result.data.providers,
					[providerId]: updatedProviderConfig,
				},
			};

			const saveResult = await saveAIConfig(updated, cwd);

			if (saveResult.success) {
				return { success: true as const };
			}
			return { success: false as const, error: saveResult.error.message };
		}),

	/**
	 * Remove provider configuration
	 * REACTIVE: Emits config:provider-removed event
	 */
	removeProvider: lens
		.input(z.object({
			providerId: z.string(),
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.union([
			z.object({ success: z.literal(true) }),
			z.object({ success: z.literal(false), error: z.string() }),
		]))
		.mutation(async ({ input, ctx }) => {
			const { providerId, cwd } = input;
			const { loadAIConfig, saveAIConfig } = await import("@sylphx/code-core");

			const result = await loadAIConfig(cwd);
			if (!result.success) {
				return { success: false as const, error: result.error.message };
			}

			const providers = { ...result.data.providers };
			delete providers[providerId];

			const updated = { ...result.data, providers };
			const saveResult = await saveAIConfig(updated, cwd);

			if (saveResult.success) {
				return { success: true as const };
			}
			return { success: false as const, error: saveResult.error.message };
		}),

	/**
	 * Save AI config to file system
	 * Backend writes files, UI stays clean
	 * REACTIVE: Emits config-updated event
	 *
	 * ZERO-KNOWLEDGE: Client never sends secrets
	 * - Client only sends non-secret fields
	 * - Server auto-merges ALL secret fields from disk
	 * - To update secrets, use dedicated setProviderSecret mutation
	 */
	save: lens
		.input(z.object({
			config: z.any(), // AIConfig structure
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.union([
			z.object({ success: z.literal(true) }),
			z.object({ success: z.literal(false), error: z.string() }),
		]))
		.mutation(async ({ input, ctx }) => {
			const { config, cwd } = input;
			const { loadAIConfig, saveAIConfig, getProvider } = await import("@sylphx/code-core");

			// Load current config from disk to get secrets
			const currentResult = await loadAIConfig(cwd);
			const currentConfig = currentResult.success ? currentResult.data : { providers: {} };

			// Merge incoming config with current config
			const mergedConfig = { ...config };

			if (config.providers && currentConfig.providers) {
				const mergedProviders: Record<string, any> = {};

				for (const [providerId, incomingProviderConfig] of Object.entries(config.providers)) {
					const currentProviderConfig = currentConfig.providers[providerId] || {};
					const mergedProviderConfig: Record<string, any> = {
						...(incomingProviderConfig as Record<string, any>),
					};

					// Get provider schema to identify secret fields
					try {
						const provider = getProvider(providerId as any);
						const configSchema = provider.getConfigSchema();
						const secretFields = new Set(
							configSchema.filter((field: any) => field.secret === true).map((field: any) => field.key),
						);

						// Preserve ALL secrets from disk (client never sends them)
						for (const fieldName of secretFields) {
							const currentValue = currentProviderConfig[fieldName];
							if (currentValue !== undefined) {
								mergedProviderConfig[fieldName] = currentValue;
							}
						}
					} catch (_error) {
						// Provider not found - just use incoming config as-is
						console.warn(`Provider ${providerId} not found during config merge`);
					}

					mergedProviders[providerId] = mergedProviderConfig;
				}

				mergedConfig.providers = mergedProviders;
			}

			const result = await saveAIConfig(mergedConfig, cwd);
			if (result.success) {
				return { success: true as const };
			}
			return { success: false as const, error: result.error.message };
		}),

	/**
	 * Update enabled rules
	 * SERVER DECIDES: If sessionId provided → session table, else → global config
	 * MULTI-CLIENT SYNC: Changes propagate to all clients via event stream
	 */
	updateRules: lens
		.input(z.object({
			ruleIds: z.array(z.string()),
			sessionId: z.string().optional(),
			cwd: z.string().default(process.cwd()),
		}))
		.output(z.union([
			z.object({ success: z.literal(true), scope: z.enum(["session", "global"]) }),
			z.object({ success: z.literal(false), error: z.string() }),
		]))
		.mutation(async ({ input, ctx }) => {
			const { ruleIds, sessionId, cwd } = input;
			if (sessionId) {
				// Session-specific rules → persist to session table
				await ctx.sessionRepository.updateSession(sessionId, {
					enabledRuleIds: ruleIds,
				});
				return { success: true as const, scope: "session" as const };
			} else {
				// Global rules → persist to config file
				const { loadAIConfig, saveAIConfig } = await import("@sylphx/code-core");
				const result = await loadAIConfig(cwd);
				if (!result.success) {
					return { success: false as const, error: result.error.message };
				}

				const updated = {
					...result.data,
					defaultEnabledRuleIds: ruleIds,
				};
				const saveResult = await saveAIConfig(updated, cwd);

				if (saveResult.success) {
					return { success: true as const, scope: "global" as const };
				}
				return { success: false as const, error: saveResult.error.message };
			}
		}),
});

/**
 * Root API
 */
export const api = lens.object({
	session: sessionAPI,
	message: messageAPI,
	todo: todoAPI,
	file: fileAPI,
	bash: bashAPI,
	admin: adminAPI,
	events: eventsAPI,
	config: configAPI,
});

export type API = typeof api;
