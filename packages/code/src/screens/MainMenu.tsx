/**
 * Main Menu Screen
 * Entry point with navigation options
 */

import { useAIConfigState } from "../ai-config-state.js";
import { setCurrentScreen } from "../ui-state.js";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { useThemeColors } from "../theme.js";

interface MenuItem {
	label: string;
	value: string;
}

export default function MainMenu() {
	const colors = useThemeColors();
	const aiConfig = useAIConfigState();

	const configuredCount = Object.keys(aiConfig?.providers || {}).length;
	const hasDefaultModel = !!(aiConfig?.defaultProvider && aiConfig?.defaultModel);

	const items: MenuItem[] = [
		{
			label: `🔑 Manage Providers ${configuredCount > 0 ? `(${configuredCount} configured)` : "(none)"}`,
			value: "providers",
		},
		{
			label: `🎯 Select Model ${hasDefaultModel ? `(${aiConfig?.defaultModel})` : "(not set)"}`,
			value: "models",
		},
		{
			label: "💬 Start Chat",
			value: "chat",
		},
		{
			label: "❌ Exit",
			value: "exit",
		},
	];

	const handleSelect = (item: MenuItem) => {
		switch (item.value) {
			case "providers":
				setCurrentScreen("provider-management");
				break;
			case "models":
				setCurrentScreen("model-selection");
				break;
			case "chat":
				setCurrentScreen("chat");
				break;
			case "exit":
				process.exit(0);
				break;
		}
	};

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text bold>Main Menu</Text>
			</Box>

			<SelectInput items={items} onSelect={handleSelect} />

			<Box marginTop={1}>
				<Text color={colors.textDim}>Use ↑↓ arrows to navigate, Enter to select</Text>
			</Box>
		</Box>
	);
}
