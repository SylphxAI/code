/**
 * MCP Status Hook
 * Track MCP server connection status via event bus
 *
 * ARCHITECTURE: Pure UI Client
 * - No business logic in client
 * - Listens to events from core
 * - Core calculates and emits status
 * - Status stored in local state for global access
 */

import { useEffect } from "react";
import { eventBus } from "@sylphx/code-core";
import {
	useMCPStatus as useMCPStatusState,
	setMCPStatus as setMCPStatusSignal,
	type MCPStatus,
} from "../../mcp-state.js";

export type { MCPStatus };

/**
 * Hook to get MCP connection status
 * Event-driven - updates when core emits status change events
 * Data stored in local state for global access
 */
export function useMCPStatus(): MCPStatus {
	const status = useMCPStatusState();

	useEffect(() => {
		// Subscribe to MCP status change events
		const unsubscribe = eventBus.on("mcp:statusChanged", (data: any) => {
			setMCPStatusSignal(data as MCPStatus);
		});

		return unsubscribe;
	}, []);

	return status;
}
