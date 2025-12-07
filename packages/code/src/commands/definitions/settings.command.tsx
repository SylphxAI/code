/**
 * Settings Command
 * Configure tool display settings and other preferences
 */

import { getAIConfig, setAIConfig } from "../../ai-config-state.js";
import { SettingsManagement } from "../../screens/chat/components/SettingsManagement.js";
import type { Command } from "../types.js";

export const settingsCommand: Command = {
	id: "settings",
	label: "/settings",
	description: "Configure tool display settings and preferences",
	args: [],

	execute: async (context) => {
		// Get current config
		const aiConfig = getAIConfig();

		// Show settings UI
		context.setInputComponent(
			<SettingsManagement
				aiConfig={aiConfig}
				onComplete={() => {
					context.setInputComponent(null);
					context.addLog("[settings] Settings management closed");
				}}
				onSave={async (updatedConfig) => {
					// Update AI config
					setAIConfig(updatedConfig);

					// Save to file
					await context.saveConfig(updatedConfig);

					context.addLog("[settings] Settings saved successfully");
					context.setInputComponent(null);
				}}
			/>,
			"Settings",
		);
	},
};

export default settingsCommand;
