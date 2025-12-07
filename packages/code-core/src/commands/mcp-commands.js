/**
 * MCP Commands
 *
 * Commands for managing MCP servers:
 * - mcp:add - Add MCP server
 * - mcp:remove - Remove MCP server
 * - mcp:list - List MCP servers
 * - mcp:enable - Enable MCP server
 * - mcp:disable - Disable MCP server
 * - mcp:connect - Connect to MCP server
 * - mcp:disconnect - Disconnect from MCP server
 * - mcp:reconnect - Reconnect to MCP server
 */
import { err, ok } from "../ai/result.js";
import { addMCPServer, disableMCPServer, enableMCPServer, loadMCPConfig, removeMCPServer, validateMCPServerConfig, } from "../config/mcp-config.js";
import { reloadMCPServerTools } from "../registry/mcp-tool-integration.js";
import { getMCPManager } from "../services/mcp-manager.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("MCPCommands");
/**
 * mcp:add command
 * Add a new MCP server configuration
 */
export const mcpAddCommand = {
    name: "mcp:add",
    description: "Add a new MCP server",
    options: [
        {
            name: "id",
            description: "Server ID (alphanumeric, hyphens, underscores only)",
            type: "string",
            required: true,
            validate: (value) => {
                if (typeof value !== "string")
                    return "ID must be a string";
                if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                    return "ID must contain only alphanumeric characters, hyphens, and underscores";
                }
                return true;
            },
        },
        {
            name: "name",
            description: "Display name",
            type: "string",
            required: true,
        },
        {
            name: "description",
            description: "Server description",
            type: "string",
            required: false,
        },
        {
            name: "transport",
            description: "Transport type (http, sse, stdio)",
            type: "string",
            required: true,
            choices: ["http", "sse", "stdio"],
        },
        {
            name: "url",
            description: "Server URL (for http/sse transport)",
            type: "string",
            required: false,
        },
        {
            name: "command",
            description: "Command to run (for stdio transport)",
            type: "string",
            required: false,
        },
        {
            name: "args",
            description: "Command arguments (for stdio transport, comma-separated)",
            type: "string",
            required: false,
        },
        {
            name: "enabled",
            description: "Enable server on creation",
            type: "boolean",
            default: true,
        },
    ],
    handler: async (context) => {
        try {
            const { id, name, description, transport, url, command, args, enabled } = context.options;
            // Validate transport-specific options
            if ((transport === "http" || transport === "sse") && !url) {
                return err(new Error(`URL is required for ${transport} transport`));
            }
            if (transport === "stdio" && !command) {
                return err(new Error("Command is required for stdio transport"));
            }
            // Build transport config
            let transportConfig;
            if (transport === "http") {
                transportConfig = {
                    type: "http",
                    url: url,
                };
            }
            else if (transport === "sse") {
                transportConfig = {
                    type: "sse",
                    url: url,
                };
            }
            else if (transport === "stdio") {
                transportConfig = {
                    type: "stdio",
                    command: command,
                    args: args ? args.split(",").map((s) => s.trim()) : undefined,
                };
            }
            else {
                return err(new Error(`Invalid transport type: ${transport}`));
            }
            // Build server config
            const serverConfig = {
                id: id,
                name: name,
                description: description,
                transport: transportConfig,
                enabled: enabled !== false,
            };
            // Validate server config
            const validation = validateMCPServerConfig(serverConfig);
            if (!validation.ok) {
                return err(validation.error);
            }
            // Add server
            const result = await addMCPServer(serverConfig);
            if (!result.ok) {
                return err(result.error);
            }
            logger.success("Added MCP server", { id, name });
            return ok({
                message: `Added MCP server '${name}' (${id})`,
                server: serverConfig,
            });
        }
        catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    },
    examples: [
        'mcp:add --id github --name "GitHub" --transport http --url https://api.github.com/mcp',
        'mcp:add --id local --name "Local Tools" --transport stdio --command npx --args "-y,@modelcontextprotocol/server-everything"',
    ],
};
/**
 * mcp:remove command
 * Remove an MCP server configuration
 */
export const mcpRemoveCommand = {
    name: "mcp:remove",
    description: "Remove an MCP server",
    options: [
        {
            name: "id",
            description: "Server ID to remove",
            type: "string",
            required: true,
        },
    ],
    handler: async (context) => {
        try {
            const { id } = context.options;
            // Disconnect if connected
            const mcpManager = getMCPManager();
            if (mcpManager.isConnected(id)) {
                const disconnectResult = await mcpManager.disconnect(id);
                if (!disconnectResult.ok) {
                    logger.warn("Failed to disconnect server before removal", {
                        id,
                        error: disconnectResult.error.message,
                    });
                }
            }
            // Remove server
            const result = await removeMCPServer(id);
            if (!result.ok) {
                return err(result.error);
            }
            logger.success("Removed MCP server", { id });
            return ok({
                message: `Removed MCP server '${id}'`,
            });
        }
        catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    },
    examples: ["mcp:remove --id github"],
};
/**
 * mcp:list command
 * List all MCP servers
 */
