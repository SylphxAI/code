/**
 * MCP Tool Integration
 *
 * Converts MCP tools to AI SDK tools and integrates them with the tool registry
 */

import type { CoreTool } from "ai";
import type { MCPToolInfo } from "../types/mcp.types.js";
import type { Tool } from "../types/tool.types.js";
import { createLogger } from "../utils/logger.js";
import { getMCPManager } from "../services/mcp-manager.js";

const logger = createLogger("MCPToolIntegration");

/**
 * MCP tool registry
 * Maps tool ID (serverId:toolName) to MCP tool info
 */
const mcpToolRegistry = new Map<string, MCPToolInfo>();

/**
 * Convert MCP tool to AI SDK tool
 * Tool ID format: serverId__toolName (e.g., "github__create-issue")
 * IMPORTANT: Use double underscore (__) instead of colon (:) for OpenAI compatibility
 * OpenAI only allows tool names matching: ^[a-zA-Z0-9_-]+
 *
 * @deprecated This function is no longer used. Use convertAllMCPToolsToAISDK() instead,
 * which directly uses AI SDK's native tools() method without manual execute wrapper.
 */
export function convertMCPToolToAISDK(mcpTool: MCPToolInfo): CoreTool {
	const toolId = `${mcpTool.serverId}__${mcpTool.name}`;
	const mcpManager = getMCPManager();

	return {
		type: "function",
		name: toolId,
		description: mcpTool.description,
		parameters: mcpTool.inputSchema,
		execute: async (args: unknown) => {
			logger.debug("Executing MCP tool", {
				toolId,
				serverId: mcpTool.serverId,
				toolName: mcpTool.name,
			});

			try {
				const client = mcpManager.getClient(mcpTool.serverId);
				if (!client) {
					throw new Error(`MCP server '${mcpTool.serverId}' not connected`);
				}

				// Get tools from MCP client (returns Record<string, Tool>)
				const toolsRecord = await client.tools();
				const tool = toolsRecord[mcpTool.name];

				if (!tool || !tool.execute) {
					throw new Error(`Tool '${mcpTool.name}' not found on server '${mcpTool.serverId}'`);
				}

				const result = await tool.execute(args);

				logger.debug("MCP tool executed successfully", {
					toolId,
					serverId: mcpTool.serverId,
					toolName: mcpTool.name,
				});

				return result;
			} catch (error) {
				logger.error("Failed to execute MCP tool", {
					toolId,
					serverId: mcpTool.serverId,
					toolName: mcpTool.name,
					error: error instanceof Error ? error.message : String(error),
				});

				throw error;
			}
		},
	};
}

/**
 * Convert MCP tool to tool metadata
 * For display in tool registry UI
 * Tool ID format: serverId__toolName (double underscore for OpenAI compatibility)
 */
export function convertMCPToolToMetadata(mcpTool: MCPToolInfo): Tool {
	const toolId = `${mcpTool.serverId}__${mcpTool.name}`;

	return {
		id: toolId,
		name: mcpTool.name,
		category: "mcp",
		description: mcpTool.description,
		capabilities: {
			isAsync: true,
			supportsParallel: true,
		},
		securityLevel: "dangerous", // MCP tools are external, treat as dangerous by default
		enabledByDefault: false, // User must explicitly enable MCP tools
		source: "mcp",
		mcpServerId: mcpTool.serverId,
	};
}

/**
 * Register MCP tool in the registry
 */
export function registerMCPTool(mcpTool: MCPToolInfo): void {
	const toolId = `${mcpTool.serverId}:${mcpTool.name}`;
	mcpToolRegistry.set(toolId, mcpTool);

	logger.debug("Registered MCP tool", {
		toolId,
		serverId: mcpTool.serverId,
		toolName: mcpTool.name,
	});
}

/**
 * Unregister MCP tool from the registry
 */
export function unregisterMCPTool(toolId: string): void {
	mcpToolRegistry.delete(toolId);

	logger.debug("Unregistered MCP tool", { toolId });
}

/**
 * Unregister all tools from a specific MCP server
 */
