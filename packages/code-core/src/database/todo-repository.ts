/**
 * Todo Repository
 * Database operations for session todos
 *
 * Responsibilities:
 * - Update todos for sessions
 * - Atomic replacement of entire todo list
 */

import { eq } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { randomUUID } from 'node:crypto';
import { sessions, todos } from './schema.js';
import type { Todo as TodoType } from '../types/todo.types.js';
import { retryDatabase } from '../utils/retry.js';

export class TodoRepository {
  constructor(private db: LibSQLDatabase) {}

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
