/**
 * Todo Repository
 * Database operations for session todos
 *
 * Responsibilities:
 * - Update todos for sessions
 * - Atomic replacement of entire todo list
 */
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { Todo as TodoType } from "../types/todo.types.js";
export declare class TodoRepository {
    private db;
    constructor(db: LibSQLDatabase);
    /**
     * Update todos for session
     * Atomically replaces all todos with new list
     */
    updateTodos(sessionId: string, newTodos: TodoType[], nextTodoId: number): Promise<void>;
}
//# sourceMappingURL=todo-repository.d.ts.map