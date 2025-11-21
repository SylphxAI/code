/**
 * MCP Add Wizard
 * Step-by-step wizard for adding new MCP servers
 */

import type { MCPServerConfig, MCPTransportType } from "@sylphx/code-core";
import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { InlineSelection } from "../../../components/selection/index.js";
import TextInputWithHint from "../../../components/TextInputWithHint.js";
import type { SelectionOption } from "../../../hooks/useSelection.js";
import { InputContentLayout } from "./InputContentLayout.js";
import { useThemeColors, getColors } from "@sylphx/code-client";

interface MCPAddWizardProps {
	onComplete: () => void;
	onCancel: () => void;
}

type Step =
	| "input-id"
	| "input-name"
	| "input-description"
	| "select-transport"
	| "input-url"
	| "input-command"
	| "input-args";

export function MCPAddWizard({ onComplete, onCancel }: MCPAddWizardProps) {
	const [step, setStep] = useState<Step>("input-id");
	const colors = useThemeColors();

	// Form state
	const [serverId, setServerId] = useState("");
	const [serverName, setServerName] = useState("");
	const [serverDescription, setServerDescription] = useState("");
	const [transportType, setTransportType] = useState<MCPTransportType | null>(null);
	const [url, setUrl] = useState("");
	const [command, setCommand] = useState("");
	const [args, setArgs] = useState("");

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

	// Handle transport selection
	const handleTransportSelect = (value: string) => {
		setTransportType(value as MCPTransportType);

		if (value === "http" || value === "sse") {
			setStep("input-url");
		} else {
			setStep("input-command");
		}
	};

	// Handle add server
	const handleAddServer = async () => {
		console.log("[MCPAddWizard] handleAddServer START");
		console.log("[MCPAddWizard] serverId:", serverId);
		console.log("[MCPAddWizard] serverName:", serverName);
		console.log("[MCPAddWizard] transportType:", transportType);

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
			name: serverName || serverId,
			description: serverDescription || undefined,
			transport,
		};

		console.log("[MCPAddWizard] serverId:", serverId);
		console.log("[MCPAddWizard] serverConfig:", JSON.stringify(serverConfig, null, 2));

		const result = await addMCPServer(serverId, serverConfig);
		console.log("[MCPAddWizard] addMCPServer result:", result);

		if (!result.success) {
			console.error("[MCPAddWizard] ERROR:", result.error);
		} else {
			console.log("[MCPAddWizard] SUCCESS");
		}

		console.log("[MCPAddWizard] Calling onComplete");
		onComplete();
		console.log("[MCPAddWizard] onComplete called");
	};

	// ESC key handling
	useInput((_input, key) => {
		if (key.escape) {
			onCancel();
		}
	});

	return (
		<InputContentLayout title="Add MCP Server">
			<Box flexDirection="column" gap={1}>
				{step === "input-id" && (
					<Box flexDirection="column">
						<Text color={colors.primary}>Server ID (alphanumeric, hyphens, underscores only):</Text>
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
						<Text color={colors.primary}>Display Name:</Text>
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
						<Text color={colors.primary}>Description (optional, press Enter to skip):</Text>
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
						subtitle="Choose transport type"
						placeholder="Select transport..."
						onSelect={handleTransportSelect}
						onCancel={onCancel}
						showSearch={false}
					/>
				)}

				{step === "input-url" && (
					<Box flexDirection="column">
						<Text color={colors.primary}>Server URL:</Text>
						<TextInputWithHint
							value={url}
							onChange={setUrl}
							onSubmit={async () => {
								if (url.trim()) {
									await handleAddServer();
								}
							}}
							placeholder="e.g., https://api.example.com/mcp"
						/>
					</Box>
				)}

				{step === "input-command" && (
					<Box flexDirection="column">
						<Text color={colors.primary}>Command to run:</Text>
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
						<Text color={colors.primary}>Arguments (comma-separated, optional, press Enter to skip):</Text>
						<TextInputWithHint
							value={args}
							onChange={setArgs}
							onSubmit={async () => {
								await handleAddServer();
							}}
							placeholder="e.g., -y, @modelcontextprotocol/server-everything"
						/>
					</Box>
				)}

				<Box marginTop={1}>
					<Text color={colors.textDim}>Press ESC to cancel</Text>
				</Box>
			</Box>
		</InputContentLayout>
	);
}
