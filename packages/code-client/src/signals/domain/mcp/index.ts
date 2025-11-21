/**
 * MCP Domain Signals
 * Manages MCP server connection status and management state
 */

import type { MCPServerWithId, MCPToolInfo } from "@sylphx/code-core";
import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

// MCP status type
export interface MCPStatus {
	total: number;
	connected: number;
	failed: number;
	toolCount: number;
}

// Connection info type
export interface MCPConnectionInfo {
	connectedAt?: number;
	lastActivity?: number;
	toolCount: number;
}

// Management step type
export type MCPManagementStep = "list-servers" | "add-server" | "server-details";

// Server details view type
export type MCPServerDetailsView = "overview" | "tools-list" | "tool-detail";

// Core status signal
export const mcpStatus = zen<MCPStatus>({
	total: 0,
	connected: 0,
	failed: 0,
	toolCount: 0,
});

// Management state signals
export const mcpManagementStep = zen<MCPManagementStep>("list-servers");
export const mcpServers = zen<MCPServerWithId[]>([]);
export const selectedMCPServer = zen<MCPServerWithId | null>(null);
export const connectedMCPServers = zen<Set<string>>(new Set());
export const mcpToolCounts = zen<Map<string, number>>(new Map());

// Server details state signals (per-server, keyed by serverId)
export const mcpServerDetailsView = zen<Record<string, MCPServerDetailsView>>({});
export const mcpServerTools = zen<Record<string, MCPToolInfo[]>>({});
export const mcpSelectedTools = zen<Record<string, MCPToolInfo | null>>({});
export const mcpServerDetailsLoading = zen<Record<string, boolean>>({});
export const mcpServerConnected = zen<Record<string, boolean>>({});
export const mcpServerConnectionInfo = zen<Record<string, MCPConnectionInfo | null>>({});

// React hooks - Status
export function useMCPStatus(): MCPStatus {
	return useZen(mcpStatus);
}

// React hooks - Management
export function useMCPManagementStep(): MCPManagementStep {
	return useZen(mcpManagementStep);
}

export function useMCPServers(): MCPServerWithId[] {
	return useZen(mcpServers);
}

export function useSelectedMCPServer(): MCPServerWithId | null {
	return useZen(selectedMCPServer);
}

export function useConnectedMCPServers(): Set<string> {
	return useZen(connectedMCPServers);
}

export function useMCPToolCounts(): Map<string, number> {
	return useZen(mcpToolCounts);
}

// React hooks - Server Details
export function useMCPServerDetailsView(): Record<string, MCPServerDetailsView> {
	return useZen(mcpServerDetailsView);
}

export function useMCPServerTools(): Record<string, MCPToolInfo[]> {
	return useZen(mcpServerTools);
}

export function useMCPSelectedTools(): Record<string, MCPToolInfo | null> {
	return useZen(mcpSelectedTools);
}

export function useMCPServerDetailsLoading(): Record<string, boolean> {
	return useZen(mcpServerDetailsLoading);
}

export function useMCPServerConnected(): Record<string, boolean> {
	return useZen(mcpServerConnected);
}

export function useMCPServerConnectionInfo(): Record<string, MCPConnectionInfo | null> {
	return useZen(mcpServerConnectionInfo);
}

// Actions - Status
export function setMCPStatus(status: MCPStatus): void {
	mcpStatus.value = status;
}

export function updateMCPStatus(updates: Partial<MCPStatus>): void {
	mcpStatus.value = {
		...mcpStatus.value,
		...updates,
	};
}

// Actions - Management
export function setMCPManagementStep(step: MCPManagementStep): void {
	mcpManagementStep.value = step;
}

export function setMCPServers(servers: MCPServerWithId[]): void {
	mcpServers.value = servers;
}

export function setSelectedMCPServer(server: MCPServerWithId | null): void {
	selectedMCPServer.value = server;
}

export function setConnectedMCPServers(servers: Set<string>): void {
	connectedMCPServers.value = servers;
}

export function setMCPToolCounts(counts: Map<string, number>): void {
	mcpToolCounts.value = counts;
}

// Actions - Server Details
export function setMCPServerDetailsView(serverId: string, view: MCPServerDetailsView): void {
	mcpServerDetailsView.value = {
		...mcpServerDetailsView.value,
		[serverId]: view,
	};
}

export function setMCPServerTools(serverId: string, tools: MCPToolInfo[]): void {
	mcpServerTools.value = {
		...mcpServerTools.value,
		[serverId]: tools,
	};
}

export function setMCPSelectedTool(serverId: string, tool: MCPToolInfo | null): void {
	mcpSelectedTools.value = {
		...mcpSelectedTools.value,
		[serverId]: tool,
	};
}

export function setMCPServerDetailsLoading(serverId: string, loading: boolean): void {
	mcpServerDetailsLoading.value = {
		...mcpServerDetailsLoading.value,
		[serverId]: loading,
	};
}

export function setMCPServerConnected(serverId: string, connected: boolean): void {
	mcpServerConnected.value = {
		...mcpServerConnected.value,
		[serverId]: connected,
	};
}

export function setMCPServerConnectionInfo(serverId: string, info: MCPConnectionInfo | null): void {
	mcpServerConnectionInfo.value = {
		...mcpServerConnectionInfo.value,
		[serverId]: info,
	};
}

// Getters for non-React code
export function getMCPStatus(): MCPStatus {
	return mcpStatus.value;
}

export function getMCPManagementStep(): MCPManagementStep {
	return mcpManagementStep.value;
}

export function getMCPServers(): MCPServerWithId[] {
	return mcpServers.value;
}

export function getSelectedMCPServer(): MCPServerWithId | null {
	return selectedMCPServer.value;
}

export function getConnectedMCPServers(): Set<string> {
	return connectedMCPServers.value;
}

export function getMCPToolCounts(): Map<string, number> {
	return mcpToolCounts.value;
}