export const mcpListCommand = {
    name: "mcp:list",
    description: "List all MCP servers",
    options: [
        {
            name: "enabled",
            description: "Show only enabled servers",
            type: "boolean",
            default: false,
        },
        {
            name: "connected",
            description: "Show only connected servers",
            type: "boolean",
            default: false,
        },
    ],
    handler: async (context) => {
        try {
            const { enabled, connected } = context.options;
            // Load config
            const configResult = await loadMCPConfig();
            if (!configResult.ok) {
                return err(configResult.error);
            }
            let servers = configResult.data.servers;
            // Filter by enabled
            if (enabled) {
                servers = servers.filter((s) => s.enabled);
            }
            // Filter by connected
            if (connected) {
                const mcpManager = getMCPManager();
                servers = servers.filter((s) => mcpManager.isConnected(s.id));
            }
            // Get connection states
            const mcpManager = getMCPManager();
            const serverStates = await Promise.all(servers.map(async (server) => {
                const state = await mcpManager.getServerState(server.id);
                return {
                    ...server,
                    connected: mcpManager.isConnected(server.id),
                    toolCount: state?.toolCount || 0,
                };
            }));
            return ok({
                message: `Found ${serverStates.length} MCP server(s)`,
                servers: serverStates,
            });
        }
        catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    },
    examples: ["mcp:list", "mcp:list --enabled", "mcp:list --connected"],
};
/**
 * mcp:enable command
 * Enable an MCP server
 */
export const mcpEnableCommand = {
    name: "mcp:enable",
    description: "Enable an MCP server",
    options: [
        {
            name: "id",
            description: "Server ID to enable",
            type: "string",
            required: true,
        },
    ],
    handler: async (context) => {
        try {
            const { id } = context.options;
            const result = await enableMCPServer(id);
            if (!result.ok) {
                return err(result.error);
            }
            logger.success("Enabled MCP server", { id });
            return ok({
                message: `Enabled MCP server '${id}'`,
            });
        }
        catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    },
    examples: ["mcp:enable --id github"],
};
/**
 * mcp:disable command
 * Disable an MCP server
 */
export const mcpDisableCommand = {
    name: "mcp:disable",
    description: "Disable an MCP server",
    options: [
        {
            name: "id",
            description: "Server ID to disable",
            type: "string",
            required: true,
        },
    ],
    handler: async (context) => {
        try {
            const { id } = context.options;
            const result = await disableMCPServer(id);
            if (!result.ok) {
                return err(result.error);
            }
            logger.success("Disabled MCP server", { id });
            return ok({
                message: `Disabled MCP server '${id}'`,
            });
        }
        catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    },
    examples: ["mcp:disable --id github"],
};
/**
 * mcp:connect command
 * Connect to an MCP server
 */
export const mcpConnectCommand = {
    name: "mcp:connect",
    description: "Connect to an MCP server",
    options: [
        {
            name: "id",
            description: "Server ID to connect",
            type: "string",
            required: true,
        },
    ],
    handler: async (context) => {
        try {
            const { id } = context.options;
            // Load server config
            const configResult = await loadMCPConfig();
            if (!configResult.ok) {
                return err(configResult.error);
            }
            const server = configResult.data.servers.find((s) => s.id === id);
            if (!server) {
                return err(new Error(`Server '${id}' not found`));
            }
            // Connect to server
            const mcpManager = getMCPManager();
            const connectResult = await mcpManager.connect(server);
            if (!connectResult.ok) {
                return err(connectResult.error);
            }
            // Load tools
            await reloadMCPServerTools(id);
            const state = await mcpManager.getServerState(id);
            logger.success("Connected to MCP server", {
                id,
                toolCount: state?.toolCount || 0,
            });
            return ok({
                message: `Connected to MCP server '${id}'`,
                toolCount: state?.toolCount || 0,
            });
        }
        catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    },
    examples: ["mcp:connect --id github"],
};
/**
 * mcp:disconnect command
 * Disconnect from an MCP server
 */
export const mcpDisconnectCommand = {
    name: "mcp:disconnect",
    description: "Disconnect from an MCP server",
    options: [
        {
            name: "id",
            description: "Server ID to disconnect",
            type: "string",
            required: true,
        },
    ],
    handler: async (context) => {
        try {
            const { id } = context.options;
            const mcpManager = getMCPManager();
            const result = await mcpManager.disconnect(id);
            if (!result.ok) {
                return err(result.error);
            }
            logger.success("Disconnected from MCP server", { id });
            return ok({
                message: `Disconnected from MCP server '${id}'`,
            });
        }
        catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    },
    examples: ["mcp:disconnect --id github"],
};
/**
 * mcp:reconnect command
 * Reconnect to an MCP server
 */
export const mcpReconnectCommand = {
    name: "mcp:reconnect",
    description: "Reconnect to an MCP server",
    options: [
        {
            name: "id",
            description: "Server ID to reconnect",
            type: "string",
            required: true,
        },
    ],
    handler: async (context) => {
        try {
            const { id } = context.options;
            const mcpManager = getMCPManager();
            const result = await mcpManager.reconnect(id);
            if (!result.ok) {
                return err(result.error);
            }
            // Reload tools
            await reloadMCPServerTools(id);
            const state = await mcpManager.getServerState(id);
            logger.success("Reconnected to MCP server", {
                id,
                toolCount: state?.toolCount || 0,
            });
            return ok({
                message: `Reconnected to MCP server '${id}'`,
                toolCount: state?.toolCount || 0,
            });
        }
        catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    },
    examples: ["mcp:reconnect --id github"],
};
/**
 * All MCP commands
 */
export const MCP_COMMANDS = [
    mcpAddCommand,
    mcpRemoveCommand,
    mcpListCommand,
    mcpEnableCommand,
    mcpDisableCommand,
    mcpConnectCommand,
    mcpDisconnectCommand,
    mcpReconnectCommand,
];
//# sourceMappingURL=mcp-commands.js.map