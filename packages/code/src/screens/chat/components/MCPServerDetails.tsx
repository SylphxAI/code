/**
 * MCP Server Details Component
 * Shows detailed information about an MCP server with layered navigation
 */

import type { MCPServerWithId, MCPToolInfo } from "@sylphx/code-core";
import {
	useMCPServerDetailsView,
	useMCPServerTools,
	useMCPSelectedTools,
	useMCPServerDetailsLoading,
	useMCPServerConnected,
	useMCPServerConnectionInfo,
	setMCPServerDetailsView as setMCPServerDetailsViewSignal,
	setMCPServerTools as setMCPServerToolsSignal,
	setMCPSelectedTool as setMCPSelectedToolSignal,
	setMCPServerDetailsLoading as setMCPServerDetailsLoadingSignal,
	setMCPServerConnected as setMCPServerConnectedSignal,
	setMCPServerConnectionInfo as setMCPServerConnectionInfoSignal,
} from "@sylphx/code-client";
import { Box, Text, useInput } from "ink";
import { useEffect } from "react";
import { InlineSelection } from "../../../components/selection/index.js";
import type { SelectionOption } from "../../../hooks/useSelection.js";
import { useThemeColors, getColors } from "../../../theme.js";

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
	const viewMap = useMCPServerDetailsView();
	const toolsMap = useMCPServerTools();
	const selectedToolsMap = useMCPSelectedTools();
	const loadingMap = useMCPServerDetailsLoading();
	const connectedMap = useMCPServerConnected();
	const connectionInfoMap = useMCPServerConnectionInfo();
	const colors = useThemeColors();

	const view = viewMap[server.id] || "overview";
	const tools = toolsMap[server.id] || [];
	const selectedTool = selectedToolsMap[server.id] || null;
	const loading = loadingMap[server.id] || false;
	const isConnected = connectedMap[server.id] || false;
	const connectionInfo = connectionInfoMap[server.id] || null;

	// Load tools and connection info
	useEffect(() => {
		const loadDetails = async () => {
			const { getMCPManager } = await import("@sylphx/code-core");
			const mcpManager = getMCPManager();

			// Check connection status
			const connected = mcpManager.isConnected(server.id);
			setMCPServerConnectedSignal(server.id, connected);

			// Get connection state
			const state = await mcpManager.getServerState(server.id);
			if (state) {
				setMCPServerConnectionInfoSignal(server.id, {
					connectedAt: state.connectedAt,
					lastActivity: state.lastActivity,
					toolCount: state.toolCount,
				});
			}

			// Get tools
			if (connected) {
				const toolsResult = await mcpManager.getTools(server.id);
				if (toolsResult.success) {
					setMCPServerToolsSignal(server.id, toolsResult.data);
				}
			}

			setMCPServerDetailsLoadingSignal(server.id, false);
		};

		setMCPServerDetailsLoadingSignal(server.id, true);
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

	// Overview action options
	const overviewActionOptions: SelectionOption[] = [];

	// View tools action
	if (isConnected && tools.length > 0) {
		overviewActionOptions.push({
			label: `View tools (${tools.length})`,
			value: "view-tools",
			description: "Browse available tools",
		});
	}

	// Connection actions
	if (isConnected && onDisconnect) {
		overviewActionOptions.push({
			label: "Disconnect",
			value: "disconnect",
			description: "Disconnect from this server",
		});
	} else if (!isConnected && server.enabled && onConnect) {
		overviewActionOptions.push({
			label: "Connect",
			value: "connect",
			description: "Connect to this server",
		});
	}

	// Enable/Disable actions
	if (server.enabled && onDisable) {
		overviewActionOptions.push({
			label: "Disable",
			value: "disable",
			description: "Disable this server (will disconnect if connected)",
		});
	} else if (!server.enabled && onEnable) {
		overviewActionOptions.push({
			label: "Enable",
			value: "enable",
			description: "Enable this server",
		});
	}

	// Refresh
	overviewActionOptions.push({
		label: "Refresh",
		value: "refresh",
		description: "Reload server information",
	});

	// Remove
	if (onRemove) {
		overviewActionOptions.push({
			label: "Remove",
			value: "remove",
			description: "Remove this server configuration",
		});
	}

	const handleOverviewAction = async (action: string) => {
		if (action === "view-tools") {
			setMCPServerDetailsViewSignal(server.id, "tools-list");
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
			setMCPServerDetailsLoadingSignal(server.id, true);
			// Reload details
			const { getMCPManager } = await import("@sylphx/code-core");
			const mcpManager = getMCPManager();

			// Refresh connection status
			const connected = mcpManager.isConnected(server.id);
			setMCPServerConnectedSignal(server.id, connected);

			const state = await mcpManager.getServerState(server.id);
			if (state) {
				setMCPServerConnectionInfoSignal(server.id, {
					connectedAt: state.connectedAt,
					lastActivity: state.lastActivity,
					toolCount: state.toolCount,
				});
			}

			if (connected) {
				const toolsResult = await mcpManager.getTools(server.id);
				if (toolsResult.success) {
					setMCPServerToolsSignal(server.id, toolsResult.data);
				}
			} else {
				setMCPServerToolsSignal(server.id, []);
			}

			setMCPServerDetailsLoadingSignal(server.id, false);
		}
	};

	// Tools list view
	const toolListOptions: SelectionOption[] = tools.map((tool) => ({
		label: tool.name,
		value: tool.name,
		description: tool.description ? `${tool.description.split("\n")[0].substring(0, 100)}...` : "",
	}));

	const handleToolSelect = (toolName: string) => {
		const tool = tools.find((t) => t.name === toolName);
		if (tool) {
			setMCPSelectedToolSignal(server.id, tool);
			setMCPServerDetailsViewSignal(server.id, "tool-detail");
		}
	};

	// View: Tools List
	if (view === "tools-list") {
		return (
			<Box flexDirection="column" paddingX={2}>
				<Box marginBottom={1}>
					<Text bold color={colors.primary}>
						▌ {server.name || server.id} - Tools ({tools.length})
					</Text>
				</Box>

				<InlineSelection
					options={toolListOptions}
					subtitle="Select a tool to view details • ESC: Back to overview"
					placeholder="Select tool..."
					onSelect={handleToolSelect}
					onCancel={() => setMCPServerDetailsViewSignal(server.id, "overview")}
					showSearch={tools.length > 10}
				/>
			</Box>
		);
	}

	// View: Tool Detail
	if (view === "tool-detail" && selectedTool) {
		// Handle ESC key to go back
		useInput((_input, key) => {
			if (key.escape) {
				setMCPServerDetailsViewSignal(server.id, "tools-list");
			}
		});

		return (
			<Box flexDirection="column" paddingX={2}>
				<Box marginBottom={1}>
					<Text bold color={colors.primary}>
						▌ {selectedTool.name}
					</Text>
				</Box>

				<Box flexDirection="column" gap={1}>
					{selectedTool.description && (
						<Box flexDirection="column">
							<Text bold>Description:</Text>
							<Box paddingLeft={2}>
								<Text>{selectedTool.description}</Text>
							</Box>
						</Box>
					)}

					{selectedTool.inputSchema && (
						<Box flexDirection="column" marginTop={1}>
							<Text bold>Input Schema:</Text>
							<Box paddingLeft={2}>
								<Text color={colors.textDim}>{JSON.stringify(selectedTool.inputSchema, null, 2)}</Text>
							</Box>
						</Box>
					)}

					<Box marginTop={2}>
						<Text color={colors.textDim}>Press ESC to go back to tools list</Text>
					</Box>
				</Box>
			</Box>
		);
	}

	// View: Overview (default)
	return (
		<Box flexDirection="column" paddingX={2}>
			<Box marginBottom={1}>
				<Text bold color={colors.primary}>
					▌ {server.name || server.id} - Details
				</Text>
			</Box>

			{loading ? (
				<Box>
					<Text color={colors.textDim}>Loading server details...</Text>
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

					{/* Tools Count */}
					<Box flexDirection="column" marginTop={1}>
						<Text bold>Tools: {tools.length}</Text>
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
							options={overviewActionOptions}
							subtitle="Choose an action • ESC: Back to server list"
							placeholder="Select action..."
							onSelect={handleOverviewAction}
							onCancel={onBack}
							showSearch={false}
						/>
					</Box>
				</Box>
			)}
		</Box>
	);
}
