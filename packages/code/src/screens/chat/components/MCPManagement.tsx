/**
 * MCP Management Component (V3 - Streamlined)
 * Shows list of MCP servers with direct access to details
 *
 * ARCHITECTURE: Direct flow
 * 1. List all servers with status badges (connected/enabled/disabled)
 * 2. Click server → view details with all tools and actions
 * 3. Add wizard for new servers
 */

import type { MCPServerWithId } from "@sylphx/code-core";
import {
	useMCPManagementStep,
	useMCPServers,
	useSelectedMCPServer,
	useConnectedMCPServers,
	useMCPToolCounts,
	setMCPManagementStep as setMCPManagementStepSignal,
	setMCPServers as setMCPServersSignal,
	setSelectedMCPServer as setSelectedMCPServerSignal,
	setConnectedMCPServers as setConnectedMCPServersSignal,
	setMCPToolCounts as setMCPToolCountsSignal,
} from "@sylphx/code-client";
import { useEffect } from "react";
import { InlineSelection } from "../../../components/selection/index.js";
import type { SelectionOption } from "../../../hooks/useSelection.js";
import { MCPAddForm } from "./MCPAddForm.js";
import { MCPServerDetails } from "./MCPServerDetails.js";

interface MCPManagementProps {
	onComplete?: () => void;
}

export function MCPManagement({ onComplete }: MCPManagementProps) {
	console.log("[MCPManagement] Component render, onComplete:", !!onComplete);
	const step = useMCPManagementStep();
	const servers = useMCPServers();
	const selectedServer = useSelectedMCPServer();
	const connectedServers = useConnectedMCPServers();
	const toolCounts = useMCPToolCounts();

	// Load servers and connection states
	const loadServers = async () => {
		console.log("[MCPManagement] loadServers START");
		const { listMCPServers, getMCPManager } = await import("@sylphx/code-core");
		const result = await listMCPServers();
		console.log("[MCPManagement] listMCPServers result:", result);

		if (result.success) {
			console.log("[MCPManagement] Setting servers:", result.data.length);
			setMCPServersSignal(result.data);

			// Get connection states and tool counts
			const mcpManager = getMCPManager();
			const connected = new Set<string>();
			const counts = new Map<string, number>();

			for (const server of result.data) {
				if (mcpManager.isConnected(server.id)) {
					connected.add(server.id);

					// Get tool count for connected servers
					const state = await mcpManager.getServerState(server.id);
					if (state) {
						counts.set(server.id, state.toolCount);
					}
				}
			}

			setConnectedMCPServersSignal(connected);
			setMCPToolCountsSignal(counts);
			console.log(
				"[MCPManagement] loadServers DONE, servers:",
				result.data.length,
				"connected:",
				connected.size,
			);
		} else {
			console.error("[MCPManagement] loadServers FAILED:", result.error);
		}
	};

	useEffect(() => {
		loadServers();
	}, [loadServers]);

	// Server list options with status badges
	const serverOptions: SelectionOption[] = [
		{
			label: "Add new server",
			value: "__add__",
			description: "Configure a new MCP server",
		},
		...servers.map((server) => {
			const isConnected = connectedServers.has(server.id);
			const toolCount = toolCounts.get(server.id);

			let description = server.description || `${server.transport.type} transport`;
			if (isConnected && toolCount !== undefined) {
				description += ` • ${toolCount} tool${toolCount === 1 ? "" : "s"}`;
			}

			// Status prefix
			const statusPrefix = isConnected
				? "[Connected] "
				: server.enabled
					? "[Enabled] "
					: "[Disabled] ";

			return {
				label: statusPrefix + server.name,
				value: server.id,
				description,
			};
		}),
	];

	// Handle server selection - go directly to details
	const handleServerSelect = async (value: string) => {
		if (value === "__add__") {
			setMCPManagementStepSignal("add-server");
			return;
		}

		const server = servers.find((s) => s.id === value);
		if (server) {
			setSelectedMCPServerSignal(server);
			setMCPManagementStepSignal("server-details");
		}
	};

	// Step 1: List servers
	if (step === "list-servers") {
		return (
			<InlineSelection
				options={serverOptions}
				subtitle="Select a server to view details or add a new one"
				placeholder="Select a server or add new..."
				onSelect={handleServerSelect}
				onCancel={() => {
					console.log("[MCPManagement] ESC pressed on list-servers");
					if (onComplete) {
						onComplete();
					}
				}}
				showSearch={servers.length > 5}
			/>
		);
	}

	// Step 2: Add server form
	if (step === "add-server") {
		return (
			<MCPAddForm
				onComplete={async () => {
					console.log("[MCPManagement] MCPAddForm onComplete called");
					await loadServers();
					console.log("[MCPManagement] Servers reloaded");
					setMCPManagementStepSignal("list-servers");
					console.log("[MCPManagement] Step set to list-servers");
				}}
				onCancel={() => {
					console.log("[MCPManagement] MCPAddForm onCancel called");
					setMCPManagementStepSignal("list-servers");
				}}
			/>
		);
	}

	// Step 3: Server details view
	if (step === "server-details" && selectedServer) {
		return (
			<MCPServerDetails
				server={selectedServer}
				onBack={() => setMCPManagementStepSignal("list-servers")}
				onConnect={async () => {
					const { getMCPManager, reloadMCPServerTools } = await import("@sylphx/code-core");
					const mcpManager = getMCPManager();
					const connectResult = await mcpManager.connect(selectedServer);
					if (connectResult.success) {
						await reloadMCPServerTools(selectedServer.id);
					}
					await loadServers();
					setStep("list-servers");
				}}
				onDisconnect={async () => {
					const { getMCPManager } = await import("@sylphx/code-core");
					const mcpManager = getMCPManager();
					await mcpManager.disconnect(selectedServer.id);
					await loadServers();
					setStep("list-servers");
				}}
				onEnable={async () => {
					const { enableMCPServer } = await import("@sylphx/code-core");
					await enableMCPServer(selectedServer.id);
					await loadServers();
					setStep("list-servers");
				}}
				onDisable={async () => {
					const { getMCPManager, disableMCPServer } = await import("@sylphx/code-core");
					const mcpManager = getMCPManager();
					if (mcpManager.isConnected(selectedServer.id)) {
						await mcpManager.disconnect(selectedServer.id);
					}
					await disableMCPServer(selectedServer.id);
					await loadServers();
					setStep("list-servers");
				}}
				onRemove={async () => {
					const { getMCPManager, removeMCPServer } = await import("@sylphx/code-core");
					const mcpManager = getMCPManager();
					if (mcpManager.isConnected(selectedServer.id)) {
						await mcpManager.disconnect(selectedServer.id);
					}
					await removeMCPServer(selectedServer.id);
					await loadServers();
					setStep("list-servers");
				}}
			/>
		);
	}

	return null;
}
