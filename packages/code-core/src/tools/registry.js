/**
 * Tool Registry
 * Central registry for all AI SDK tools
 */
import { convertAllMCPToolsToAISDK } from "../registry/mcp-tool-integration.js";
import { filesystemTools } from "./filesystem.js";
import { interactionTools } from "./interaction.js";
import { searchTools } from "./search.js";
import { shellToolsV2 } from "./shell-v2.js";
import { createTodoTool } from "./todo.js";
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
export async function getAISDKTools(options = {}) {
    const { interactive = true, todoContext } = options;
    const baseTools = {
        ...filesystemTools,
        ...shellToolsV2,
        ...searchTools,
        ...(interactive ? interactionTools : {}),
    };
    // Get MCP tools (AI SDK native format, already a Record)
    const mcpTools = await convertAllMCPToolsToAISDK();
    // Add todo tools if context is provided
    if (todoContext) {
        return {
            ...baseTools,
            ...mcpTools,
            updateTodos: createTodoTool(todoContext),
        };
    }
    return {
        ...baseTools,
        ...mcpTools,
    };
}
/**
 * Get tool names grouped by category
 */
export function getToolCategories(options = {}) {
    const { todoContext } = options;
    const categories = {
        filesystem: Object.keys(filesystemTools),
        shell: Object.keys(shellToolsV2),
        search: Object.keys(searchTools),
        interaction: Object.keys(interactionTools),
    };
    if (todoContext) {
        categories.todo = ["updateTodos"];
    }
    return categories;
}
/**
 * Get all tool names
 */
export async function getAllToolNames(options = {}) {
    const tools = await getAISDKTools(options);
    return Object.keys(tools);
}
//# sourceMappingURL=registry.js.map