/**
 * MCP Configuration Management
 *
 * Configuration system for MCP servers stored in .sylphx-code/mcp-servers.json
 * Handles loading, saving, and validation of MCP server configurations
 */
import { type Result } from "../ai/result.js";
import type { MCPServerConfig, MCPServersConfig, MCPServerWithId } from "../types/mcp.types.js";
/**
 * Get MCP config file path
 */
export declare const getMCPConfigPath: (cwd?: string) => string;
/**
 * Load MCP servers configuration
 */
export declare const loadMCPConfig: (cwd?: string) => Promise<Result<MCPServersConfig, Error>>;
/**
 * Save MCP servers configuration
 */
export declare const saveMCPConfig: (config: MCPServersConfig, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Check if MCP config exists
 */
export declare const mcpConfigExists: (cwd?: string) => Promise<boolean>;
/**
 * Add MCP server to configuration
 */
export declare const addMCPServer: (id: string, serverConfig: MCPServerConfig, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Update MCP server in configuration
 */
export declare const updateMCPServer: (id: string, updates: Partial<MCPServerConfig>, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Remove MCP server from configuration
 */
export declare const removeMCPServer: (id: string, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Get MCP server by ID
 */
export declare const getMCPServer: (id: string, cwd?: string) => Promise<Result<MCPServerConfig | null, Error>>;
/**
 * List all MCP servers
 */
export declare const listMCPServers: (cwd?: string) => Promise<Result<MCPServerWithId[], Error>>;
/**
 * List enabled MCP servers
 */
export declare const listEnabledMCPServers: (cwd?: string) => Promise<Result<MCPServerWithId[], Error>>;
/**
 * Enable MCP server
 */
export declare const enableMCPServer: (serverId: string, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Disable MCP server
 */
export declare const disableMCPServer: (serverId: string, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Validate MCP server configuration
 */
export declare const validateMCPServerConfig: (server: unknown) => Result<MCPServerConfig, Error>;
//# sourceMappingURL=mcp-config.d.ts.map