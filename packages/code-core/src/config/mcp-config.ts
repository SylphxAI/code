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
	MCPServerWithId,
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
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	transport: mcpTransportSchema,
	enabled: z.boolean().optional(),
	tags: z.array(z.string()).optional(),
	metadata: z.record(z.unknown()).optional(),
}) satisfies z.ZodType<MCPServerConfig>;

const mcpServersConfigSchema = z.object({
	mcpServers: z.record(z.string(), mcpServerConfigSchema),
}) satisfies z.ZodType<MCPServersConfig>;

/**
 * Configuration file path
 */
const MCP_CONFIG_FILE = ".sylphx-code/mcp-servers.json";

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
						mcpServers: {},
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

			// Validate config
			const validated = mcpServersConfigSchema.parse(config);

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
	id: string,
	serverConfig: MCPServerConfig,
	cwd: string = process.cwd(),
): Promise<Result<void, Error>> => {
	console.log("[addMCPServer] ENTER - id:", id, "config:", serverConfig);
	console.log("[addMCPServer] cwd:", cwd);

	return tryCatchAsync(
		async () => {
			// Validate server ID
			const idRegex = /^[a-zA-Z0-9_-]+$/;
			if (!id || !idRegex.test(id)) {
				throw new Error("Server ID must contain only alphanumeric characters, hyphens, and underscores");
			}

			// Validate server config
			console.log("[addMCPServer] Validating...");
			mcpServerConfigSchema.parse(serverConfig);
			console.log("[addMCPServer] Validation passed");

			// Load current config
			console.log("[addMCPServer] Loading config...");
			const configResult = await loadMCPConfig(cwd);
			console.log("[addMCPServer] loadMCPConfig result:", configResult);

			if (!configResult.success) {
				console.error("[addMCPServer] Load failed:", configResult.error);
				throw configResult.error;
			}

			const config = configResult.data;
			console.log("[addMCPServer] Current servers:", Object.keys(config.mcpServers).length);

			// Check if server ID already exists
			if (config.mcpServers[id]) {
				console.log("[addMCPServer] Server already exists");
				throw new Error(`Server with ID '${id}' already exists`);
			}

			// Add server with enabled defaulting to true
			config.mcpServers[id] = {
				...serverConfig,
				enabled: serverConfig.enabled ?? true,
			};
			console.log("[addMCPServer] Server added, total now:", Object.keys(config.mcpServers).length);

			// Save config
			console.log("[addMCPServer] Saving config...");
			const saveResult = await saveMCPConfig(config, cwd);
			console.log("[addMCPServer] saveMCPConfig result:", saveResult);

			if (!saveResult.success) {
				console.error("[addMCPServer] Save failed:", saveResult.error);
				throw saveResult.error;
			}

			console.log("[addMCPServer] SUCCESS - saved");
		},
		(error: unknown) => {
			console.error("[addMCPServer] CATCH ERROR:", error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			return new Error(`Failed to add MCP server: ${errorMessage}`);
		},
	);
};

/**
 * Update MCP server in configuration
 */
export const updateMCPServer = async (
	id: string,
	updates: Partial<MCPServerConfig>,
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
			if (!config.mcpServers[id]) {
				throw new Error(`Server with ID '${id}' not found`);
			}

			// Update server
			const updatedServer = {
				...config.mcpServers[id],
				...updates,
			};

			// Validate updated server
			mcpServerConfigSchema.parse(updatedServer);

			// Replace server
			config.mcpServers[id] = updatedServer;

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
	id: string,
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
			if (!config.mcpServers[id]) {
				throw new Error(`Server with ID '${id}' not found`);
			}

			// Remove server
			delete config.mcpServers[id];

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
	id: string,
	cwd: string = process.cwd(),
): Promise<Result<MCPServerConfig | null, Error>> => {
	return tryCatchAsync(
		async () => {
			const configResult = await loadMCPConfig(cwd);
			if (!configResult.success) {
				throw configResult.error;
			}

			return configResult.data.mcpServers[id] || null;
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
): Promise<Result<MCPServerWithId[], Error>> => {
	return tryCatchAsync(
		async () => {
			const configResult = await loadMCPConfig(cwd);
			if (!configResult.success) {
				throw configResult.error;
			}

			return Object.entries(configResult.data.mcpServers).map(([id, server]) => ({
				id,
				...server,
				enabled: server.enabled ?? true,
			}));
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
): Promise<Result<MCPServerWithId[], Error>> => {
	return tryCatchAsync(
		async () => {
			const serversResult = await listMCPServers(cwd);
			if (!serversResult.success) {
				throw serversResult.error;
			}

			return serversResult.data.filter((s) => s.enabled);
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
