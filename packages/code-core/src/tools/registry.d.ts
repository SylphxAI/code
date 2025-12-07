/**
 * Tool Registry
 * Central registry for all AI SDK tools
 */
import { type TodoToolContext } from "./todo.js";
/**
 * Options for getting AI SDK tools
 */
export interface GetToolsOptions {
    /**
     * Whether to include interactive tools (ask). Default: true
     */
    interactive?: boolean;
    /**
     * Todo tool context for session management
     * If provided, todo tools will be included
     * If omitted, todo tools will be excluded
     */
    todoContext?: TodoToolContext;
}
/**
 * Get all tools in AI SDK Tool format
 *
 * @example
 * ```typescript
 * // Without todo tools (headless mode)
 * const tools = await getAISDKTools();
 *
 * // With todo tools (requires session context)
 * const tools = await getAISDKTools({
 *   todoContext: {
 *     getCurrentSession: async () => await db.getCurrentSession(),
 *     updateTodos: async (sessionId, todos, nextId) => await db.updateTodos(...)
 *   }
 * });
 * ```
 */
export declare function getAISDKTools(options?: GetToolsOptions): Promise<Record<string, any>>;
/**
 * Get tool names grouped by category
 */
export declare function getToolCategories(options?: GetToolsOptions): Record<string, string[]>;
/**
 * Get all tool names
 */
export declare function getAllToolNames(options?: GetToolsOptions): Promise<string[]>;
//# sourceMappingURL=registry.d.ts.map