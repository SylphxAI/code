/**
 * Theme Command
 * Switch between available themes
 */

import type { Command } from "../types.js";
import { getAvailableThemes, getTheme, setTheme } from "../../theme.js";

export const themeCommand: Command = {
	id: "theme",
	label: "/theme",
	description: "Switch color theme",
	silent: true, // UI-only command, don't add to conversation
	args: [
		{
			name: "theme-name",
			description: "Theme to switch to",
			required: false,
			loadOptions: async () => {
				const themes = getAvailableThemes();
				const current = getTheme();
				return themes.map((t) => ({
					id: t.id,
					name: t.name,
					label: `${t.name}${t.id === current.id ? " ✓" : ""}`,
					value: t.id,
				}));
			},
		},
	],
	execute: async (context) => {

		// If arg provided, switch directly
		if (context.args.length > 0) {
			const themeId = context.args[0];
			const success = setTheme(themeId);

			if (success) {
				const theme = getTheme();
				return `Switched to ${theme.name} theme`;
			}
			const available = getAvailableThemes()
				.map((t) => t.id)
				.join(", ");
			return `Theme '${themeId}' not found. Available: ${available}`;
		}

		// No args - show selection
		const themes = getAvailableThemes();
		const current = getTheme();

		const result = await context.waitForInput({
			type: "selection",
			questions: [
				{
					id: "theme",
					question: "Select a theme",
					options: themes.map((t) => ({
						label: `${t.name}${t.id === current.id ? " ✓" : ""}`,
						value: t.id,
					})),
				},
			],
		});

		const selectedThemeId = typeof result === "string" ? result : (result.theme as string);

		if (!selectedThemeId) {
			return undefined;
		}

		const success = setTheme(selectedThemeId);
		if (success) {
			const theme = getTheme();
			return `Switched to ${theme.name} theme`;
		}

		return "Failed to switch theme";
	},
};

export default themeCommand;
