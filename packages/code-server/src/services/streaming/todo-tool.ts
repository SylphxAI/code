/**
 * Server-side Todo Tool
 * Creates todo tool with session-aware context
 *
 * Architecture:
 * - Follows same pattern as ask-tool.ts
 * - Bridges server context (Repositories) to headless SDK (createTodoTool)
 * - Maintains dependency injection pattern for framework independence
 * - Uses dedicated TodoRepository for todo operations (separated from SessionRepository)
 */

import type { AppContext } from "../../context.js";
import { createTodoTool, type SessionRepository, type TodoToolContext } from "@sylphx/code-core";

/**
 * Create server-side todo tool with app context
 *
 * This factory bridges the server's repositories to the headless SDK's
 * TodoToolContext interface, maintaining clean separation of concerns.
 *
 * Architecture note:
 * - SessionRepository: Read session data (get todos)
 * - TodoRepository: Write todo updates (dedicated repository)
 *
 * @param sessionId - Current session ID for todo operations
 * @param sessionRepository - Session repository for reading session data
 * @param appContext - App context for accessing TodoRepository
 * @returns AI SDK tool configured with session context
 */
export function createServerTodoTool(
	sessionId: string,
	sessionRepository: SessionRepository,
	appContext: AppContext,
) {
	// Get TodoRepository from app context
	const todoRepository = appContext.database.getTodoRepository();

	// Construct TodoToolContext from repositories
	const todoContext: TodoToolContext = {
		getCurrentSession: async () => {
			const session = await sessionRepository.get(sessionId);
			if (!session) {
				return null;
			}

			return {
				id: session.id,
				todos: session.todos || [],
				nextTodoId: session.nextTodoId || 1,
			};
		},

		updateTodos: async (sid, todos, nextTodoId) => {
			// Verify session ID matches (security check)
			if (sid !== sessionId) {
				throw new Error(`Session ID mismatch: expected ${sessionId}, got ${sid}`);
			}

			// Update todos via dedicated TodoRepository
			await todoRepository.updateTodos(sid, todos, nextTodoId);
		},
	};

	// Delegate to headless SDK tool factory
	return createTodoTool(todoContext);
}
