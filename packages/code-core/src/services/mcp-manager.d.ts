/**
 * MCP Manager Service
 *
 * Manages MCP server connections and tool/resource/prompt discovery
 * Lifecycle: connect → discover → convert → cleanup
 */
import { experimental_createMCPClient } from "@ai-sdk/mcp";
import { type Result } from "../ai/result.js";
import type { MCPServerState, MCPServerWithId, MCPToolInfo } from "../types/mcp.types.js";
/**
 * MCP Manager
 * Singleton service managing all MCP connections
 */
export declare class MCPManager {
    private clients;
    /**
     * Connect to MCP server
     */
    connect(server: MCPServerWithId): Promise<Result<void, Error>>;
    /**
     * Disconnect from MCP server
     */
    disconnect(serverId: string): Promise<Result<void, Error>>;
    /**
     * Disconnect all MCP servers
     */
    disconnectAll(): Promise<void>;
    /**
     * Get MCP client for server
     */
    getClient(serverId: string): ReturnType<typeof experimental_createMCPClient> | null;
    /**
     * Get server state
     */
    getServerState(serverId: string): Promise<MCPServerState | null>;
    /**
     * List all server states
     */
    listServerStates(): Promise<MCPServerState[]>;
    /**
     * Get tools from MCP server
     */
    getTools(serverId: string): Promise<Result<MCPToolInfo[], Error>>;
    /**
     * Get all tools from all connected servers
     */
    getAllTools(): Promise<MCPToolInfo[]>;
    /**
     * Check if server is connected
     */
    isConnected(serverId: string): boolean;
    /**
     * Get connected server IDs
     */
    getConnectedServerIds(): string[];
    /**
     * Get connection count
     */
    getConnectionCount(): number;
    /**
     * Connect to all enabled servers (parallel, non-blocking)
     */
    connectToEnabledServers(): Promise<void>;
    /**
     * Emit MCP status change event
     */
    private emitStatusChange;
    /**
     * Reconnect to MCP server
     */
    reconnect(serverId: string): Promise<Result<void, Error>>;
}
/**
 * Get MCP manager instance (singleton)
 */
export declare function getMCPManager(): MCPManager;
/**
 * Reset MCP manager instance (for testing)
 */
export declare function resetMCPManager(): void;
//# sourceMappingURL=mcp-manager.d.ts.map