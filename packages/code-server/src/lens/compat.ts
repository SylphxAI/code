/**
 * Lens Compatibility Layer
 *
 * Provides backward-compatible API for existing tRPC routers.
 * Will be removed after full migration to new Lens architecture.
 *
 * OLD API:
 * ```typescript
 * const lensAPI = initializeLensAPI(ctx.appContext)
 * await lensAPI.Session.get.query({ id })
 * await lensAPI.Session.create.mutate({ title: "..." })
 * ```
 *
 * This layer wraps the new Lens server to provide the old interface.
 */

import type { AppContext } from "../context.js";
import { createLensServer } from "./server.js";

/**
 * Initialize Lens API with backward-compatible interface
 *
 * @deprecated Use createLensServer directly for new code
 */
export function initializeLensAPI(appContext: AppContext) {
	const server = createLensServer(appContext);
	const sessionRepo = appContext.database.getRepository();
	const messageRepo = appContext.database.getMessageRepository();

	return {
		Session: {
			get: {
				query: async (input: { id: string }) => {
					return sessionRepo.getSessionById(input.id);
				},
				subscribe: () => {
					// Legacy subscription - not supported in compat layer
					throw new Error("Use new Lens subscription API");
				},
			},
			list: {
				query: async (input?: { limit?: number; offset?: number; orderBy?: any }) => {
					const sessions = await sessionRepo.getAllSessions();
					// Sort by updatedAt desc
					sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
					// Apply limit
					if (input?.limit) {
						return sessions.slice(0, input.limit);
					}
					return sessions;
				},
				subscribe: () => {
					throw new Error("Use new Lens subscription API");
				},
			},
			create: {
				mutate: async (input: { title?: string; agentId?: string; provider?: string; model?: string }) => {
					const now = Date.now();
					const session = {
						id: crypto.randomUUID(),
						title: input.title || "New Chat",
						agentId: input.agentId || "coder",
						provider: input.provider,
						model: input.model,
						enabledRuleIds: [],
						nextTodoId: 1,
						createdAt: now,
						updatedAt: now,
					};
					await sessionRepo.createSession(session);
					return session;
				},
			},
			update: {
				mutate: async (input: { id: string; [key: string]: any }) => {
					const { id, ...data } = input;
					await sessionRepo.updateSession(id, { ...data, updatedAt: Date.now() });
					return { id, ...data };
				},
			},
			delete: {
				mutate: async (input: { id: string }) => {
					await sessionRepo.deleteSession(input.id);
					return { id: input.id };
				},
			},

			// Extended operations (from old session-extended-api.ts)
			getLast: async () => {
				const sessions = await sessionRepo.getAllSessions();
				sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
				return sessions[0] || null;
			},

			search: async (query: string, limit?: number) => {
				const sessions = await sessionRepo.getAllSessions();
				const filtered = sessions.filter(s =>
					s.title?.toLowerCase().includes(query.toLowerCase())
				);
				return filtered.slice(0, limit || 20);
			},

			getCount: async () => {
				const sessions = await sessionRepo.getAllSessions();
				return sessions.length;
			},

			updateTitle: async (sessionId: string, title: string) => {
				await sessionRepo.updateSession(sessionId, { title, updatedAt: Date.now() });
			},

			updateModel: async (sessionId: string, model: string) => {
				await sessionRepo.updateSession(sessionId, { model, updatedAt: Date.now() });
			},

			updateProvider: async (sessionId: string, provider: string) => {
				await sessionRepo.updateSession(sessionId, { provider, updatedAt: Date.now() });
			},

			updateRules: async (sessionId: string, enabledRuleIds: string[]) => {
				await sessionRepo.updateSession(sessionId, { enabledRuleIds, updatedAt: Date.now() });
			},

			updateAgent: async (sessionId: string, agentId: string) => {
				await sessionRepo.updateSession(sessionId, { agentId, updatedAt: Date.now() });
			},

			compact: async (sessionId: string) => {
				// Placeholder - implement compaction logic
				return { success: true };
			},

			getContextInfo: async (sessionId: string) => {
				const session = await sessionRepo.getSessionById(sessionId);
				return {
					totalTokens: session?.totalTokens || 0,
					baseContextTokens: session?.baseContextTokens || 0,
				};
			},

			getTotalTokens: async () => {
				const sessions = await sessionRepo.getAllSessions();
				return sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
			},
		},

		// Context for custom operations (backward compat)
		ctx: {
			db: {
				session: sessionRepo,
				message: messageRepo,
			},
			eventStream: appContext.eventStream,
		},
	};
}

export type LensAPI = ReturnType<typeof initializeLensAPI>;
