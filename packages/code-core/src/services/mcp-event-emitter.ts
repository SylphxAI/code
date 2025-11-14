/**
 * MCP Event Emitter
 * Emits MCP status change events to client via eventBus
 *
 * ARCHITECTURE: Business logic stays in core, client is pure UI
 * - Core (this file): Calculates status and emits events
 * - Client: Listens to events and updates UI
 */

import { eventBus } from "@sylphx/code-client";
import { getMCPManager } from "./mcp-manager.js";
import { listMCPServers } from "../config/mcp-config.js";

/**
 * Calculate and emit current MCP status
 */
export async function emitMCPStatus(): Promise<void> {
	try {
		const mcpManager = getMCPManager();

		// Get all servers
		const serversResult = await listMCPServers();
		if (!serversResult.success) {
			return;
		}

		const servers = serversResult.data;
		const enabledServers = servers.filter((s) => s.enabled);
		const connectedServerIds = mcpManager.getConnectedServerIds();

		// Count tools across all connected servers
		let totalTools = 0;
		for (const serverId of connectedServerIds) {
			const state = await mcpManager.getServerState(serverId);
			if (state) {
				totalTools += state.toolCount;
			}
		}

		// Emit status event
		eventBus.emit("mcp:statusChanged", {
			total: enabledServers.length,
			connected: connectedServerIds.length,
			failed: enabledServers.length - connectedServerIds.length,
			toolCount: totalTools,
		});
	} catch (error) {
		console.error("[emitMCPStatus] Error:", error);
	}
}
