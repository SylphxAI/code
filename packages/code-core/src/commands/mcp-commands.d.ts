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
import type { Command } from "../ai/command-system.js";
/**
 * mcp:add command
 * Add a new MCP server configuration
 */
export declare const mcpAddCommand: Command;
/**
 * mcp:remove command
 * Remove an MCP server configuration
 */
export declare const mcpRemoveCommand: Command;
/**
 * mcp:list command
 * List all MCP servers
 */
export declare const mcpListCommand: Command;
/**
 * mcp:enable command
 * Enable an MCP server
 */
export declare const mcpEnableCommand: Command;
/**
 * mcp:disable command
 * Disable an MCP server
 */
export declare const mcpDisableCommand: Command;
/**
 * mcp:connect command
 * Connect to an MCP server
 */
export declare const mcpConnectCommand: Command;
/**
 * mcp:disconnect command
 * Disconnect from an MCP server
 */
export declare const mcpDisconnectCommand: Command;
/**
 * mcp:reconnect command
 * Reconnect to an MCP server
 */
export declare const mcpReconnectCommand: Command;
/**
 * All MCP commands
 */
export declare const MCP_COMMANDS: Command[];
//# sourceMappingURL=mcp-commands.d.ts.map