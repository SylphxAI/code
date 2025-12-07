/**
 * MCP State - Local MCP status state with React hook
 */

import { useSyncExternalStore } from "react";
import type { MCPServerWithId } from "@sylphx/code-core";

type Listener = () => void;

function createState<T>(initial: T) {
	let value = initial;
	const listeners = new Set<Listener>();

	return {
		get: () => value,
		set: (newValue: T) => {
			value = newValue;
			listeners.forEach((l) => l());
		},
		subscribe: (listener: Listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

function useStore<T>(store: ReturnType<typeof createState<T>>): T {
	return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ============================================================================
// MCP Status Types
// ============================================================================

export interface MCPStatus {
	connected: number;
	total: number;
	servers: Record<string, { connected: boolean; error?: string }>;
}

// ============================================================================
// MCP Status State
// ============================================================================

const mcpStatusState = createState<MCPStatus>({
	connected: 0,
	total: 0,
	servers: {},
});

export const setMCPStatus = mcpStatusState.set;
export const getMCPStatus = mcpStatusState.get;
export const useMCPStatus = () => useStore(mcpStatusState);

// ============================================================================
// MCP Management State
// ============================================================================

export type MCPManagementStep = "list-servers" | "add-server" | "server-details";

const mcpManagementStepState = createState<MCPManagementStep>("list-servers");
export const setMCPManagementStep = mcpManagementStepState.set;
export const getMCPManagementStep = mcpManagementStepState.get;
export const useMCPManagementStep = () => useStore(mcpManagementStepState);

// ============================================================================
// MCP Servers State
// ============================================================================

const mcpServersState = createState<MCPServerWithId[]>([]);
export const setMCPServers = mcpServersState.set;
export const getMCPServers = mcpServersState.get;
export const useMCPServers = () => useStore(mcpServersState);

// ============================================================================
// Selected MCP Server State
// ============================================================================

const selectedMCPServerState = createState<MCPServerWithId | null>(null);
export const setSelectedMCPServer = selectedMCPServerState.set;
export const getSelectedMCPServer = selectedMCPServerState.get;
export const useSelectedMCPServer = () => useStore(selectedMCPServerState);

// ============================================================================
// Connected MCP Servers State
// ============================================================================

const connectedMCPServersState = createState<Set<string>>(new Set());
export const setConnectedMCPServers = connectedMCPServersState.set;
export const getConnectedMCPServers = connectedMCPServersState.get;
export const useConnectedMCPServers = () => useStore(connectedMCPServersState);

// ============================================================================
// MCP Tool Counts State
// ============================================================================

const mcpToolCountsState = createState<Map<string, number>>(new Map());
export const setMCPToolCounts = mcpToolCountsState.set;
export const getMCPToolCounts = mcpToolCountsState.get;
export const useMCPToolCounts = () => useStore(mcpToolCountsState);
