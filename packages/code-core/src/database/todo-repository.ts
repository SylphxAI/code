/**
 * Todo Repository
 * Database operations for session todos
 *
 * Responsibilities:
 * - CRUD operations for individual todos
 * - Atomic replacement of entire todo list
 */

import { and, eq, max } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { Todo as TodoType } from "../types/todo.types.js";
import { retryDatabase } from "../utils/retry.js";
import { sessions, todos } from "./schema.js";

export class TodoRepository {
	constructor(private db: LibSQLDatabase) {}

	/**
	 * Get all todos for a session
	 */
	async getTodosBySessionId(sessionId: string): Promise<TodoType[]> {
		return retryDatabase(async () => {
			const result = await this.db
				.select()
				.from(todos)
				.where(eq(todos.sessionId, sessionId))
				.orderBy(todos.ordering);
			return result.map((row) => ({
				id: row.id,
				content: row.content,
				activeForm: row.activeForm,
				status: row.status as TodoType["status"],
				ordering: row.ordering,
			}));
		});
	}

	/**
	 * Create a single todo
	 * Auto-assigns ID if not provided
	 */
	async createTodo(
		sessionId: string,
		data: Omit<TodoType, "id"> & { id?: number }
	): Promise<TodoType> {
		return retryDatabase(async () => {
			let todoId = data.id;

			// If no ID provided, generate next ID
			if (todoId === undefined) {
				const maxResult = await this.db
					.select({ maxId: max(todos.id) })
					.from(todos)
					.where(eq(todos.sessionId, sessionId));
				todoId = (maxResult[0]?.maxId ?? 0) + 1;
			}

			// Calculate ordering if not provided
			let ordering = data.ordering;
			if (ordering === undefined) {
				const maxOrderResult = await this.db
					.select({ maxOrder: max(todos.ordering) })
					.from(todos)
					.where(eq(todos.sessionId, sessionId));
				ordering = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
			}

			await this.db.insert(todos).values({
				id: todoId,
				sessionId,
				content: data.content,
				activeForm: data.activeForm,
				status: data.status,
				ordering,
			});

			return {
				id: todoId,
				content: data.content,
				activeForm: data.activeForm,
				status: data.status,
				ordering,
			};
		});
	}

	/**
	 * Update a single todo by session and todo ID
	 */
	async updateTodo(
		sessionId: string,
		todoId: number,
		data: Partial<Omit<TodoType, "id">>
	): Promise<TodoType | null> {
		return retryDatabase(async () => {
			const existing = await this.db
				.select()
				.from(todos)
				.where(and(eq(todos.sessionId, sessionId), eq(todos.id, todoId)))
				.limit(1);

			if (existing.length === 0) return null;

			const updateData: Record<string, unknown> = {};
			if (data.content !== undefined) updateData.content = data.content;
			if (data.activeForm !== undefined) updateData.activeForm = data.activeForm;
			if (data.status !== undefined) updateData.status = data.status;
			if (data.ordering !== undefined) updateData.ordering = data.ordering;

			if (Object.keys(updateData).length > 0) {
				await this.db
					.update(todos)
					.set(updateData)
					.where(and(eq(todos.sessionId, sessionId), eq(todos.id, todoId)));
			}

			const updated = await this.db
				.select()
				.from(todos)
				.where(and(eq(todos.sessionId, sessionId), eq(todos.id, todoId)))
				.limit(1);

			if (updated.length === 0) return null;

			return {
				id: updated[0].id,
				content: updated[0].content,
				activeForm: updated[0].activeForm,
				status: updated[0].status as TodoType["status"],
				ordering: updated[0].ordering,
			};
		});
	}

	/**
	 * Delete a single todo by session and todo ID
	 */
	async deleteTodo(sessionId: string, todoId: number): Promise<boolean> {
		return retryDatabase(async () => {
			const result = await this.db
				.delete(todos)
				.where(and(eq(todos.sessionId, sessionId), eq(todos.id, todoId)));
			return (result.rowsAffected ?? 0) > 0;
		});
	}

	/**
	 * Update todos for session
	 * Atomically replaces all todos with new list
	 */
	async updateTodos(sessionId: string, newTodos: TodoType[], nextTodoId: number): Promise<void> {
		await retryDatabase(async () => {
			await this.db.transaction(async (tx) => {
				// Delete existing todos
				await tx.delete(todos).where(eq(todos.sessionId, sessionId));

				// Insert new todos
				for (const todo of newTodos) {
					await tx.insert(todos).values({
						id: todo.id,
						sessionId,
						content: todo.content,
						activeForm: todo.activeForm,
						status: todo.status,
						ordering: todo.ordering,
					});
				}

				// Update nextTodoId and timestamp
				await tx
					.update(sessions)
					.set({ nextTodoId, updated: Date.now() })
					.where(eq(sessions.id, sessionId));
			});
		});
	}
}
