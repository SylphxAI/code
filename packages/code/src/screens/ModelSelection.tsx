/**
 * Model Selection Screen
 * Select provider and model with dynamic loading
 */

import { useAIConfigActions } from "../hooks/client/useAIConfig.js";
import { useAIConfigState } from "../ai-config-state.js";
import { useModels } from "../hooks/client/useModels.js";
import { useProviders } from "../hooks/client/useProviders.js";
import { setSelectedModel, setSelectedProvider, useSelectedModel, useSelectedProvider } from "../session-state.js";
import { setCurrentScreen, setError } from "../ui-state.js";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useEffect, useState } from "react";
import Spinner from "../components/Spinner.js";
import { useThemeColors, getColors } from "../theme.js";

type Mode = "provider" | "model" | "search";

interface MenuItem {
	label: string;
	value: string;
}

/**
 * ModelSelection Component
 *
 * ARCHITECTURE: No provider hardcoding
 * - Fetches available providers from server (useProviders hook)
 * - Fetches models dynamically (useModels hook)
 * - Client is agnostic to which providers exist
 * - Server is source of truth
 */
export default function ModelSelection() {
	const [mode, setMode] = useState<Mode>("provider");
	const [searchQuery, setSearchQuery] = useState("");
	const colors = useThemeColors();

	const aiConfig = useAIConfigState();
	const selectedProvider = useSelectedProvider();
	const _selectedModel = useSelectedModel();
	const { saveConfig } = useAIConfigActions();

	const configuredProviders = Object.keys(aiConfig?.providers || {});

	// Load AI providers from server
	const { providers: aiProvidersArray, loading: loadingProviders } = useProviders();

	// Transform providers array to Record for easy lookup
	const aiProviders = aiProvidersArray.reduce((acc, provider) => {
		acc[provider.id] = provider;
		return acc;
	}, {} as Record<string, { id: string; name: string; isConfigured: boolean }>);

	// Load models when provider is selected
	const { models, loading: isLoadingModels, error: modelsError } = useModels(selectedProvider);

	// Handle models loading error
	useEffect(() => {
		if (modelsError) {
			setError(modelsError);
		}
	}, [modelsError]);

	const loadModelsAndSelectDefault = async () => {
		if (!selectedProvider || models.length === 0) return;

		// Auto-select: last used (provider's defaultModel) or first in list
		const providerConfig = aiConfig?.providers?.[selectedProvider] || {};
		const defaultModel = providerConfig.defaultModel as string | undefined;
		const modelToSelect = defaultModel || models[0]?.id;

		if (modelToSelect) {
			// Automatically select and save the model
			setSelectedModel(modelToSelect);

			// Update config
			const newConfig = {
				...aiConfig!,
				defaultProvider: selectedProvider,
				// ❌ No top-level defaultModel
				providers: {
					...aiConfig?.providers,
					[selectedProvider]: {
						...aiConfig?.providers?.[selectedProvider],
						defaultModel: modelToSelect, // ✅ Save as provider's default
					},
				},
			};

			// Save config
			await saveConfig(newConfig);

			// Reset and go back to chat
			await setSelectedProvider(null);
			setSearchQuery("");
			setMode("provider");
			setCurrentScreen("chat");
		}
	};

	// Auto-select default model when models are loaded
	useEffect(() => {
		if (selectedProvider && mode === "model" && models.length > 0 && !isLoadingModels) {
			loadModelsAndSelectDefault();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedProvider, mode, models, isLoadingModels]);

	// Provider selection
	if (mode === "provider") {
		if (configuredProviders.length === 0) {
			return (
				<Box flexDirection="column">
					<Box marginBottom={1}>
						<Text bold color={colors.primary}>
							Model Selection
						</Text>
					</Box>

					<Box marginBottom={1}>
						<Text color={colors.warning}>⚠️ No providers configured</Text>
					</Box>

					<Box>
						<Text color={colors.textDim}>Please configure providers first</Text>
					</Box>

					<Box marginTop={1}>
						<Text color={colors.textDim}>Press Esc to go back</Text>
					</Box>
				</Box>
			);
		}

		const items: MenuItem[] = [
			...configuredProviders.map((id) => ({
				label: `${aiProviders[id]?.name || id}${aiConfig?.defaultProvider === id ? " (Default)" : ""}`,
				value: id,
			})),
			{ label: "Back to Chat", value: "back" },
		];

		const handleSelect = async (item: MenuItem) => {
			if (item.value === "back") {
				setCurrentScreen("chat");
			} else {
				await setSelectedProvider(item.value);
				setMode("model");
			}
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
					<Text color={colors.textDim}>↑↓ Navigate · Enter Select · Esc Back</Text>
				</Box>
			</Box>
		);
	}

	// Model selection
	if (mode === "model") {
		if (isLoadingModels) {
			return (
				<Box>
					<Spinner color={colors.warning} />
					<Text color={colors.textDim}> Loading models from {selectedProvider}...</Text>
				</Box>
			);
		}

		// Filter models by search query
		const filteredModels = models.filter(
			(m) =>
				m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
				m.name.toLowerCase().includes(searchQuery.toLowerCase()),
		);

		const items: MenuItem[] = filteredModels.slice(0, 20).map((model) => {
			const nameLabel = model.name !== model.id ? `${model.name} (${model.id})` : model.id;

			return {
				label: nameLabel,
				value: model.id,
			};
		});

		const handleSelect = async (item: MenuItem) => {
			if (!selectedProvider) return;

			await setSelectedModel(item.value);

			// Update config: save selected model as provider's default-model
			const newConfig = {
				...aiConfig!,
				defaultProvider: selectedProvider,
				// ❌ No top-level defaultModel
				providers: {
					...aiConfig?.providers,
					[selectedProvider]: {
						...aiConfig?.providers?.[selectedProvider],
						defaultModel: item.value, // ✅ Save as provider's default
					},
				},
			};

			// Save config
			await saveConfig(newConfig);

			// Reset and go back
			await setSelectedProvider(null);
			setSearchQuery("");
			setMode("provider");
			setCurrentScreen("chat");
		};

		return (
			<Box flexDirection="column" flexGrow={1}>
				<Box flexShrink={0} paddingBottom={1}>
					<Text color={colors.primary}>▌ SELECT MODEL</Text>
					<Text color={colors.textDim}>
						{" "}
						· {selectedProvider && (aiProviders[selectedProvider]?.name || selectedProvider)}
					</Text>
				</Box>

				{/* Search input */}
				<Box flexShrink={0} paddingY={1} flexDirection="column">
					<Box marginBottom={1}>
						<Text color={colors.textDim}>Search</Text>
					</Box>
					<TextInput
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder="Type to filter..."
						showCursor
					/>
				</Box>

				{/* Model list */}
				<Box flexGrow={1} paddingY={1} flexDirection="column">
					{filteredModels.length === 0 ? (
						<Box>
							<Text color={colors.warning}>▌</Text>
							<Text color={colors.textDim}> No models found</Text>
						</Box>
					) : (
						<>
							<Box marginBottom={1}>
								<Text color={colors.textDim}>
									Showing {Math.min(filteredModels.length, 20)} of {models.length} models
								</Text>
							</Box>
							<SelectInput items={items} onSelect={handleSelect} />
						</>
					)}
				</Box>

				<Box flexShrink={0} paddingTop={1}>
					<Text color={colors.textDim}>↑↓ Navigate · Type Search · Enter Select · Esc Cancel</Text>
				</Box>
			</Box>
		);
	}

	return null;
}
