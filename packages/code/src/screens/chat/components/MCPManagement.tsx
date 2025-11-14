/**
 * MCP Management Component (V2 - Redesigned)
 * Shows list of MCP servers with actions
 *
 * ARCHITECTURE: Two-step flow
 * 1. List all servers with status badges (connected/enabled/disabled)
 * 2. Select action for chosen server (connect/disconnect/configure/remove)
 */

import { Box, Text } from "ink";
import { useState, useEffect } from "react";
import { InlineSelection } from "../../../components/selection/index.js";
import type { SelectionOption } from "../../../hooks/useSelection.js";
import type { MCPServerConfig } from "@sylphx/code-core";
import { MCPAddWizard } from "./MCPAddWizard.js";

interface MCPManagementProps {
	onComplete?: () => void;
}

type Step = "list-servers" | "server-actions" | "add-server";

export function MCPManagement({ onComplete }: MCPManagementProps) {
	const [step, setStep] = useState<Step>("list-servers");
	const [servers, setServers] = useState<MCPServerConfig[]>([]);
	const [selectedServer, setSelectedServer] = useState<MCPServerConfig | null>(null);
	const [connectedServers, setConnectedServers] = useState<Set<string>>(new Set());

	// Load servers and connection states
	const loadServers = async () => {
		const { listMCPServers, getMCPManager } = await import("@sylphx/code-core");
		const result = await listMCPServers();
		if (result.ok) {
			setServers(result.data);

			// Get connection states
			const mcpManager = getMCPManager();
			const connected = new Set<string>();
			for (const server of result.data) {
				if (mcpManager.isConnected(server.id)) {
					connected.add(server.id);
				}
			}
			setConnectedServers(connected);
		}
	};

	useEffect(() => {
		loadServers();
	}, []);

	// Server list options with status badges
	const serverOptions: SelectionOption[] = [
		{
			label: "➕ Add new server",
			value: "__add__",
			description: "Configure a new MCP server",
		},
		...servers.map((server) => {
			const isConnected = connectedServers.has(server.id);
			const status = server.enabled ? (isConnected ? "🟢" : "⚪") : "⚫";

			return {
				label: `${status} ${server.name}`,
				value: server.id,
				description: server.description || `${server.transport.type} transport`,
				badge: isConnected
					? { text: "Connected", color: "green" as const }
					: server.enabled
						? { text: "Enabled", color: "white" as const }
						: { text: "Disabled", color: "gray" as const },
			};
		}),
	];

	// Action options for selected server
	const getServerActionOptions = (server: MCPServerConfig): SelectionOption[] => {
		const isConnected = connectedServers.has(server.id);

		const actions: SelectionOption[] = [];

		if (isConnected) {
			actions.push({
				label: "Disconnect",
				value: "disconnect",
				description: "Disconnect from this server",
			});
		} else if (server.enabled) {
			actions.push({
				label: "Connect",
				value: "connect",
				description: "Connect to this server",
			});
		}

		if (server.enabled) {
			actions.push({
				label: "Disable",
				value: "disable",
				description: "Disable this server",
			});
		} else {
			actions.push({
				label: "Enable",
				value: "enable",
				description: "Enable this server",
			});
		}

		actions.push({
			label: "View details",
			value: "details",
			description: "Show server configuration",
		});

		actions.push({
			label: "Remove",
			value: "remove",
			description: "Delete this server",
		});

		return actions;
	};

	// Handle server selection
	const handleServerSelect = async (value: string) => {
		if (value === "__add__") {
			setStep("add-server");
			return;
		}

		const server = servers.find((s) => s.id === value);
		if (server) {
			setSelectedServer(server);
			setStep("server-actions");
		}
	};

	// Handle action selection
	const handleActionSelect = async (action: string) => {
		if (!selectedServer) return;

		const { getMCPManager, removeMCPServer, enableMCPServer, disableMCPServer, reloadMCPServerTools } =
			await import("@sylphx/code-core");
		const mcpManager = getMCPManager();

		switch (action) {
			case "connect": {
				const connectResult = await mcpManager.connect(selectedServer);
				if (connectResult.ok) {
					await reloadMCPServerTools(selectedServer.id);
				}
				await loadServers();
				setStep("list-servers");
				break;
			}

			case "disconnect": {
				await mcpManager.disconnect(selectedServer.id);
				await loadServers();
				setStep("list-servers");
				break;
			}

			case "enable": {
				await enableMCPServer(selectedServer.id);
				await loadServers();
				setStep("list-servers");
				break;
			}

			case "disable": {
				if (mcpManager.isConnected(selectedServer.id)) {
					await mcpManager.disconnect(selectedServer.id);
				}
				await disableMCPServer(selectedServer.id);
				await loadServers();
				setStep("list-servers");
				break;
			}

			case "details": {
				// Show details (could be a separate component later)
				setStep("list-servers");
				break;
			}

			case "remove": {
				if (mcpManager.isConnected(selectedServer.id)) {
					await mcpManager.disconnect(selectedServer.id);
				}
				await removeMCPServer(selectedServer.id);
				await loadServers();
				setStep("list-servers");
				break;
			}
		}
	};

	// Step 1: List servers
	if (step === "list-servers") {
		return (
			<InlineSelection
				options={serverOptions}
				subtitle="Manage MCP servers and their connections"
				placeholder="Select a server or add new..."
				onSelect={handleServerSelect}
				onCancel={onComplete}
				showSearch={servers.length > 5}
			/>
		);
	}

	// Step 2: Server actions
	if (step === "server-actions" && selectedServer) {
		const actionOptions = getServerActionOptions(selectedServer);

		return (
			<InlineSelection
				options={actionOptions}
				subtitle={`Actions for ${selectedServer.name}`}
				placeholder="Select an action..."
				onSelect={handleActionSelect}
				onCancel={() => setStep("list-servers")}
				showSearch={false}
			/>
		);
	}

	// Step 3: Add server wizard
	if (step === "add-server") {
		return (
			<MCPAddWizard
				onComplete={async () => {
					await loadServers();
					setStep("list-servers");
				}}
				onCancel={() => setStep("list-servers")}
			/>
		);
	}

	return null;
}
