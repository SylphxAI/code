/**
 * MCP Domain Signals
 * Manages MCP server connection status
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

// MCP status type
export interface MCPStatus {
	total: number;
	connected: number;
	failed: number;
	toolCount: number;
}

// Core signal
export const mcpStatus = zen<MCPStatus>({
	total: 0,
	connected: 0,
	failed: 0,
	toolCount: 0,
});

// React hook
export function useMCPStatus(): MCPStatus {
	return useZen(mcpStatus);
}

// Actions
export function setMCPStatus(status: MCPStatus): void {
	mcpStatus.value = status;
}

export function updateMCPStatus(updates: Partial<MCPStatus>): void {
	mcpStatus.value = {
		...mcpStatus.value,
		...updates,
	};
}

// Getter for non-React code
export function getMCPStatus(): MCPStatus {
	return mcpStatus.value;
}
