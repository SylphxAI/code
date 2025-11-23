/**
 * Session Router (Lens-powered)
 *
 * Clean replacement using Lens API.
 *
 * Before: 700+ lines of manual CRUD + event handling (session.router.old.ts)
 * After: ~200 lines delegating to Lens (this file)
 *
 * Architecture:
 * - tRPC procedures → Lens API calls
 * - Field updates → automatic field-level events
 * - Type-safe with Zod validation
 * - All business logic in Lens Extended API
 *
 * Migration:
 * - ✅ Drop-in replacement (API compatible)
 * - ✅ 71% code reduction
 * - ✅ Unified field-level subscriptions
 * - ✅ Zero manual event handling
 */

import { z } from "zod";
import { moderateProcedure, publicProcedure, router, strictProcedure } from "../trpc.js";
import { initializeLensAPI } from "../../lens/index.js";

export function createSessionRouter() {
	return router({
		/**
		 * Get recent sessions metadata (cursor-based pagination)
		 */
		getRecent: publicProcedure
			.input(
				z.object({
					limit: z.number().min(1).max(100).default(20),
					cursor: z.number().optional(),
				}),
			)
			.query(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				return await lensAPI.Session.list.query({
					limit: input.limit,
					offset: input.cursor,
					orderBy: { created_at: "desc" as const },
				});
			}),

		/**
		 * Get session by ID with full data
		 */
		getById: publicProcedure
			.input(z.object({ sessionId: z.string() }))
			.query(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				const session = await lensAPI.Session.get.query({ id: input.sessionId });

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
						modelStatus = models.some((m) => m.id === session.model)
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
			}),

		/**
		 * Get session count
		 */
		getCount: publicProcedure.query(async ({ ctx }) => {
			const lensAPI = initializeLensAPI(ctx.appContext);
			return await lensAPI.Session.getCount();
		}),

		/**
		 * Get last session (for headless mode)
		 */
		getLast: publicProcedure.query(async ({ ctx }) => {
			const lensAPI = initializeLensAPI(ctx.appContext);
			return await lensAPI.Session.getLast();
		}),

		/**
		 * Search sessions by title (metadata only, cursor-based pagination)
		 */
		search: publicProcedure
			.input(
				z.object({
					query: z.string(),
					limit: z.number().min(1).max(100).default(20),
					cursor: z.number().optional(),
				}),
			)
			.query(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				return await lensAPI.Session.search(input.query, input.limit, input.cursor);
			}),

		/**
		 * Create new session
		 */
		create: strictProcedure
			.input(
				z.object({
					provider: z.string(),
					model: z.string(),
					agentId: z.string().default("coder"),
					enabledRuleIds: z.array(z.string()).default([]),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				return await lensAPI.Session.create.mutate({
					provider: input.provider,
					model: input.model,
					agentId: input.agentId,
					enabledRuleIds: input.enabledRuleIds,
					title: "", // Empty initially, will be generated
				});
			}),

		/**
		 * Update session title
		 */
		updateTitle: moderateProcedure
			.input(
				z.object({
					sessionId: z.string(),
					title: z.string(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				await lensAPI.Session.updateTitle(input.sessionId, input.title);
			}),

		/**
		 * Update session model
		 */
		updateModel: moderateProcedure
			.input(
				z.object({
					sessionId: z.string(),
					model: z.string(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				await lensAPI.Session.updateModel(input.sessionId, input.model);
			}),

		/**
		 * Update session provider
		 */
		updateProvider: moderateProcedure
			.input(
				z.object({
					sessionId: z.string(),
					provider: z.string(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				await lensAPI.Session.updateProvider(input.sessionId, input.provider);
			}),

		/**
		 * Update enabled rules
		 */
		updateRules: moderateProcedure
			.input(
				z.object({
					sessionId: z.string(),
					enabledRuleIds: z.array(z.string()),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				await lensAPI.Session.updateRules(input.sessionId, input.enabledRuleIds);
			}),

		/**
		 * Update session agent
		 */
		updateAgent: moderateProcedure
			.input(
				z.object({
					sessionId: z.string(),
					agentId: z.string(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				await lensAPI.Session.updateAgent(input.sessionId, input.agentId);
			}),

		/**
		 * Delete session
		 */
		delete: strictProcedure
			.input(z.object({ sessionId: z.string() }))
			.mutation(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				await lensAPI.Session.delete.mutate({ id: input.sessionId });
			}),

		/**
		 * Compact session (remove intermediate tool results)
		 */
		compact: moderateProcedure
			.input(z.object({ sessionId: z.string() }))
			.mutation(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				return await lensAPI.Session.compact(input.sessionId);
			}),

		/**
		 * Get context info (tokens, costs)
		 */
		getContextInfo: publicProcedure
			.input(z.object({ sessionId: z.string() }))
			.query(async ({ ctx, input }) => {
				const lensAPI = initializeLensAPI(ctx.appContext);
				return await lensAPI.Session.getContextInfo(input.sessionId);
			}),

		/**
		 * Get total tokens across all sessions
		 */
		getTotalTokens: publicProcedure.query(async ({ ctx }) => {
			const lensAPI = initializeLensAPI(ctx.appContext);
			return await lensAPI.Session.getTotalTokens();
		}),
	});
}

/**
 * Export router instance
 *
 * Drop-in replacement for old session router (see session.router.old.ts).
 * All tRPC procedures preserved, now powered by Lens.
 */
export const sessionRouter = createSessionRouter();
