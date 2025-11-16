/**
 * Settings Management Component
 * UI for configuring tool display settings and other preferences
 */

import type { AIConfig } from "@sylphx/code-core";
import { DEFAULT_TOOL_DISPLAY_SETTINGS } from "@sylphx/code-core";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { useState } from "react";

interface SettingsManagementProps {
	aiConfig: AIConfig | null;
	onComplete: () => void;
	onSave: (config: AIConfig) => Promise<void>;
}

type View = "main" | "tool-display" | "tokenizer-mode" | "context-reserve";

interface ToolDisplayItem {
	label: string;
	value: string;
	toolName: string;
	enabled: boolean;
	isDefault: boolean;
}

export function SettingsManagement({ aiConfig, onComplete, onSave }: SettingsManagementProps) {
	const [view, setView] = useState<View>("main");
	const [toolDisplaySettings, setToolDisplaySettings] = useState<Record<string, boolean>>(
		aiConfig?.toolDisplaySettings || {},
	);
	const [_selectedToolIndex, _setSelectedToolIndex] = useState(0);

	// Main menu options
	const mainMenuItems = [
		{ label: "Tool Display Settings", value: "tool-display" },
		{ label: "Token Calculation Mode", value: "tokenizer-mode" },
		{ label: "Context Reserve Ratio", value: "context-reserve" },
		{ label: "← Back", value: "back" },
	];

	// Get tool display items with current settings
	const getToolDisplayItems = (): ToolDisplayItem[] => {
		const toolNames = Object.keys(DEFAULT_TOOL_DISPLAY_SETTINGS);

		return toolNames.map((toolName) => {
			const userSetting = toolDisplaySettings[toolName];
			const defaultSetting = DEFAULT_TOOL_DISPLAY_SETTINGS[toolName];
			const isDefault = userSetting === undefined;
			const enabled = userSetting !== undefined ? userSetting : defaultSetting;

			// Format tool name nicely
			const displayName = toolName
				.split("-")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ");

			const status = enabled ? "ON" : "OFF";
			const defaultIndicator = isDefault ? " (default)" : "";

			return {
				label: `${displayName.padEnd(20)} ${status}${defaultIndicator}`,
				value: toolName,
				toolName,
				enabled,
				isDefault,
			};
		});
	};

	const handleMainMenuSelect = (item: { value: string }) => {
		if (item.value === "back") {
			onComplete();
		} else if (item.value === "tool-display") {
			setView("tool-display");
		} else if (item.value === "tokenizer-mode") {
			setView("tokenizer-mode");
		} else if (item.value === "context-reserve") {
			setView("context-reserve");
		}
	};

	const handleToolDisplaySelect = (item: ToolDisplayItem) => {
		if (item.value === "save") {
			// Save settings
			const updatedConfig = {
				...aiConfig,
				toolDisplaySettings,
			} as AIConfig;

			onSave(updatedConfig);
			return;
		}

		if (item.value === "back") {
			setView("main");
			return;
		}

		if (item.value === "reset-all") {
			// Reset all to defaults
			setToolDisplaySettings({});
			return;
		}

		// Toggle tool setting
		const currentValue = toolDisplaySettings[item.toolName];
		const defaultValue = DEFAULT_TOOL_DISPLAY_SETTINGS[item.toolName];

		if (currentValue === undefined) {
			// No user override, set opposite of default
			setToolDisplaySettings({
				...toolDisplaySettings,
				[item.toolName]: !defaultValue,
			});
		} else if (currentValue === defaultValue) {
			// User override matches default, remove it
			const newSettings = { ...toolDisplaySettings };
			delete newSettings[item.toolName];
			setToolDisplaySettings(newSettings);
		} else {
			// User override differs from default, toggle it
			setToolDisplaySettings({
				...toolDisplaySettings,
				[item.toolName]: !currentValue,
			});
		}
	};

	// Main menu view
	if (view === "main") {
		return (
			<Box flexDirection="column" padding={1}>
				<Box marginBottom={1}>
					<Text bold>Settings</Text>
				</Box>

				<Box marginBottom={1}>
					<Text dimColor>Select a category to configure:</Text>
				</Box>

				<SelectInput items={mainMenuItems} onSelect={handleMainMenuSelect} />
			</Box>
		);
	}

	// Tool display settings view
	if (view === "tool-display") {
		const toolItems = getToolDisplayItems();

		// Add action items at the end
		const items = [
			...toolItems,
			{ label: "", value: "separator", toolName: "", enabled: false, isDefault: false }, // Separator
			{
				label: "Save Changes",
				value: "save",
				toolName: "",
				enabled: false,
				isDefault: false,
			},
			{
				label: "Reset All to Defaults",
				value: "reset-all",
				toolName: "",
				enabled: false,
				isDefault: false,
			},
			{ label: "← Back", value: "back", toolName: "", enabled: false, isDefault: false },
		];

		return (
			<Box flexDirection="column" padding={1}>
				<Box marginBottom={1}>
					<Text bold>Tool Display Settings</Text>
				</Box>

				<Box marginBottom={1} flexDirection="column">
					<Text dimColor>Configure which tools show details by default:</Text>
					<Text dimColor>• ON = Show full output</Text>
					<Text dimColor>• OFF = Show summary only</Text>
					<Text dimColor>Press Enter to toggle</Text>
				</Box>

				<SelectInput items={items} onSelect={handleToolDisplaySelect} />
			</Box>
		);
	}

	// Tokenizer mode view
	if (view === "tokenizer-mode") {
		return (
			<Box flexDirection="column" padding={1}>
				<Box marginBottom={1}>
					<Text bold>Token Calculation Mode</Text>
				</Box>

				<Box marginBottom={1} flexDirection="column">
					<Text dimColor>Choose how token counts are calculated:</Text>
					<Text dimColor> </Text>
					<Text dimColor>• Accurate: BPE tokenizer (slow, 100% accurate)</Text>
					<Text dimColor> - First calculation: ~3-5s</Text>
					<Text dimColor> - Subsequent: &lt;100ms (cached)</Text>
					<Text dimColor> </Text>
					<Text dimColor>• Fast: Mathematical estimation (instant, ~10% error)</Text>
					<Text dimColor> - All calculations: ~100ms</Text>
					<Text dimColor> - Good for large sessions</Text>
				</Box>

				<SelectInput
					items={[
						{ label: "Accurate (BPE Tokenizer) - Recommended", value: "accurate" },
						{ label: "Fast (Estimation)", value: "fast" },
						{ label: "← Back", value: "back" },
					]}
					onSelect={async (item) => {
						if (item.value === "back") {
							setView("main");
							return;
						}

						const useAccurate = item.value === "accurate";

						// Save to project settings
						const { loadSettings, saveSettings } = await import("@sylphx/code-core");
						const cwd = process.cwd();
						const settingsResult = await loadSettings(cwd);
						const currentSettings = settingsResult.success ? settingsResult.data : {};

						await saveSettings(
							{
								...currentSettings,
								useAccurateTokenizer: useAccurate,
							},
							cwd,
						);

						// Go back to main menu
						setView("main");
					}}
				/>
			</Box>
		);
	}

	// Context reserve ratio view
	if (view === "context-reserve") {
		return (
			<Box flexDirection="column" padding={1}>
				<Box marginBottom={1}>
					<Text bold>Context Reserve Ratio</Text>
				</Box>

				<Box marginBottom={1} flexDirection="column">
					<Text dimColor>Percentage of context to reserve for:</Text>
					<Text dimColor>• Tokenizer error margin (~1% of total)</Text>
					<Text dimColor>• AI summary during compact (~9% of total)</Text>
					<Text dimColor> </Text>
					<Text dimColor>Examples (for 128K context):</Text>
					<Text dimColor>• 5%: 6.4K reserved (minimal, more space, risk hitting limits)</Text>
					<Text dimColor>• 10%: 12.8K reserved (balanced, recommended)</Text>
					<Text dimColor>• 15%: 19.2K reserved (conservative, better summaries)</Text>
					<Text dimColor>• 20%: 25.6K reserved (very safe, max quality)</Text>
				</Box>

				<SelectInput
					items={[
						{ label: "5% - Minimal (more usable space, higher risk)", value: "0.05" },
						{ label: "10% - Balanced (recommended)", value: "0.10" },
						{ label: "15% - Conservative (better summaries)", value: "0.15" },
						{ label: "20% - Very Safe (maximum quality)", value: "0.20" },
						{ label: "← Back", value: "back" },
					]}
					onSelect={async (item) => {
						if (item.value === "back") {
							setView("main");
							return;
						}

						const reserveRatio = parseFloat(item.value);

						// Save to project settings
						const { loadSettings, saveSettings } = await import("@sylphx/code-core");
						const cwd = process.cwd();
						const settingsResult = await loadSettings(cwd);
						const currentSettings = settingsResult.success ? settingsResult.data : {};

						await saveSettings(
							{
								...currentSettings,
								contextReserveRatio: reserveRatio,
							},
							cwd,
						);

						// Go back to main menu
						setView("main");
					}}
				/>
			</Box>
		);
	}

	return null;
}
