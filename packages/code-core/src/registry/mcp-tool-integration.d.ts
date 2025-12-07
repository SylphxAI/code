/**
 * MCP Tool Integration
 *
 * Converts MCP tools to AI SDK tools and integrates them with the tool registry
 */
import type { CoreTool } from "ai";
import type { MCPToolInfo } from "../types/mcp.types.js";
import type { Tool } from "../types/tool.types.js";
/**
 * Convert MCP tool to AI SDK tool
 * Tool ID format: serverId__toolName (e.g., "github__create-issue")
 * IMPORTANT: Use double underscore (__) instead of colon (:) for OpenAI compatibility
 * OpenAI only allows tool names matching: ^[a-zA-Z0-9_-]+
 *
 * @deprecated This function is no longer used. Use convertAllMCPToolsToAISDK() instead,
 * which directly uses AI SDK's native tools() method without manual execute wrapper.
 */
export declare function convertMCPToolToAISDK(mcpTool: MCPToolInfo): CoreTool;
/**
 * Convert MCP tool to tool metadata
 * For display in tool registry UI
 * Tool ID format: serverId__toolName (double underscore for OpenAI compatibility)
 */
export declare function convertMCPToolToMetadata(mcpTool: MCPToolInfo): Tool;
/**
 * Register MCP tool in the registry
 */
export declare function registerMCPTool(mcpTool: MCPToolInfo): void;
/**
 * Unregister MCP tool from the registry
 */
export declare function unregisterMCPTool(toolId: string): void;
/**
 * Unregister all tools from a specific MCP server
 */
export declare function unregisterMCPServerTools(serverId: string): void;
/**
 * Get MCP tool by ID
 */
export declare function getMCPTool(toolId: string): MCPToolInfo | undefined;
/**
 * Get all MCP tools
 */
export declare function getAllMCPTools(): MCPToolInfo[];
/**
 * Get MCP tools by server ID
 */
export declare function getMCPToolsByServerId(serverId: string): MCPToolInfo[];
/**
 * Convert all MCP tools to AI SDK tools (native format with prefixed names)
 * Uses AI SDK's native tools() method and only renames for collision avoidance
 */
export declare function convertAllMCPToolsToAISDK(): Promise<Record<string, CoreTool>>;
/**
 * Convert MCP tools to tool metadata for registry
 */
export declare function convertAllMCPToolsToMetadata(): Tool[];
/**
 * Load tools from all connected MCP servers
 */
export declare function loadMCPTools(): Promise<void>;
/**
 * Reload tools from a specific MCP server
 */
export declare function reloadMCPServerTools(serverId: string): Promise<void>;
/**
 * Check if tool is an MCP tool
 */
export declare function isMCPTool(toolId: string): boolean;
/**
 * Parse MCP tool ID
 * Returns serverId and toolName
 */
export declare function parseMCPToolId(toolId: string): {
    serverId: string;
    toolName: string;
} | null;
/**
 * Get MCP tool count by server
 */
export declare function getMCPToolCountByServer(): Record<string, number>;
//# sourceMappingURL=mcp-tool-integration.d.ts.map