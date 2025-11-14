/**
 * MCP Server Details Component
 * Shows detailed information about an MCP server including tools list
 */

import { Box, Text } from "ink";
import { useState, useEffect } from "react";
import type { MCPServerWithId, MCPToolInfo } from "@sylphx/code-core";
import { InlineSelection } from "../../../components/selection/index.js";
import type { SelectionOption } from "../../../hooks/useSelection.js";

interface MCPServerDetailsProps {
	server: MCPServerWithId;
	onBack: () => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onEnable?: () => void;
	onDisable?: () => void;
	onRemove?: () => void;
}

export function MCPServerDetails({
	server,
	onBack,
	onConnect,
	onDisconnect,
	onEnable,
	onDisable,
	onRemove,
}: MCPServerDetailsProps) {
	const [tools, setTools] = useState<MCPToolInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [isConnected, setIsConnected] = useState(false);
	const [connectionInfo, setConnectionInfo] = useState<{
		connectedAt?: number;
		lastActivity?: number;
		toolCount: number;
	} | null>(null);

	// Load tools and connection info
	useEffect(() => {
		const loadDetails = async () => {
			const { getMCPManager } = await import("@sylphx/code-core");
			const mcpManager = getMCPManager();

			// Check connection status
			const connected = mcpManager.isConnected(server.id);
			setIsConnected(connected);

			// Get connection state
			const state = await mcpManager.getServerState(server.id);
			if (state) {
				setConnectionInfo({
					connectedAt: state.connectedAt,
					lastActivity: state.lastActivity,
					toolCount: state.toolCount,
				});
			}

			// Get tools
			if (connected) {
				const toolsResult = await mcpManager.getTools(server.id);
				if (toolsResult.success) {
					setTools(toolsResult.data);
				}
			}

			setLoading(false);
		};

		loadDetails();
	}, [server.id]);

	// Format timestamp
	const formatTime = (timestamp?: number) => {
		if (!timestamp) return "Unknown";
		const date = new Date(timestamp);
		const now = Date.now();
		const diff = now - timestamp;

		if (diff < 60000) return "Just now";
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

		return date.toLocaleString();
	};

	// Action options - dynamically build based on server state
	const actionOptions: SelectionOption[] = [];

	// Connection actions
	if (isConnected && onDisconnect) {
		actionOptions.push({
			label: "Disconnect",
			value: "disconnect",
			description: "Disconnect from this server",
		});
	} else if (!isConnected && server.enabled && onConnect) {
		actionOptions.push({
			label: "Connect",
			value: "connect",
			description: "Connect to this server",
		});
	}

	// Enable/Disable actions
	if (server.enabled && onDisable) {
		actionOptions.push({
			label: "Disable",
			value: "disable",
			description: "Disable this server (will disconnect if connected)",
		});
	} else if (!server.enabled && onEnable) {
		actionOptions.push({
			label: "Enable",
			value: "enable",
			description: "Enable this server",
		});
	}

	// Refresh
	actionOptions.push({
		label: "Refresh",
		value: "refresh",
		description: "Reload server information",
	});

	// Remove
	if (onRemove) {
		actionOptions.push({
			label: "Remove",
			value: "remove",
			description: "Remove this server configuration",
		});
	}

	// Back
	actionOptions.push({
		label: "Back",
		value: "back",
		description: "Return to server list",
	});

	const handleAction = async (action: string) => {
		if (action === "back") {
			onBack();
		} else if (action === "connect" && onConnect) {
			await onConnect();
		} else if (action === "disconnect" && onDisconnect) {
			await onDisconnect();
		} else if (action === "enable" && onEnable) {
			await onEnable();
		} else if (action === "disable" && onDisable) {
			await onDisable();
		} else if (action === "remove" && onRemove) {
			await onRemove();
		} else if (action === "refresh") {
			setLoading(true);
			// Reload details
			const { getMCPManager } = await import("@sylphx/code-core");
			const mcpManager = getMCPManager();

			// Refresh connection status
			const connected = mcpManager.isConnected(server.id);
			setIsConnected(connected);

			const state = await mcpManager.getServerState(server.id);
			if (state) {
				setConnectionInfo({
					connectedAt: state.connectedAt,
					lastActivity: state.lastActivity,
					toolCount: state.toolCount,
				});
			}

			if (connected) {
				const toolsResult = await mcpManager.getTools(server.id);
				if (toolsResult.success) {
					setTools(toolsResult.data);
				}
			} else {
				setTools([]);
			}

			setLoading(false);
		}
	};

	return (
		<Box flexDirection="column" paddingX={2}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					▌ {server.name || server.id} - Details
				</Text>
			</Box>

			{loading ? (
				<Box>
					<Text dimColor>Loading server details...</Text>
				</Box>
			) : (
				<Box flexDirection="column" gap={1}>
					{/* Status Section */}
					<Box flexDirection="column">
						<Text bold>Status:</Text>
						<Box paddingLeft={2}>
							<Text>
								{isConnected ? "Connected" : server.enabled ? "Enabled" : "Disabled"} •{" "}
								{server.transport.type.toUpperCase()}
								{server.transport.type === "http" && ` • ${(server.transport as any).url}`}
								{server.transport.type === "stdio" &&
									` • ${(server.transport as any).command} ${((server.transport as any).args || []).join(" ")}`}
							</Text>
						</Box>
					</Box>

					{/* Tools Section */}
					<Box flexDirection="column" marginTop={1}>
						<Text bold>Tools ({tools.length}):</Text>
						{!isConnected ? (
							<Box paddingLeft={2}>
								<Text dimColor>Server not connected. Connect to view available tools.</Text>
							</Box>
						) : tools.length === 0 ? (
							<Box paddingLeft={2}>
								<Text dimColor>No tools available</Text>
							</Box>
						) : (
							<Box flexDirection="column" paddingLeft={2}>
								{tools.map((tool) => (
									<Box key={tool.name} marginTop={1}>
										<Text bold>{tool.name}</Text>
									</Box>
								))}
							</Box>
						)}
					</Box>

					{/* Connection Info */}
					{connectionInfo && isConnected && (
						<Box flexDirection="column" marginTop={1}>
							<Text bold>Connection:</Text>
							<Box flexDirection="column" paddingLeft={2}>
								<Text>Connected: {formatTime(connectionInfo.connectedAt)}</Text>
								<Text>Last active: {formatTime(connectionInfo.lastActivity)}</Text>
							</Box>
						</Box>
					)}

					{/* Actions */}
					<Box marginTop={2}>
						<InlineSelection
							options={actionOptions}
							subtitle="Choose an action"
							placeholder="Select action..."
							onSelect={handleAction}
							onCancel={onBack}
							showSearch={false}
						/>
					</Box>
				</Box>
			)}
		</Box>
	);
}
