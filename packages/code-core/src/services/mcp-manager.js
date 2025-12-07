/**
 * MCP Manager Service
 *
 * Manages MCP server connections and tool/resource/prompt discovery
 * Lifecycle: connect → discover → convert → cleanup
 */
import { experimental_createMCPClient } from "@ai-sdk/mcp";
import { tryCatchAsync } from "../ai/result.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("MCPManager");
/**
 * MCP Manager
 * Singleton service managing all MCP connections
 */
export class MCPManager {
    clients = new Map();
    /**
     * Connect to MCP server
     */
    async connect(server) {
        return tryCatchAsync(async () => {
            // Check if already connected
            if (this.clients.has(server.id)) {
                logger.warn("MCP server already connected", { serverId: server.id });
                return;
            }
            // Create MCP client based on transport type
            const client = await experimental_createMCPClient({ transport: server.transport });
            // Store client instance
            const instance = {
                serverId: server.id,
                config: server,
                client,
                connectedAt: Date.now(),
                lastActivity: Date.now(),
            };
            this.clients.set(server.id, instance);
            // Emit status change event
            this.emitStatusChange();
        }, (error) => new Error(`Failed to connect to MCP server '${server.id}': ${error instanceof Error ? error.message : String(error)}`));
    }
    /**
     * Disconnect from MCP server
     */
    async disconnect(serverId) {
        return tryCatchAsync(async () => {
            const instance = this.clients.get(serverId);
            if (!instance) {
                logger.warn("MCP server not connected", { serverId });
                return;
            }
            // Remove client
            this.clients.delete(serverId);
            // Emit status change event
            this.emitStatusChange();
        }, (error) => new Error(`Failed to disconnect from MCP server '${serverId}': ${error instanceof Error ? error.message : String(error)}`));
    }
    /**
     * Disconnect all MCP servers
     */
    async disconnectAll() {
        const disconnectPromises = Array.from(this.clients.keys()).map((serverId) => this.disconnect(serverId));
        await Promise.all(disconnectPromises);
    }
    /**
     * Get MCP client for server
     */
    getClient(serverId) {
        const instance = this.clients.get(serverId);
        if (!instance) {
            return null;
        }
        // Update last activity
        instance.lastActivity = Date.now();
        return instance.client;
    }
    /**
     * Get server state
     */
    async getServerState(serverId) {
        const instance = this.clients.get(serverId);
        if (!instance) {
            return null;
        }
        try {
            // Get tools, resources, prompts from client
            const toolSet = await instance.client.tools();
            const tools = Object.values(toolSet);
            const resources = []; // Resources not yet exposed in AI SDK MCP
            const prompts = []; // Prompts not yet exposed in AI SDK MCP
            return {
                config: instance.config,
                status: "connected",
                toolCount: tools.length,
                resourceCount: resources.length,
                promptCount: prompts.length,
                connectedAt: instance.connectedAt,
                lastActivity: instance.lastActivity,
            };
        }
        catch (error) {
            logger.error("Failed to get server state", {
                serverId,
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                config: instance.config,
                status: "error",
                error: error instanceof Error ? error.message : String(error),
                toolCount: 0,
                resourceCount: 0,
                promptCount: 0,
                connectedAt: instance.connectedAt,
                lastActivity: instance.lastActivity,
            };
        }
    }
    /**
     * List all server states
     */
    async listServerStates() {
        const states = [];
        for (const serverId of this.clients.keys()) {
            const state = await this.getServerState(serverId);
            if (state) {
                states.push(state);
            }
        }
        return states;
    }
    /**
     * Get tools from MCP server
     */
    async getTools(serverId) {
        return tryCatchAsync(async () => {
            const instance = this.clients.get(serverId);
            if (!instance) {
                throw new Error(`MCP server '${serverId}' not connected`);
            }
            const toolSet = await instance.client.tools();
            // Convert toolSet object to array with names from keys
            const toolInfos = Object.entries(toolSet).map(([name, tool]) => ({
                serverId,
                name,
                description: tool.description || "",
                inputSchema: tool.inputSchema || {},
            }));
            return toolInfos;
        }, (error) => new Error(`Failed to get tools from MCP server '${serverId}': ${error instanceof Error ? error.message : String(error)}`));
    }
    /**
     * Get all tools from all connected servers
     */
    async getAllTools() {
        const allTools = [];
        for (const serverId of this.clients.keys()) {
            const result = await this.getTools(serverId);
            if (result.success) {
                allTools.push(...result.data);
            }
            else {
                logger.error("Failed to get tools from server", {
                    serverId,
                    error: result.error.message,
                });
            }
        }
        return allTools;
    }
    /**
     * Check if server is connected
     */
    isConnected(serverId) {
        return this.clients.has(serverId);
    }
    /**
     * Get connected server IDs
     */
    getConnectedServerIds() {
        return Array.from(this.clients.keys());
    }
    /**
     * Get connection count
     */
    getConnectionCount() {
        return this.clients.size;
    }
    /**
     * Connect to all enabled servers (parallel, non-blocking)
     */
    async connectToEnabledServers() {
        const { listEnabledMCPServers } = await import("../config/mcp-config.js");
        const result = await listEnabledMCPServers();
        if (!result.success) {
            logger.error("Failed to load enabled MCP servers", {
                error: result.error.message,
            });
            return;
        }
        const servers = result.data;
        // Connect to all servers in parallel
        const connectPromises = servers.map(async (server) => {
            const connectResult = await this.connect(server);
            if (!connectResult.success) {
                logger.error("Failed to auto-connect to server", {
                    serverId: server.id,
                    error: connectResult.error?.message || String(connectResult.error),
                });
                return { serverId: server.id, success: false, error: connectResult.error };
            }
            else {
                return { serverId: server.id, success: true };
            }
        });
        const results = await Promise.allSettled(connectPromises);
        const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
        const _failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)).length;
        // Load tools from all connected servers
        if (successful > 0) {
            const { loadMCPTools } = await import("../registry/mcp-tool-integration.js");
            await loadMCPTools();
        }
        // Emit final status after all connections
        this.emitStatusChange();
    }
    /**
     * Emit MCP status change event
     */
    emitStatusChange() {
        // Dynamic import to avoid circular dependency
        import("./mcp-event-emitter.js").then(({ emitMCPStatus }) => {
            emitMCPStatus().catch((error) => {
                logger.error("Failed to emit MCP status", { error });
            });
        });
    }
    /**
     * Reconnect to MCP server
     */
    async reconnect(serverId) {
        return tryCatchAsync(async () => {
            const instance = this.clients.get(serverId);
            if (!instance) {
                throw new Error(`MCP server '${serverId}' not connected`);
            }
            const server = { id: serverId, ...instance.config };
            // Disconnect
            const disconnectResult = await this.disconnect(serverId);
            if (!disconnectResult.success) {
                throw disconnectResult.error;
            }
            // Reconnect
            const connectResult = await this.connect(server);
            if (!connectResult.success) {
                throw connectResult.error;
            }
        }, (error) => new Error(`Failed to reconnect to MCP server '${serverId}': ${error instanceof Error ? error.message : String(error)}`));
    }
}
/**
 * Global MCP manager instance
 */
let mcpManagerInstance = null;
/**
 * Get MCP manager instance (singleton)
 */
export function getMCPManager() {
    if (!mcpManagerInstance) {
        mcpManagerInstance = new MCPManager();
    }
    return mcpManagerInstance;
}
/**
 * Reset MCP manager instance (for testing)
 */
export function resetMCPManager() {
    mcpManagerInstance = null;
}
//# sourceMappingURL=mcp-manager.js.map