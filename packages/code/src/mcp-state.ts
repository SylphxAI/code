/**
 * MCP State - Local MCP status state with React hook
 */

import { useSyncExternalStore } from "react";
import type { MCPServerWithId, MCPToolInfo } from "@sylphx/code-core";

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

// ============================================================================
// MCP Server Details View State
// ============================================================================

export type MCPServerDetailsView = "overview" | "tools-list" | "tool-detail";

const mcpServerDetailsViewState = createState<Record<string, MCPServerDetailsView>>({});
const setMCPServerDetailsViewMap = mcpServerDetailsViewState.set;
const getMCPServerDetailsViewMap = mcpServerDetailsViewState.get;
export const useMCPServerDetailsView = () => useStore(mcpServerDetailsViewState);

export const setMCPServerDetailsView = (serverId: string, view: MCPServerDetailsView) => {
	const current = getMCPServerDetailsViewMap();
	setMCPServerDetailsViewMap({ ...current, [serverId]: view });
};

// ============================================================================
// MCP Server Tools State
// ============================================================================

const mcpServerToolsState = createState<Record<string, MCPToolInfo[]>>({});
const setMCPServerToolsMap = mcpServerToolsState.set;
const getMCPServerToolsMap = mcpServerToolsState.get;
export const useMCPServerTools = () => useStore(mcpServerToolsState);

export const setMCPServerTools = (serverId: string, tools: MCPToolInfo[]) => {
	const current = getMCPServerToolsMap();
	setMCPServerToolsMap({ ...current, [serverId]: tools });
};

// ============================================================================
// MCP Selected Tool State
// ============================================================================

const mcpSelectedToolsState = createState<Record<string, MCPToolInfo | null>>({});
const setMCPSelectedToolsMap = mcpSelectedToolsState.set;
const getMCPSelectedToolsMap = mcpSelectedToolsState.get;
export const useMCPSelectedTools = () => useStore(mcpSelectedToolsState);

export const setMCPSelectedTool = (serverId: string, tool: MCPToolInfo | null) => {
	const current = getMCPSelectedToolsMap();
	setMCPSelectedToolsMap({ ...current, [serverId]: tool });
};

// ============================================================================
// MCP Server Details Loading State
// ============================================================================

const mcpServerDetailsLoadingState = createState<Record<string, boolean>>({});
const setMCPServerDetailsLoadingMap = mcpServerDetailsLoadingState.set;
const getMCPServerDetailsLoadingMap = mcpServerDetailsLoadingState.get;
export const useMCPServerDetailsLoading = () => useStore(mcpServerDetailsLoadingState);

export const setMCPServerDetailsLoading = (serverId: string, loading: boolean) => {
	const current = getMCPServerDetailsLoadingMap();
	setMCPServerDetailsLoadingMap({ ...current, [serverId]: loading });
};

// ============================================================================
// MCP Server Connected State
// ============================================================================

const mcpServerConnectedState = createState<Record<string, boolean>>({});
const setMCPServerConnectedMap = mcpServerConnectedState.set;
const getMCPServerConnectedMap = mcpServerConnectedState.get;
export const useMCPServerConnected = () => useStore(mcpServerConnectedState);

export const setMCPServerConnected = (serverId: string, connected: boolean) => {
	const current = getMCPServerConnectedMap();
	setMCPServerConnectedMap({ ...current, [serverId]: connected });
};

// ============================================================================
// MCP Server Connection Info State
// ============================================================================

export interface MCPConnectionInfo {
	connectedAt?: number;
	lastActivity?: number;
	toolCount?: number;
}

const mcpServerConnectionInfoState = createState<Record<string, MCPConnectionInfo | null>>({});
const setMCPServerConnectionInfoMap = mcpServerConnectionInfoState.set;
const getMCPServerConnectionInfoMap = mcpServerConnectionInfoState.get;
export const useMCPServerConnectionInfo = () => useStore(mcpServerConnectionInfoState);

export const setMCPServerConnectionInfo = (serverId: string, info: MCPConnectionInfo | null) => {
	const current = getMCPServerConnectionInfoMap();
	setMCPServerConnectionInfoMap({ ...current, [serverId]: info });
};
