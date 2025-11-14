/**
 * MCP Configuration Management
 *
 * Configuration system for MCP servers stored in .sylphx-code/mcp-servers.json
 * Handles loading, saving, and validation of MCP server configurations
 */

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { type Result, success, tryCatchAsync } from "../ai/result.js";
import type {
	MCPServerConfig,
	MCPServersConfig,
	MCPTransport,
	MCPTransportHTTP,
	MCPTransportSSE,
	MCPTransportStdio,
} from "../types/mcp.types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("MCPConfig");

/**
 * Zod schemas for validation
 */

const mcpTransportHTTPSchema = z.object({
	type: z.literal("http"),
	url: z.string().url(),
	headers: z.record(z.string()).optional(),
}) satisfies z.ZodType<MCPTransportHTTP>;

const mcpTransportSSESchema = z.object({
	type: z.literal("sse"),
	url: z.string().url(),
	headers: z.record(z.string()).optional(),
}) satisfies z.ZodType<MCPTransportSSE>;

const mcpTransportStdioSchema = z.object({
	type: z.literal("stdio"),
	command: z.string().min(1),
	args: z.array(z.string()).optional(),
	env: z.record(z.string()).optional(),
}) satisfies z.ZodType<MCPTransportStdio>;

const mcpTransportSchema = z.discriminatedUnion("type", [
	mcpTransportHTTPSchema,
	mcpTransportSSESchema,
	mcpTransportStdioSchema,
]) satisfies z.ZodType<MCPTransport>;

const mcpServerConfigSchema = z.object({
	id: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "Server ID must contain only alphanumeric characters, hyphens, and underscores"),
	name: z.string().min(1),
	description: z.string().optional(),
	transport: mcpTransportSchema,
	enabled: z.boolean(),
	tags: z.array(z.string()).optional(),
	metadata: z.record(z.unknown()).optional(),
}) satisfies z.ZodType<MCPServerConfig>;

const mcpServersConfigSchema = z.object({
	version: z.string(),
	servers: z.array(mcpServerConfigSchema),
	updatedAt: z.number().optional(),
}) satisfies z.ZodType<MCPServersConfig>;

/**
 * Configuration file path
 */
const MCP_CONFIG_FILE = ".sylphx-code/mcp-servers.json";

/**
 * Current configuration version
 */
const CONFIG_VERSION = "1.0.0";

/**
 * Get MCP config file path
 */
export const getMCPConfigPath = (cwd: string = process.cwd()): string => {
	return path.join(cwd, MCP_CONFIG_FILE);
};

/**
 * Load MCP servers configuration
 */
export const loadMCPConfig = async (
	cwd: string = process.cwd(),
): Promise<Result<MCPServersConfig, Error>> => {
	return tryCatchAsync(
		async () => {
			const configPath = getMCPConfigPath(cwd);

			try {
				const content = await fs.readFile(configPath, "utf8");
				const parsed = JSON.parse(content);
				const validated = mcpServersConfigSchema.parse(parsed);
				return validated;
			} catch (error: unknown) {
				if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
					// File doesn't exist, return empty config
					return {
						version: CONFIG_VERSION,
						servers: [],
					};
				}
				throw error; // Re-throw other errors
			}
		},
		(error: unknown) =>
			new Error(`Failed to load MCP config: ${error instanceof Error ? error.message : String(error)}`),
	);
};

/**
 * Save MCP servers configuration
 */
export const saveMCPConfig = async (
	config: MCPServersConfig,
	cwd: string = process.cwd(),
): Promise<Result<void, Error>> => {
	const configPath = getMCPConfigPath(cwd);

	return tryCatchAsync(
		async () => {
			// Ensure directory exists
			const dir = path.dirname(configPath);
			await fs.mkdir(dir, { recursive: true });

			// Set version and timestamp
			const configToSave: MCPServersConfig = {
				...config,
				version: CONFIG_VERSION,
				updatedAt: Date.now(),
			};

			// Validate config
			const validated = mcpServersConfigSchema.parse(configToSave);

			// Write config
			const jsonString = JSON.stringify(validated, null, 2) + "\n";
			await fs.writeFile(configPath, jsonString, "utf8");
		},
		(error: unknown) => {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return new Error(`Failed to save MCP config: ${errorMessage}`);
		},
	);
};

/**
 * Check if MCP config exists
 */
export const mcpConfigExists = async (cwd: string = process.cwd()): Promise<boolean> => {
	const configPath = getMCPConfigPath(cwd);

	try {
		await fs.access(configPath);
		return true;
	} catch (error) {
		return false;
	}
};

/**
 * Add MCP server to configuration
 */
export const addMCPServer = async (
	server: MCPServerConfig,
	cwd: string = process.cwd(),
): Promise<Result<void, Error>> => {
	return tryCatchAsync(
		async () => {
			// Validate server config
			mcpServerConfigSchema.parse(server);

			// Load current config
			const configResult = await loadMCPConfig(cwd);
			if (!configResult.success) {
				throw configResult.error;
			}

			const config = configResult.data;

			// Check if server ID already exists
			const existingIndex = config.servers.findIndex((s) => s.id === server.id);
			if (existingIndex !== -1) {
				throw new Error(`Server with ID '${server.id}' already exists`);
			}

			// Add server
			config.servers.push(server);

			// Save config
			const saveResult = await saveMCPConfig(config, cwd);
			if (!saveResult.success) {
				throw saveResult.error;
			}
		},
		(error: unknown) => {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return new Error(`Failed to add MCP server: ${errorMessage}`);
		},
	);
};

