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
import { type SessionRepository } from "@sylphx/code-core";
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
export declare function createServerTodoTool(sessionId: string, sessionRepository: SessionRepository, appContext: AppContext): import("ai").Tool<{
    todos: {
        id?: number | undefined;
        content?: string | undefined;
        activeForm?: string | undefined;
        status?: "completed" | "pending" | "in_progress" | "removed" | undefined;
        reorder?: {
            type: "top" | "last" | "before" | "after";
            id?: number | undefined;
        } | undefined;
    }[];
}, {
    error: string;
    summary: string;
    changes: never[];
    total: number;
} | {
    summary: string;
    changes: string[];
    total: number;
    error?: undefined;
}>;
//# sourceMappingURL=todo-tool.d.ts.map