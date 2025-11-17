/**
 * MCP Status Hook
 * Track MCP server connection status via event bus (event-driven, no polling)
 *
 * ARCHITECTURE: Pure UI Client
 * - No business logic in client
 * - Listens to events from core
 * - Core calculates and emits status
 */

import { useEffect, useState } from "react";
import {  eventBus  } from "@sylphx/code-client";

export interface MCPStatus {
	total: number;
	connected: number;
	failed: number;
	toolCount: number;
}

/**
 * Hook to get MCP connection status
 * Event-driven - updates when core emits status change events
 */
export function useMCPStatus(): MCPStatus {
	const [status, setStatus] = useState<MCPStatus>({
		total: 0,
		connected: 0,
		failed: 0,
		toolCount: 0,
	});

	useEffect(() => {
		// Subscribe to MCP status change events
		const unsubscribe = eventBus.on("mcp:statusChanged", (data) => {
			setStatus(data);
		});

		return unsubscribe;
	}, []);

	return status;
}
