/**
 * MCP Status Hook
 * Track MCP server connection status via embedded context
 */

import { useState, useEffect } from "react";
import { getMCPManager } from "@sylphx/code-core";

export interface MCPStatus {
	total: number;
	connected: number;
	failed: number;
	toolCount: number;
}

/**
 * Hook to get MCP connection status
 * Updates every 2 seconds
 */
export function useMCPStatus(): MCPStatus {
	const [status, setStatus] = useState<MCPStatus>({
		total: 0,
		connected: 0,
		failed: 0,
		toolCount: 0,
	});

	useEffect(() => {
		const updateStatus = async () => {
			try {
				const { listMCPServers } = await import("@sylphx/code-core");
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

				setStatus({
					total: enabledServers.length,
					connected: connectedServerIds.length,
					failed: enabledServers.length - connectedServerIds.length,
					toolCount: totalTools,
				});
			} catch (error) {
				console.error("[useMCPStatus] Error:", error);
			}
		};

		// Initial update
		updateStatus();

		// Poll every 2 seconds
		const interval = setInterval(updateStatus, 2000);

		return () => clearInterval(interval);
	}, []);

	return status;
}
