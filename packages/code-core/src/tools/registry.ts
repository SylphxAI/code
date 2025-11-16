/**
 * Tool Registry
 * Central registry for all AI SDK tools
 */

import { convertAllMCPToolsToAISDK } from "../registry/mcp-tool-integration.js";
import { filesystemTools } from "./filesystem.js";
import { interactionTools } from "./interaction.js";
import { searchTools } from "./search.js";
import { shellTools } from "./shell.js";
import { createTodoTool, type TodoToolContext } from "./todo.js";

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
export async function getAISDKTools(options: GetToolsOptions = {}): Promise<Record<string, any>> {
	const { interactive = true, todoContext } = options;

	const baseTools = {
		...filesystemTools,
		...shellTools,
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
export function getToolCategories(options: GetToolsOptions = {}): Record<string, string[]> {
	const { todoContext } = options;

	const categories: Record<string, string[]> = {
		filesystem: Object.keys(filesystemTools),
		shell: Object.keys(shellTools),
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
export async function getAllToolNames(options: GetToolsOptions = {}): Promise<string[]> {
	const tools = await getAISDKTools(options);
	return Object.keys(tools);
}
