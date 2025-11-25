/**
 * Lens Entity Resolvers Factory
 *
 * Resolvers handle nested data loading. They are reused across ALL operations.
 * Batching support prevents N+1 queries.
 *
 * Entity resolvers are created inside createLensServer() where db is available
 * via closure. This avoids needing AsyncLocalStorage/useContext.
 *
 * Example: When client requests session with messages:
 * ```typescript
 * api.queries.getSession({ id }).select({
 *   title: true,
 *   messages: { select: { role: true, steps: true } }
 * })
 * ```
 *
 * Flow:
 * 1. getSession resolver fetches session
 * 2. Session.messages resolver fetches messages
 * 3. Message.steps resolver fetches steps (batched!)
 */

import { entityResolvers } from "@lens/core";
import type { LensDB } from "./context.js";

/**
 * Create entity resolvers with db access via closure
 *
 * Each relation field can have:
 * - Simple resolver: (parent) => fetchData()
 * - Batch resolver: { batch: (parents) => fetchDataForAll() }
 *
 * Batch resolvers are automatically used by DataLoader.
 */
export function createResolvers(db: LensDB) {
	return entityResolvers({
		// =========================================================================
		// Session Resolvers
		// =========================================================================
		Session: {
			/**
			 * Load messages for sessions (batched)
			 */
			messages: {
				batch: async (sessions: any[]) => {
					const sessionIds = sessions.map((s) => s.id);

					// Fetch all messages for all sessions in one query
					const allMessages = await db.message.findMany({
						where: { sessionId: { in: sessionIds } },
						orderBy: { ordering: "asc" },
					});

					// Group by sessionId
					const grouped = new Map<string, any[]>();
					for (const msg of allMessages) {
						const arr = grouped.get(msg.sessionId) || [];
						arr.push(msg);
						grouped.set(msg.sessionId, arr);
					}

					// Return in same order as input
					return sessions.map((s) => grouped.get(s.id) || []);
				},
			},

			/**
			 * Load todos for sessions (batched)
			 */
			todos: {
				batch: async (sessions: any[]) => {
					const sessionIds = sessions.map((s) => s.id);

					const allTodos = await db.todo.findMany({
						where: { sessionId: { in: sessionIds } },
						orderBy: { ordering: "asc" },
					});

					const grouped = new Map<string, any[]>();
					for (const todo of allTodos) {
						const arr = grouped.get(todo.sessionId) || [];
						arr.push(todo);
						grouped.set(todo.sessionId, arr);
					}

					return sessions.map((s) => grouped.get(s.id) || []);
				},
			},
		},

		// =========================================================================
		// Message Resolvers
		// =========================================================================
		Message: {
			/**
			 * Load parent session (batched)
			 */
			session: {
				batch: async (messages: any[]) => {
					const sessionIds = [...new Set(messages.map((m) => m.sessionId))];

					const sessions = await db.session.findMany({
						where: { id: { in: sessionIds } },
					});

					const sessionMap = new Map(sessions.map((s) => [s.id, s]));
					return messages.map((m) => sessionMap.get(m.sessionId) || null);
				},
			},

			/**
			 * Load steps for messages (batched)
			 */
			steps: {
				batch: async (messages: any[]) => {
					const messageIds = messages.map((m) => m.id);

					const allSteps = await db.step.findMany({
						where: { messageId: { in: messageIds } },
						orderBy: { stepIndex: "asc" },
					});

					const grouped = new Map<string, any[]>();
					for (const step of allSteps) {
						const arr = grouped.get(step.messageId) || [];
						arr.push(step);
						grouped.set(step.messageId, arr);
					}

					return messages.map((m) => grouped.get(m.id) || []);
				},
			},
		},

		// =========================================================================
		// Step Resolvers
		// =========================================================================
		Step: {
			/**
			 * Load parent message (batched)
			 */
			message: {
				batch: async (steps: any[]) => {
					const messageIds = [...new Set(steps.map((s) => s.messageId))];

					const messages = await db.message.findMany({
						where: { id: { in: messageIds } },
					});

					const messageMap = new Map(messages.map((m) => [m.id, m]));
					return steps.map((s) => messageMap.get(s.messageId) || null);
				},
			},

			/**
			 * Load parts for steps (batched)
			 */
			parts: {
				batch: async (steps: any[]) => {
					const stepIds = steps.map((s) => s.id);

					const allParts = await db.part.findMany({
						where: { stepId: { in: stepIds } },
						orderBy: { ordering: "asc" },
					});

					const grouped = new Map<string, any[]>();
					for (const part of allParts) {
						if (!part.stepId) continue;
						const arr = grouped.get(part.stepId) || [];
						arr.push(part);
						grouped.set(part.stepId, arr);
					}

					return steps.map((s) => grouped.get(s.id) || []);
				},
			},

			/**
			 * Load usage for steps (batched)
			 */
			usage: {
				batch: async (steps: any[]) => {
					// Placeholder - usage data comes from step_usage table
					return steps.map(() => null);
				},
			},
		},

		// =========================================================================
		// Part Resolvers
		// =========================================================================
		Part: {
			/**
			 * Load parent step (batched)
			 */
			step: {
				batch: async (parts: any[]) => {
					const stepIds = [
						...new Set(parts.filter((p) => p.stepId).map((p) => p.stepId)),
					];

					const steps = await db.step.findMany({
						where: { id: { in: stepIds } },
					});

					const stepMap = new Map(steps.map((s) => [s.id, s]));
					return parts.map((p) => (p.stepId ? stepMap.get(p.stepId) : null));
				},
			},
		},

		// =========================================================================
		// Todo Resolvers
		// =========================================================================
		Todo: {
			/**
			 * Load parent session (batched)
			 */
			session: {
				batch: async (todos: any[]) => {
					const sessionIds = [...new Set(todos.map((t) => t.sessionId))];

					const sessions = await db.session.findMany({
						where: { id: { in: sessionIds } },
					});

					const sessionMap = new Map(sessions.map((s) => [s.id, s]));
					return todos.map((t) => sessionMap.get(t.sessionId) || null);
				},
			},
		},
	});
}
