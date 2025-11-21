/**
 * Provider Management Screen
 * Add, edit, remove AI providers
 */

import { useAIConfig, useAIConfigActions } from "../hooks/client/useAIConfig.js";
import { useKeyboard } from "../hooks/client/useKeyboard.js";
import { navigateTo, removeProvider, updateProvider } from "@sylphx/code-client";
import { AI_PROVIDERS, type ProviderId } from "@sylphx/code-core";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useState } from "react";
import ProviderCard from "../components/ProviderCard.js";
import { getColors } from "../utils/theme/index.js";

type Mode = "menu" | "add" | "remove" | "view";

interface MenuItem {
	label: string;
	value: string;
}

export default function ProviderManagement() {
	const colors = getColors();
	const [mode, setMode] = useState<Mode>("menu");
	const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null);
	const [apiKeyInput, setApiKeyInput] = useState("");

	const aiConfig = useAIConfig();
	const { saveConfig } = useAIConfigActions();

	const configuredProviders = Object.keys(aiConfig?.providers || {}) as ProviderId[];

	// Menu mode
	if (mode === "menu") {
		const items: MenuItem[] = [
			{ label: "Add/Update Provider", value: "add" },
			{ label: "View Providers", value: "view" },
			...(configuredProviders.length > 0 ? [{ label: "Remove Provider", value: "remove" }] : []),
			{ label: "Back to Chat", value: "back" },
		];

		const handleSelect = (item: MenuItem) => {
			switch (item.value) {
				case "add":
					setMode("add");
					break;
				case "view":
					setMode("view");
					break;
				case "remove":
					setMode("remove");
					break;
				case "back":
					navigateTo("chat");
					break;
			}
		};

		return (
			<Box flexDirection="column" flexGrow={1}>
				<Box flexShrink={0} paddingBottom={1}>
					<Text color={colors.primary}>▌ PROVIDER MANAGEMENT</Text>
				</Box>

				<Box flexGrow={1} paddingY={1}>
					<SelectInput items={items} onSelect={handleSelect} />
				</Box>

				<Box flexShrink={0} paddingTop={1}>
					<Text color={colors.textDim}>↑↓ Navigate · Enter Select · Esc Back</Text>
				</Box>
			</Box>
		);
	}

	// View mode
	if (mode === "view") {
		return (
			<Box flexDirection="column" flexGrow={1}>
				<Box flexShrink={0} paddingBottom={1}>
					<Text color={colors.primary}>▌ CONFIGURED PROVIDERS</Text>
				</Box>

				<Box flexGrow={1} paddingY={1}>
					{configuredProviders.length === 0 ? (
						<Box>
							<Text color={colors.warning}>▌</Text>
							<Text color={colors.textDim}> No providers configured yet</Text>
						</Box>
					) : (
						configuredProviders.map((id) => (
							<ProviderCard
								key={id}
								providerId={id}
								apiKey={aiConfig?.providers?.[id]?.apiKey}
								defaultModel={aiConfig?.providers?.[id]?.defaultModel}
								isDefault={aiConfig?.defaultProvider === id}
							/>
						))
					)}
				</Box>

				<Box flexShrink={0} paddingTop={1}>
					<Text color={colors.textDim}>Press Esc to go back</Text>
				</Box>
			</Box>
		);
	}

	// Add mode - select provider
	if (mode === "add" && !selectedProvider) {
		const items: MenuItem[] = Object.entries(AI_PROVIDERS).map(([id, provider]) => ({
			label: `${provider.name}${configuredProviders.includes(id as ProviderId) ? " ✓" : ""}`,
			value: id,
		}));

		const handleSelect = (item: MenuItem) => {
			setSelectedProvider(item.value as ProviderId);
		};

		return (
			<Box flexDirection="column" flexGrow={1}>
				<Box flexShrink={0} paddingBottom={1}>
					<Text color={colors.primary}>▌ SELECT PROVIDER</Text>
				</Box>

				<Box flexGrow={1} paddingY={1}>
					<SelectInput items={items} onSelect={handleSelect} />
				</Box>

				<Box flexShrink={0} paddingTop={1}>
					<Text color={colors.textDim}>↑↓ Navigate · Enter Select · Esc Cancel</Text>
				</Box>
			</Box>
		);
	}

	// Add mode - enter API key (or configure CLI auth for Claude Code)
	if (mode === "add" && selectedProvider) {
		const provider = AI_PROVIDERS[selectedProvider];
		const existing = aiConfig?.providers?.[selectedProvider]?.apiKey;

		// Claude Code uses CLI authentication
		if (selectedProvider === "claude-code") {
			useKeyboard({
				onEscape: () => {
					setSelectedProvider(null);
					setMode("menu");
				},
			});

			return (
				<Box flexDirection="column" flexGrow={1}>
					<Box flexShrink={0} paddingBottom={1}>
						<Text color={colors.primary}>▌ CONFIGURE {provider.name.toUpperCase()}</Text>
					</Box>

					<Box flexShrink={0} paddingBottom={2}>
						<Text color={colors.textDim}>Claude Code uses CLI authentication. To set up:</Text>
					</Box>

					<Box flexShrink={0} paddingLeft={2} flexDirection="column">
						<Box paddingBottom={1}>
							<Text color={colors.success}>1.</Text>
							<Text color={colors.textDim}> Install the Claude Code CLI globally:</Text>
						</Box>
						<Box paddingBottom={1} paddingLeft={3}>
							<Text color={colors.text}>npm install -g @anthropic-ai/claude-code</Text>
						</Box>

						<Box paddingBottom={1}>
							<Text color={colors.success}>2.</Text>
							<Text color={colors.textDim}> Login to Claude:</Text>
						</Box>
						<Box paddingBottom={1} paddingLeft={3}>
							<Text color={colors.text}>claude login</Text>
						</Box>

						<Box paddingBottom={1}>
							<Text color={colors.success}>3.</Text>
							<Text color={colors.textDim}> You can now use Claude Code models (opus, sonnet, haiku)</Text>
						</Box>
					</Box>

					<Box flexShrink={0} paddingTop={1}>
						<Text color={colors.textDim}>Press Esc to go back</Text>
					</Box>
				</Box>
			);
		}

		const handleSubmit = async (value: string) => {
			if (!value.trim()) {
				setSelectedProvider(null);
				setApiKeyInput("");
				return;
			}

			updateProvider(selectedProvider, { apiKey: value.trim() });
			await saveConfig({ ...aiConfig!, providers: { ...aiConfig?.providers } });

			setSelectedProvider(null);
			setApiKeyInput("");
			setMode("menu");
		};

		return (
			<Box flexDirection="column" flexGrow={1}>
				<Box flexShrink={0} paddingBottom={1}>
					<Text color={colors.primary}>▌ CONFIGURE {provider.name.toUpperCase()}</Text>
				</Box>

				<Box flexShrink={0} paddingBottom={1}>
					<Text color={colors.textDim}>Enter your {provider.keyName}</Text>
				</Box>

				<Box flexGrow={1} flexDirection="column" paddingY={1}>
					{apiKeyInput && (
						<Box marginBottom={1}>
							<Text color={colors.textDim}>{"*".repeat(apiKeyInput.length)}</Text>
						</Box>
					)}

					<TextInput
						value={apiKeyInput}
						onChange={setApiKeyInput}
						onSubmit={handleSubmit}
						placeholder={existing ? "Keep existing or enter new" : "Paste your API key..."}
						showCursor
					/>
				</Box>

				<Box flexShrink={0} paddingTop={1}>
					<Text color={colors.textDim}>Enter Save · Esc Cancel</Text>
				</Box>
			</Box>
		);
	}

	// Remove mode
	if (mode === "remove") {
		const items: MenuItem[] = configuredProviders.map((id) => ({
			label: AI_PROVIDERS[id].name,
			value: id,
		}));

		const handleSelect = async (item: MenuItem) => {
			const providerId = item.value as ProviderId;
			removeProvider(providerId);
			await saveConfig({ ...aiConfig!, providers: { ...aiConfig?.providers } });
			setMode("menu");
		};

		return (
			<Box flexDirection="column" flexGrow={1}>
				<Box flexShrink={0} paddingBottom={1}>
					<Text color={colors.error}>▌ REMOVE PROVIDER</Text>
				</Box>

				<Box flexGrow={1} paddingY={1}>
					<SelectInput items={items} onSelect={handleSelect} />
				</Box>

				<Box flexShrink={0} paddingTop={1}>
					<Text color={colors.textDim}>↑↓ Navigate · Enter Remove · Esc Cancel</Text>
				</Box>
			</Box>
		);
	}

	return null;
}
