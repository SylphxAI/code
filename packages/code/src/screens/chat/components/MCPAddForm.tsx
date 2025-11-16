/**
 * MCP Add Form
 * Single-page form for adding new MCP servers
 */

import type { MCPServerConfig, MCPTransportType } from "@sylphx/code-core";
import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { InlineSelection } from "../../../components/selection/index.js";
import TextInputWithHint from "../../../components/TextInputWithHint.js";
import type { SelectionOption } from "../../../hooks/useSelection.js";
import { InputContentLayout } from "./InputContentLayout.js";

interface MCPAddFormProps {
	onComplete: () => void;
	onCancel: () => void;
}

type Field = "id" | "transport" | "url" | "command" | "args" | "name" | "description";

export function MCPAddForm({ onComplete, onCancel }: MCPAddFormProps) {
	const [currentField, setCurrentField] = useState<Field>("id");

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

		// Move to next field based on transport type
		if (value === "http" || value === "sse") {
			setCurrentField("url");
		} else {
			setCurrentField("command");
		}
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
			name: serverName || undefined,
			description: serverDescription || undefined,
			transport,
		};

		const result = await addMCPServer(serverId, serverConfig);

		if (!result.success) {
			console.error("[MCPAddForm] ERROR:", result.error);
		}

		onComplete();
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
				{/* Server ID (Required) */}
				<Box flexDirection="column">
					<Text bold>Server ID: {serverId ? `✓ ${serverId}` : "(required)"}</Text>
					{currentField === "id" && (
						<Box paddingLeft={2}>
							<TextInputWithHint
								value={serverId}
								onChange={setServerId}
								onSubmit={() => {
									if (serverId.trim() && /^[a-zA-Z0-9_-]+$/.test(serverId.trim())) {
										setCurrentField("transport");
									}
								}}
								placeholder="e.g., context7, github, slack"
							/>
						</Box>
					)}
				</Box>

				{/* Transport Type (Required) */}
				{serverId && (
					<Box flexDirection="column">
						<Text bold>
							Transport: {transportType ? `✓ ${transportType.toUpperCase()}` : "(required)"}
						</Text>
						{currentField === "transport" && (
							<Box paddingLeft={2}>
								<InlineSelection
									options={transportOptions}
									subtitle="Choose transport type • ESC: Cancel"
									placeholder="Select transport..."
									onSelect={handleTransportSelect}
									onCancel={onCancel}
									showSearch={false}
								/>
							</Box>
						)}
					</Box>
				)}

				{/* URL (for HTTP/SSE) */}
				{transportType && (transportType === "http" || transportType === "sse") && (
					<Box flexDirection="column">
						<Text bold>URL: {url ? `✓ ${url}` : "(required)"}</Text>
						{currentField === "url" && (
							<Box paddingLeft={2}>
								<TextInputWithHint
									value={url}
									onChange={setUrl}
									onSubmit={() => {
										if (url.trim()) {
											setCurrentField("name");
										}
									}}
									placeholder="e.g., https://mcp.example.com/mcp"
								/>
							</Box>
						)}
					</Box>
				)}

				{/* Command (for Stdio) */}
				{transportType === "stdio" && (
					<>
						<Box flexDirection="column">
							<Text bold>Command: {command ? `✓ ${command}` : "(required)"}</Text>
							{currentField === "command" && (
								<Box paddingLeft={2}>
									<TextInputWithHint
										value={command}
										onChange={setCommand}
										onSubmit={() => {
											if (command.trim()) {
												setCurrentField("args");
											}
										}}
										placeholder="e.g., npx, node, python"
									/>
								</Box>
							)}
						</Box>

						<Box flexDirection="column">
							<Text bold>Arguments: {args ? `✓ ${args}` : "(optional)"}</Text>
							{currentField === "args" && (
								<Box paddingLeft={2}>
									<TextInputWithHint
										value={args}
										onChange={setArgs}
										onSubmit={() => {
											setCurrentField("name");
										}}
										placeholder="e.g., -y, @modelcontextprotocol/server-everything"
									/>
								</Box>
							)}
						</Box>
					</>
				)}

				{/* Name (Optional) */}
				{currentField !== "id" && currentField !== "transport" && (
					<Box flexDirection="column">
						<Text bold>
							Display Name: {serverName ? `✓ ${serverName}` : "(optional, defaults to ID)"}
						</Text>
						{currentField === "name" && (
							<Box paddingLeft={2}>
								<TextInputWithHint
									value={serverName}
									onChange={setServerName}
									onSubmit={() => {
										setCurrentField("description");
									}}
									placeholder={`Press Enter to use ID: ${serverId}`}
								/>
							</Box>
						)}
					</Box>
				)}

				{/* Description (Optional) */}
				{currentField === "description" && (
					<Box flexDirection="column">
						<Text bold>
							Description: {serverDescription ? `✓ ${serverDescription}` : "(optional)"}
						</Text>
						<Box paddingLeft={2}>
							<TextInputWithHint
								value={serverDescription}
								onChange={setServerDescription}
								onSubmit={async () => {
									await handleAddServer();
								}}
								placeholder="Press Enter to finish and save"
							/>
						</Box>
					</Box>
				)}

				<Box marginTop={1}>
					<Text dimColor>Press ESC to cancel</Text>
				</Box>
			</Box>
		</InputContentLayout>
	);
}