/**
 * Update MCP server in configuration
 */
export const updateMCPServer = async (
	serverId: string,
	updates: Partial<Omit<MCPServerConfig, "id">>,
	cwd: string = process.cwd(),
): Promise<Result<void, Error>> => {
	return tryCatchAsync(
		async () => {
			// Load current config
			const configResult = await loadMCPConfig(cwd);
			if (!configResult.success) {
				throw configResult.error;
			}

			const config = configResult.data;

			// Find server
			const serverIndex = config.servers.findIndex((s) => s.id === serverId);
			if (serverIndex === -1) {
				throw new Error(`Server with ID '${serverId}' not found`);
			}

			// Update server
			const updatedServer = {
				...config.servers[serverIndex],
				...updates,
			};

			// Validate updated server
			mcpServerConfigSchema.parse(updatedServer);

			// Replace server
			config.servers[serverIndex] = updatedServer;

			// Save config
			const saveResult = await saveMCPConfig(config, cwd);
			if (!saveResult.success) {
				throw saveResult.error;
			}
		},
		(error: unknown) =>
			new Error(`Failed to update MCP server: ${error instanceof Error ? error.message : String(error)}`),
	);
};

/**
 * Remove MCP server from configuration
 */
export const removeMCPServer = async (
	serverId: string,
	cwd: string = process.cwd(),
): Promise<Result<void, Error>> => {
	return tryCatchAsync(
		async () => {
			// Load current config
			const configResult = await loadMCPConfig(cwd);
			if (!configResult.success) {
				throw configResult.error;
			}

			const config = configResult.data;

			// Find server
			const serverIndex = config.servers.findIndex((s) => s.id === serverId);
			if (serverIndex === -1) {
				throw new Error(`Server with ID '${serverId}' not found`);
			}

			// Remove server
			config.servers.splice(serverIndex, 1);

			// Save config
			const saveResult = await saveMCPConfig(config, cwd);
			if (!saveResult.success) {
				throw saveResult.error;
			}
		},
		(error: unknown) =>
			new Error(`Failed to remove MCP server: ${error instanceof Error ? error.message : String(error)}`),
	);
};

/**
 * Get MCP server by ID
 */
export const getMCPServer = async (
	serverId: string,
	cwd: string = process.cwd(),
): Promise<Result<MCPServerConfig | null, Error>> => {
	return tryCatchAsync(
		async () => {
			const configResult = await loadMCPConfig(cwd);
			if (!configResult.success) {
				throw configResult.error;
			}

			const server = configResult.data.servers.find((s) => s.id === serverId);
			return server || null;
		},
		(error: unknown) =>
			new Error(`Failed to get MCP server: ${error instanceof Error ? error.message : String(error)}`),
	);
};

/**
 * List all MCP servers
 */
export const listMCPServers = async (
	cwd: string = process.cwd(),
): Promise<Result<MCPServerConfig[], Error>> => {
	return tryCatchAsync(
		async () => {
			const configResult = await loadMCPConfig(cwd);
			if (!configResult.success) {
				throw configResult.error;
			}

			return configResult.data.servers;
		},
		(error: unknown) =>
			new Error(`Failed to list MCP servers: ${error instanceof Error ? error.message : String(error)}`),
	);
};

/**
 * List enabled MCP servers
 */
export const listEnabledMCPServers = async (
	cwd: string = process.cwd(),
): Promise<Result<MCPServerConfig[], Error>> => {
	return tryCatchAsync(
		async () => {
			const configResult = await loadMCPConfig(cwd);
			if (!configResult.success) {
				throw configResult.error;
			}

			return configResult.data.servers.filter((s) => s.enabled);
		},
		(error: unknown) =>
			new Error(
				`Failed to list enabled MCP servers: ${error instanceof Error ? error.message : String(error)}`,
			),
	);
};

/**
 * Enable MCP server
 */
export const enableMCPServer = async (
	serverId: string,
	cwd: string = process.cwd(),
): Promise<Result<void, Error>> => {
	return updateMCPServer(serverId, { enabled: true }, cwd);
};

/**
 * Disable MCP server
 */
export const disableMCPServer = async (
	serverId: string,
	cwd: string = process.cwd(),
): Promise<Result<void, Error>> => {
	return updateMCPServer(serverId, { enabled: false }, cwd);
};

/**
 * Validate MCP server configuration
 */
export const validateMCPServerConfig = (
	server: unknown,
): Result<MCPServerConfig, Error> => {
	try {
		const validated = mcpServerConfigSchema.parse(server);
		return success(validated);
	} catch (error: unknown) {
		return {
			ok: false,
			error: new Error(
				`Invalid MCP server config: ${error instanceof Error ? error.message : String(error)}`,
			),
		};
	}
};
