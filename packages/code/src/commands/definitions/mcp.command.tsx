/**
 * MCP Command
 * Manage MCP (Model Context Protocol) servers
 */

import type { Command } from "../types.js";

export const mcpCommand: Command = {
	id: "mcp",
	label: "/mcp",
	description: "Manage MCP servers",
	args: [
		{
			name: "action",
			description: "Action to perform (add/remove/list/connect/disconnect/enable/disable)",
			required: false,
			loadOptions: async () => {
				return [
					{ label: "add", value: "add" },
					{ label: "remove", value: "remove" },
					{ label: "list", value: "list" },
					{ label: "connect", value: "connect" },
					{ label: "disconnect", value: "disconnect" },
					{ label: "enable", value: "enable" },
					{ label: "disable", value: "disable" },
				];
			},
		},
		{
			name: "server-id",
			description: "Server ID",
			required: false,
			loadOptions: async (previousArgs) => {
				const action = previousArgs[0];
				// Only show server list for actions that need server ID
				if (!action || action === "add" || action === "list") {
					return [];
				}

				const { listMCPServers } = await import("@sylphx/code-core");
				const result = await listMCPServers();
				if (!result.success) {
					return [];
				}

				return result.data.map((server) => ({
					label: `${server.name} (${server.id})`,
					value: server.id,
				}));
			},
		},
	],

	execute: async (context): Promise<string | undefined> => {
		const action = context.args[0];
		const serverId = context.args[1];

		// If no action, show interactive UI
		if (!action) {
			const { MCPManagement } = await import("../../screens/chat/components/MCPManagement.js");
			context.setInputComponent(
				<MCPManagement onComplete={() => context.setInputComponent(null)} />,
				"MCP Server Management",
			);
			return;
		}

		// Import MCP functions
		const {
			listMCPServers,
			getMCPServer,
			removeMCPServer,
			enableMCPServer,
			disableMCPServer,
			getMCPManager,
		} = await import("@sylphx/code-core");

		// Handle actions
		if (action === "list") {
			const result = await listMCPServers();
			if (!result.success) {
				await context.sendMessage(`❌ Failed to list MCP servers: ${result.error.message}`);
				return;
			}

			if (result.data.length === 0) {
				await context.sendMessage("No MCP servers configured.\n\nUse `/mcp add` to add a server.");
				return;
			}

			const mcpManager = getMCPManager();
			const serverListItems = await Promise.all(
				result.data.map(async (server) => {
					const connected = mcpManager.isConnected(server.id);
					const status = server.enabled
						? connected
							? "🟢 Connected"
							: "⚪ Enabled"
						: "⚫ Disabled";

					let toolInfo = "";
					if (connected) {
						const state = await mcpManager.getServerState(server.id);
						if (state) {
							toolInfo = `\n  Tools: ${state.toolCount}`;
						}
					}

					return `${status} **${server.name}** (${server.id})\n  ${server.description || "No description"}\n  Transport: ${server.transport.type}${toolInfo}`;
				}),
			);

			await context.sendMessage(`**MCP Servers:**\n\n${serverListItems.join("\n\n")}`);
			return;
		}

		if (action === "add") {
			const { MCPManagement } = await import("../../screens/chat/components/MCPManagement.js");
			context.setInputComponent(
				<MCPManagement onComplete={() => context.setInputComponent(null)} />,
				"Add MCP Server",
			);
			return;
		}

		// Actions that require server ID
		if (!serverId) {
			await context.sendMessage(
				`❌ Server ID required for action: ${action}\n\nUsage: /mcp ${action} <server-id>`,
			);
			return;
		}

		// Verify server exists
		const serverResult = await getMCPServer(serverId);
		if (!serverResult.success) {
			await context.sendMessage(`❌ Failed to get server: ${serverResult.error.message}`);
			return;
		}

		if (!serverResult.data) {
			await context.sendMessage(`❌ Server not found: ${serverId}`);
			return;
		}

		const server = serverResult.data;

		if (action === "remove") {
			const mcpManager = getMCPManager();
			// Disconnect if connected
			if (mcpManager.isConnected(serverId)) {
				await mcpManager.disconnect(serverId);
			}

			const result = await removeMCPServer(serverId);
			if (!result.success) {
				await context.sendMessage(`❌ Failed to remove server: ${result.error.message}`);
				return;
			}

			await context.sendMessage(`✅ Removed MCP server: **${server.name}** (${serverId})`);
			return;
		}

		if (action === "enable") {
			const result = await enableMCPServer(serverId);
			if (!result.success) {
				await context.sendMessage(`❌ Failed to enable server: ${result.error.message}`);
				return;
			}

			await context.sendMessage(`✅ Enabled MCP server: **${server.name}** (${serverId})`);
			return;
		}

		if (action === "disable") {
			const mcpManager = getMCPManager();
			// Disconnect if connected
			if (mcpManager.isConnected(serverId)) {
				await mcpManager.disconnect(serverId);
			}

			const result = await disableMCPServer(serverId);
			if (!result.success) {
				await context.sendMessage(`❌ Failed to disable server: ${result.error.message}`);
				return;
			}

			await context.sendMessage(`✅ Disabled MCP server: **${server.name}** (${serverId})`);
			return;
		}

		if (action === "connect") {
			const mcpManager = getMCPManager();

			if (mcpManager.isConnected(serverId)) {
				await context.sendMessage(`⚠️ Already connected to: **${server.name}** (${serverId})`);
				return;
			}

			const connectResult = await mcpManager.connect(server);
			if (!connectResult.success) {
				await context.sendMessage(`❌ Failed to connect to server: ${connectResult.error.message}`);
				return;
			}

			// Load tools
			const { reloadMCPServerTools } = await import("@sylphx/code-core");
			await reloadMCPServerTools(serverId);

			const state = await mcpManager.getServerState(serverId);
			const toolCount = state?.toolCount || 0;

			await context.sendMessage(
				`✅ Connected to MCP server: **${server.name}** (${serverId})\n` +
					`Found ${toolCount} tool${toolCount === 1 ? "" : "s"}`,
			);
			return;
		}

		if (action === "disconnect") {
			const mcpManager = getMCPManager();

			if (!mcpManager.isConnected(serverId)) {
				await context.sendMessage(`⚠️ Not connected to: **${server.name}** (${serverId})`);
				return;
			}

			const result = await mcpManager.disconnect(serverId);
			if (!result.success) {
				await context.sendMessage(`❌ Failed to disconnect: ${result.error.message}`);
				return;
			}

			await context.sendMessage(
				`✅ Disconnected from MCP server: **${server.name}** (${serverId})`,
			);
			return;
		}

		await context.sendMessage(
			`❌ Unknown action: ${action}\n\n` +
				"Available actions:\n" +
				"  • add - Add new MCP server\n" +
				"  • remove - Remove MCP server\n" +
				"  • list - List all servers\n" +
				"  • connect - Connect to server\n" +
				"  • disconnect - Disconnect from server\n" +
				"  • enable - Enable server\n" +
				"  • disable - Disable server",
		);
		return undefined;
	},
};

export default mcpCommand;
