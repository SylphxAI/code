/**
 * New Command
 * Create a new chat session
 */

import type { Command } from "../types.js";

export const newCommand: Command = {
	id: "new",
	label: "/new",
	description: "Create a new chat session",
	execute: async (context) => {
		// Get selected provider/model from local state (non-React getters)
		const { getSelectedProvider, getSelectedModel, setCurrentSessionId } =
			await import("../../session-state.js");
		const selectedProvider = getSelectedProvider();
		const selectedModel = getSelectedModel();

		if (!selectedProvider || !selectedModel) {
			return "No AI provider configured. Use /provider to configure a provider first.";
		}

		// Create new session with current provider and model using vanilla client call
		const result = await context.client.createSession({
			input: { provider: selectedProvider, model: selectedModel },
		});

		// Set as current session
		setCurrentSessionId(result.id);

		return `Created new chat session with ${selectedProvider} (${selectedModel})`;
	},
};

export default newCommand;
