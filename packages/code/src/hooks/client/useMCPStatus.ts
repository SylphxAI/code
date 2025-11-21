/**
 * MCP Status Hook
 * Track MCP server connection status via event bus using Zen signals
 *
 * ARCHITECTURE: Pure UI Client
 * - No business logic in client
 * - Listens to events from core
 * - Core calculates and emits status
 * - Status stored in Zen signals for global access
 */

import { useEffect } from "react";
import {
	eventBus,
	useMCPStatus as useMCPStatusSignal,
	setMCPStatus as setMCPStatusSignal,
	type MCPStatus,
} from "@sylphx/code-client";

/**
 * Hook to get MCP connection status
 * Event-driven - updates when core emits status change events
 * Data stored in Zen signals for global access
 */
export function useMCPStatus(): MCPStatus {
	const status = useMCPStatusSignal();

	useEffect(() => {
		// Subscribe to MCP status change events
		const unsubscribe = eventBus.on("mcp:statusChanged", (data) => {
			setMCPStatusSignal(data);
		});

		return unsubscribe;
	}, []);

	return status;
}
