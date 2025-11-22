/**
 * Sylphx Code API - Lens definitions
 *
 * All API endpoints defined using Lens framework
 * Provides type-safe queries, mutations, and subscriptions
 */

import { lens } from "@sylphx/lens-core";
import type { Observable } from "rxjs";
import { z } from "zod";
import {
	MessageSchema,
	PaginatedSessionsSchema,
	SessionMetadataSchema,
	SessionSchema,
	StreamEventSchema,
	TodoSchema,
	type Message,
	type PaginatedSessions,
	type Session,
	type SessionMetadata,
	type StreamEvent,
	type Todo,
} from "./schemas/index.js";

/**
 * Context type for API resolvers
 * Will be provided by code-server's AppContext
 */
export interface APIContext {
	sessionRepository: any;
	messageRepository: any;
	todoRepository: any;
	aiConfig: any;
	eventStream: any;
	appContext: any;
}

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
	getRecent: lens.query({
		input: z.object({
			limit: z.number().min(1).max(100).default(20),
			cursor: z.number().optional(),
		}),
		output: PaginatedSessionsSchema,
		resolve: async ({ limit, cursor }: { limit: number; cursor?: number }, ctx?: any) => {
			return await ctx.sessionRepository.getRecentSessionsMetadata(limit, cursor);
		},
	}),

	/**
	 * Get session by ID with full data
	 * LAZY LOADING: Only called when user opens a specific session
	 */
	getById: lens.query({
		input: z.object({ sessionId: z.string() }),
		output: SessionSchema.nullable(),
		resolve: async ({ sessionId }: { sessionId: string }, ctx?: any) => {
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
	}),

	/**
	 * Get session count
	 */
	getCount: lens.query({
		input: z.object({}),
		output: z.number(),
		resolve: async (_input: Record<string, never>, ctx?: any) => {
			return await ctx.sessionRepository.getSessionCount();
		},
	}),

	/**
	 * Get last session (for headless mode)
	 */
	getLast: lens.query({
		input: z.object({}),
		output: SessionSchema.nullable(),
		resolve: async (_input: Record<string, never>, ctx?: any) => {
			return await ctx.sessionRepository.getLastSession();
		},
	}),

	/**
	 * Search sessions by title
	 */
	search: lens.query({
		input: z.object({
			query: z.string(),
			limit: z.number().min(1).max(100).default(20),
			cursor: z.number().optional(),
		}),
		output: PaginatedSessionsSchema,
		resolve: async ({ query, limit, cursor }: { query: string; limit: number; cursor?: number }, ctx?: any) => {
			return await ctx.sessionRepository.searchSessionsMetadata(query, limit, cursor);
		},
	}),

	/**
	 * Create new session
	 * REACTIVE: Emits session-created event via pubsub
	 */
	create: lens.mutation({
		input: z.object({
			provider: z.string(),
			model: z.string(),
			agentId: z.string().optional(),
			enabledRuleIds: z.array(z.string()).optional(),
		}),
		output: SessionSchema,
		resolve: async ({ provider, model, agentId, enabledRuleIds }: { provider: string; model: string; agentId?: string; enabledRuleIds?: string[] }, ctx?: any) => {
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

			// Publish event
			await ctx.pubsub.publish("session-events", {
				type: "session-created",
				sessionId: session.id,
				provider,
				model,
			});

			return session;
		},
	}),

	/**
	 * Update session title
	 */
	updateTitle: lens.mutation({
		input: z.object({
			sessionId: z.string(),
			title: z.string(),
		}),
		output: z.void(),
		resolve: async ({ sessionId, title }: { sessionId: string; title: string }, ctx?: any) => {
			await ctx.sessionRepository.updateSessionTitle(sessionId, title);

			await ctx.appContext.eventStream.publish("session-events", {
				type: "session-title-updated",
				sessionId,
				title,
			});
		},
	}),

	/**
	 * Update session model
	 */
	updateModel: lens.mutation({
		input: z.object({
			sessionId: z.string(),
			model: z.string(),
		}),
		output: z.void(),
		resolve: async ({ sessionId, model }: { sessionId: string; model: string }, ctx?: any) => {
			await ctx.sessionRepository.updateSessionModel(sessionId, model);

			await ctx.appContext.eventStream.publish("session-events", {
				type: "session-model-updated",
				sessionId,
				model,
			});
		},
	}),

	/**
	 * Update session provider and model
	 */
	updateProvider: lens.mutation({
		input: z.object({
			sessionId: z.string(),
			provider: z.string(),
			model: z.string(),
		}),
		output: z.void(),
		resolve: async ({ sessionId, provider, model }: { sessionId: string; provider: string; model: string }, ctx?: any) => {
			await ctx.sessionRepository.updateSessionProvider(sessionId, provider, model);

			await ctx.appContext.eventStream.publish("session-events", {
				type: "session-provider-updated",
				sessionId,
				provider,
				model,
			});
		},
	}),

	/**
	 * Update session enabled rules
	 */
	updateRules: lens.mutation({
		input: z.object({
			sessionId: z.string(),
			enabledRuleIds: z.array(z.string()),
		}),
		output: z.void(),
		resolve: async ({ sessionId, enabledRuleIds }: { sessionId: string; enabledRuleIds: string[] }, ctx?: any) => {
			await ctx.sessionRepository.updateSession(sessionId, {
				enabledRuleIds,
			});
		},
	}),

	/**
	 * Update session agent
	 */
	updateAgent: lens.mutation({
		input: z.object({
			sessionId: z.string(),
			agentId: z.string(),
		}),
		output: z.void(),
		resolve: async ({ sessionId, agentId }: { sessionId: string; agentId: string }, ctx?: any) => {
			await ctx.sessionRepository.updateSession(sessionId, {
				agentId,
			});

			await ctx.appContext.eventStream.publish("session-events", {
				type: "session-updated",
				sessionId,
				field: "agentId",
				value: agentId,
			});
		},
	}),

	/**
	 * Delete session
	 * CASCADE: Automatically deletes all messages, todos, attachments
	 */
	delete: lens.mutation({
		input: z.object({ sessionId: z.string() }),
		output: z.void(),
		resolve: async ({ sessionId }: { sessionId: string }, ctx?: any) => {
			await ctx.sessionRepository.deleteSession(sessionId);

			await ctx.appContext.eventStream.publish("session-events", {
				type: "session-deleted",
				sessionId,
			});
		},
	}),

	/**
	 * Compact session: Summarize conversation and create new session
	 */
	compact: lens.mutation({
		input: z.object({ sessionId: z.string() }),
		output: z.object({
			success: z.boolean(),
			error: z.string().optional(),
			newSessionId: z.string().optional(),
			summary: z.string().optional(),
			messageCount: z.number().optional(),
		}),
		resolve: async ({ sessionId }: { sessionId: string }, ctx?: any) => {
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

			// Emit events for multi-client sync
			await ctx.appContext.eventStream.publish("session-events", {
				type: "session-compacted",
				oldSessionId: sessionId,
				newSessionId: result.newSessionId!,
				summary: result.summary!,
				messageCount: result.messageCount!,
			});

			await ctx.appContext.eventStream.publish("session-events", {
				type: "session-created",
				sessionId: result.newSessionId!,
				provider: session.provider,
				model: session.model,
			});

			return result;
		},
	}),
});

/**
 * Message API
 */
export const messageAPI = lens.object({
	/**
	 * Stream AI response
	 * REACTIVE: Returns Observable of streaming events
	 */
	streamResponse: lens.query({
		input: z.object({
			sessionId: z.string(),
			userMessageContent: z.string().nullable(),
		}),
		output: StreamEventSchema,
		resolve: async ({ sessionId, userMessageContent }: { sessionId: string; userMessageContent: string | null }, ctx?: any) => {
			throw new Error("Use subscribe() method for streaming");
		},
		subscribe: ({ sessionId, userMessageContent }: { sessionId: string; userMessageContent: string | null }, ctx?: any): Observable<StreamEvent> => {
			const { streamAIResponse } = require("../../code-server/src/services/streaming.service.js");

			return streamAIResponse({
				appContext: ctx.appContext,
				sessionRepository: ctx.sessionRepository,
				messageRepository: ctx.messageRepository,
				aiConfig: ctx.aiConfig,
				sessionId,
				userMessageContent,
			});
		},
	}),
});

/**
 * Root API
 */
export const api = lens.object({
	session: sessionAPI,
	message: messageAPI,
});

export type API = typeof api;
