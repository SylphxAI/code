/**
 * Agent Command
 * Switch between agents using component-based UI
 */

import { getAgentCompletions } from "../../completions/agent.js";
import { AgentSelection } from "../../screens/chat/components/AgentSelection.js";
import type { Command } from "../types.js";
import { getAllAgents, getAgentById, setSelectedAgent } from "../../embedded-context.js";
import { getSelectedAgentId, getCurrentSessionId } from "../../session-state.js";

export const agentCommand: Command = {
	id: "agent",
	label: "/agent",
	description: "Switch between AI agents with different system prompts",
	args: [
		{
			name: "agent-name",
			description: "Agent to switch to (coder, planner, etc.)",
			required: false,
			loadOptions: async () => {
				return getAgentCompletions();
			},
		},
	],
	execute: async (context) => {
		// If arg provided, switch directly
		if (context.args.length > 0) {
			const agentId = context.args[0];
			if (!agentId) {
				return "Agent ID is required.";
			}
			const agent = getAgentById(agentId);

			if (!agent) {
				return `Agent not found: ${agentId}. Use /agent to see available agents.`;
			}

			// Update global default
			await setSelectedAgent(agentId);

			// Update current session if exists (via vanilla client call)
			const currentSessionId = getCurrentSessionId();
			if (currentSessionId) {
				await context.client.updateSession({
					args: { id: currentSessionId, agentId },
				});
			}

			return `Switched to agent: ${agent.metadata.name}\n${agent.metadata.description}`;
		}

		// No args - show agent selection UI
		const agents = getAllAgents();
		const selectedAgentId = getSelectedAgentId();
		const currentAgent = selectedAgentId ? getAgentById(selectedAgentId) : null;

		if (!currentAgent) {
			return "Current agent not found.";
		}

		if (agents.length === 0) {
			return "No agents available.";
		}

		const agentsList = agents.map((agent) => ({
			id: agent.id,
			name: agent.metadata.name,
			description: agent.metadata.description,
		}));

		// Use AgentSelection component
		context.setInputComponent(
			<AgentSelection
				agents={agentsList}
				currentAgentId={currentAgent.id}
				onSelect={async (agentId) => {
					const selectedAgent = getAgentById(agentId);

					if (!selectedAgent) {
						context.addLog(`[agent] Agent not found: ${agentId}`);
						context.setInputComponent(null);
						return;
					}

					// Update global default
					await setSelectedAgent(agentId);

					// Update current session if exists (via vanilla client call)
					const currentSessionId = getCurrentSessionId();
					if (currentSessionId) {
						await context.client.updateSession({
							args: { id: currentSessionId, agentId },
						});
					}

					context.addLog(`[agent] Switched to agent: ${selectedAgent.metadata.name}`);
					context.setInputComponent(null);
				}}
				onCancel={() => {
					context.setInputComponent(null);
					context.addLog("[agent] Agent selection cancelled");
				}}
			/>,
			"Agent Selection",
		);

		context.addLog("[agent] Agent selection opened");
	},
};

export default agentCommand;
