/**
 * MCP Management Component
 * Add and manage MCP servers
 */

import { Box, Text, useInput } from "ink";
import { useState, useEffect } from "react";
import { InlineSelection } from "../../../components/selection/index.js";
import type { SelectionOption } from "../../../hooks/useSelection.js";
import TextInputWithHint from "../../../components/TextInputWithHint.js";
import { InputContentLayout } from "./InputContentLayout.js";
import type { MCPServerConfig, MCPTransportType } from "@sylphx/code-core";

interface MCPManagementProps {
	onComplete?: () => void;
}

type Step =
	| "select-action"
	| "select-server"
	| "input-id"
	| "input-name"
	| "input-description"
	| "select-transport"
	| "input-url"
	| "input-command"
	| "input-args"
	| "confirm";

export function MCPManagement({ onComplete }: MCPManagementProps) {
	const [step, setStep] = useState<Step>("select-action");
	const [action, setAction] = useState<"add" | "remove" | "connect" | "disconnect" | null>(null);
	const [servers, setServers] = useState<MCPServerConfig[]>([]);
	const [selectedServer, setSelectedServer] = useState<MCPServerConfig | null>(null);

	// Form state for adding server
	const [serverId, setServerId] = useState("");
	const [serverName, setServerName] = useState("");
	const [serverDescription, setServerDescription] = useState("");
	const [transportType, setTransportType] = useState<MCPTransportType | null>(null);
	const [url, setUrl] = useState("");
	const [command, setCommand] = useState("");
	const [args, setArgs] = useState("");

	// Load servers
	useEffect(() => {
		async function loadServers() {
			const { listMCPServers } = await import("@sylphx/code-core");
			const result = await listMCPServers();
			if (result.ok) {
				setServers(result.data);
			}
		}
		loadServers();
	}, []);

	// Action options
	const actionOptions: SelectionOption[] = [
		{
			label: "Add new server",
			value: "add",
			description: "Configure a new MCP server",
		},
		{
			label: "Remove server",
			value: "remove",
			description: "Remove an existing MCP server",
		},
		{
			label: "Connect to server",
			value: "connect",
			description: "Connect to an MCP server",
		},
		{
			label: "Disconnect from server",
			value: "disconnect",
			description: "Disconnect from an MCP server",
		},
	];

	// Server options
	const serverOptions: SelectionOption[] = servers.map((server) => ({
		label: `${server.name} (${server.id})`,
		value: server.id,
		description: server.description || "No description",
	}));

	// Transport options
	const transportOptions: SelectionOption[] = [
		{
			label: "HTTP",
			value: "http",
			description: "Recommended for production (requires URL)",
		},
		{
			label: "SSE (Server-Sent Events)",
			value: "sse",
			description: "Alternative HTTP-based transport (requires URL)",
		},
		{
			label: "Stdio",
			value: "stdio",
			description: "Local development only (requires command)",
		},
	];

	// Handle action selection
	const handleActionSelect = (value: string) => {
		setAction(value as "add" | "remove" | "connect" | "disconnect");

		if (value === "add") {
			setStep("input-id");
		} else {
			setStep("select-server");
		}
	};

	// Handle server selection
	const handleServerSelect = async (value: string) => {
		const server = servers.find((s) => s.id === value);
		setSelectedServer(server || null);

		if (action === "remove") {
			await handleRemoveServer(value);
		} else if (action === "connect") {
			await handleConnectServer(value);
		} else if (action === "disconnect") {
			await handleDisconnectServer(value);
		}
	};

	// Handle transport selection
	const handleTransportSelect = (value: string) => {
		setTransportType(value as MCPTransportType);

		if (value === "http" || value === "sse") {
			setStep("input-url");
		} else {
			setStep("input-command");
		}
	};

	// Handle remove server
	const handleRemoveServer = async (serverId: string) => {
		const { removeMCPServer, getMCPManager } = await import("@sylphx/code-core");

		// Disconnect if connected
		const mcpManager = getMCPManager();
		if (mcpManager.isConnected(serverId)) {
			await mcpManager.disconnect(serverId);
		}

		const result = await removeMCPServer(serverId);
		if (result.ok) {
			// Reload servers
			const { listMCPServers } = await import("@sylphx/code-core");
			const listResult = await listMCPServers();
			if (listResult.ok) {
				setServers(listResult.data);
			}
		}

		onComplete?.();
	};

	// Handle connect server
	const handleConnectServer = async (serverId: string) => {
		const { getMCPServer, getMCPManager, reloadMCPServerTools } = await import("@sylphx/code-core");

		const serverResult = await getMCPServer(serverId);
		if (!serverResult.ok || !serverResult.data) {
			onComplete?.();
			return;
		}

		const server = serverResult.data;
		const mcpManager = getMCPManager();

		const connectResult = await mcpManager.connect(server);
		if (connectResult.ok) {
			await reloadMCPServerTools(serverId);
		}

		onComplete?.();
	};

	// Handle disconnect server
	const handleDisconnectServer = async (serverId: string) => {
		const { getMCPManager } = await import("@sylphx/code-core");

		const mcpManager = getMCPManager();
		await mcpManager.disconnect(serverId);

		onComplete?.();
	};

	// Handle add server
	const handleAddServer = async () => {
		const { addMCPServer } = await import("@sylphx/code-core");

		let transport: any;
		if (transportType === "http") {
			transport = { type: "http", url };
		} else if (transportType === "sse") {
			transport = { type: "sse", url };
		} else if (transportType === "stdio") {
			const argsArray = args.trim() ? args.split(",").map((s) => s.trim()) : undefined;
			transport = { type: "stdio", command, args: argsArray };
		}

		const serverConfig: MCPServerConfig = {
			id: serverId,
			name: serverName,
			description: serverDescription || undefined,
			transport,
			enabled: true,
		};

		const result = await addMCPServer(serverConfig);
		if (result.ok) {
			// Reload servers
			const { listMCPServers } = await import("@sylphx/code-core");
			const listResult = await listMCPServers();
			if (listResult.ok) {
				setServers(listResult.data);
			}
		}

		onComplete?.();
	};

	// Input handlers
	useInput((input, key) => {
		if (key.escape) {
			onComplete?.();
		}
	});

	return (
		<InputContentLayout title="MCP Server Management">
			<Box flexDirection="column" gap={1}>
				{step === "select-action" && (
					<InlineSelection
						options={actionOptions}
						onSelect={handleActionSelect}
						placeholder="Select an action..."
						showSearch={false}
					/>
				)}

				{step === "select-server" && (
					<InlineSelection
						options={serverOptions}
						onSelect={handleServerSelect}
						placeholder="Select a server..."
						showSearch={serverOptions.length > 5}
					/>
				)}

				{step === "input-id" && (
					<Box flexDirection="column">
						<Text color="cyan">Server ID (alphanumeric, hyphens, underscores only):</Text>
						<TextInputWithHint
							value={serverId}
							onChange={setServerId}
							onSubmit={() => {
								if (serverId.trim() && /^[a-zA-Z0-9_-]+$/.test(serverId.trim())) {
									setStep("input-name");
								}
							}}
							placeholder="e.g., github, slack, custom-tools"
						/>
					</Box>
				)}

				{step === "input-name" && (
					<Box flexDirection="column">
						<Text color="cyan">Display Name:</Text>
						<TextInputWithHint
							value={serverName}
							onChange={setServerName}
							onSubmit={() => {
								if (serverName.trim()) {
									setStep("input-description");
								}
							}}
							placeholder="e.g., GitHub Tools, Slack Integration"
						/>
					</Box>
				)}

				{step === "input-description" && (
					<Box flexDirection="column">
						<Text color="cyan">Description (optional, press Enter to skip):</Text>
						<TextInputWithHint
							value={serverDescription}
							onChange={setServerDescription}
							onSubmit={() => {
								setStep("select-transport");
							}}
							placeholder="Brief description of this server"
						/>
					</Box>
				)}

				{step === "select-transport" && (
					<InlineSelection
						options={transportOptions}
						onSelect={handleTransportSelect}
						placeholder="Select transport type..."
						showSearch={false}
					/>
				)}

				{step === "input-url" && (
					<Box flexDirection="column">
						<Text color="cyan">Server URL:</Text>
						<TextInputWithHint
							value={url}
							onChange={setUrl}
							onSubmit={() => {
								if (url.trim()) {
									handleAddServer();
								}
							}}
							placeholder="e.g., https://api.example.com/mcp"
						/>
					</Box>
				)}

				{step === "input-command" && (
					<Box flexDirection="column">
						<Text color="cyan">Command to run:</Text>
						<TextInputWithHint
							value={command}
							onChange={setCommand}
							onSubmit={() => {
								if (command.trim()) {
									setStep("input-args");
								}
							}}
							placeholder="e.g., npx, node, python"
						/>
					</Box>
				)}

				{step === "input-args" && (
					<Box flexDirection="column">
						<Text color="cyan">Arguments (comma-separated, optional, press Enter to skip):</Text>
						<TextInputWithHint
							value={args}
							onChange={setArgs}
							onSubmit={() => {
								handleAddServer();
							}}
							placeholder="e.g., -y, @modelcontextprotocol/server-everything"
						/>
					</Box>
				)}

				<Box marginTop={1}>
					<Text dimColor>Press ESC to cancel</Text>
				</Box>
			</Box>
		</InputContentLayout>
	);
}