export function unregisterMCPServerTools(serverId: string): void {
	const toolsToRemove: string[] = [];

	for (const [toolId, mcpTool] of mcpToolRegistry.entries()) {
		if (mcpTool.serverId === serverId) {
			toolsToRemove.push(toolId);
		}
	}

	for (const toolId of toolsToRemove) {
		mcpToolRegistry.delete(toolId);
	}

	logger.debug("Unregistered all tools from MCP server", {
		serverId,
		count: toolsToRemove.length,
	});
}

/**
 * Get MCP tool by ID
 */
export function getMCPTool(toolId: string): MCPToolInfo | undefined {
	return mcpToolRegistry.get(toolId);
}

/**
 * Get all MCP tools
 */
export function getAllMCPTools(): MCPToolInfo[] {
	return Array.from(mcpToolRegistry.values());
}

/**
 * Get MCP tools by server ID
 */
export function getMCPToolsByServerId(serverId: string): MCPToolInfo[] {
	const tools: MCPToolInfo[] = [];

	for (const mcpTool of mcpToolRegistry.values()) {
		if (mcpTool.serverId === serverId) {
			tools.push(mcpTool);
		}
	}

	return tools;
}

/**
 * Convert all MCP tools to AI SDK tools (native format with prefixed names)
 * Uses AI SDK's native tools() method and only renames for collision avoidance
 */
export async function convertAllMCPToolsToAISDK(): Promise<Record<string, CoreTool>> {
	const mcpManager = getMCPManager();
	const allTools: Record<string, CoreTool> = {};

	// Get all connected MCP servers
	const serverIds = mcpManager.getConnectedServerIds();

	for (const serverId of serverIds) {
		const client = mcpManager.getClient(serverId);
		if (!client) continue;

		try {
			// Get tools from MCP client (AI SDK native format with execute)
			const tools = await client.tools();

			// Rename tools to avoid conflicts: serverId__toolName
			// ASSUMPTION: AI SDK tools already have proper execute functions
			for (const [toolName, tool] of Object.entries(tools)) {
				const prefixedName = `${serverId}__${toolName}`;
				allTools[prefixedName] = tool;
			}
		} catch (error) {
			logger.error("Failed to get tools from MCP server", {
				serverId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return allTools;
}

/**
 * Convert MCP tools to tool metadata for registry
 */
export function convertAllMCPToolsToMetadata(): Tool[] {
	const tools: Tool[] = [];

	for (const mcpTool of mcpToolRegistry.values()) {
		tools.push(convertMCPToolToMetadata(mcpTool));
	}

	return tools;
}

/**
 * Load tools from all connected MCP servers
 */
export async function loadMCPTools(): Promise<void> {
	const mcpManager = getMCPManager();
	const allTools = await mcpManager.getAllTools();

}

/**
 * Reload tools from a specific MCP server
 */
export async function reloadMCPServerTools(serverId: string): Promise<void> {
	const mcpManager = getMCPManager();
	const result = await mcpManager.getTools(serverId);

	if (!result.success) {
		logger.error("Failed to reload MCP server tools", {
			serverId,
			error: result.error.message,
		});
		throw result.error;
	}

	const tools = result.data;


	// Unregister existing tools from this server
	unregisterMCPServerTools(serverId);

	// Register new tools
	for (const mcpTool of tools) {
		registerMCPTool(mcpTool);
	}

}

/**
 * Check if tool is an MCP tool
 */
export function isMCPTool(toolId: string): boolean {
	return toolId.includes(":");
}

/**
 * Parse MCP tool ID
 * Returns serverId and toolName
 */
export function parseMCPToolId(toolId: string): { serverId: string; toolName: string } | null {
	if (!isMCPTool(toolId)) {
		return null;
	}

	const parts = toolId.split(":", 2);
	if (parts.length !== 2) {
		return null;
	}

	return {
		serverId: parts[0],
		toolName: parts[1],
	};
}

/**
 * Get MCP tool count by server
 */
export function getMCPToolCountByServer(): Record<string, number> {
	const counts: Record<string, number> = {};

	for (const mcpTool of mcpToolRegistry.values()) {
		counts[mcpTool.serverId] = (counts[mcpTool.serverId] || 0) + 1;
	}

	return counts;
}
