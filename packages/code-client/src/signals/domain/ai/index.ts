/**
 * AI Domain Signals
 * Manages AI configuration and provider state
 */

import type { AIConfig } from "@sylphx/code-core";
import { createMemo, createSignal } from "solid-js";
import { useSignal } from "../react-bridge.js";

// Core AI signals
export const [aiConfig, setAiConfig] = createSignal<AIConfig | null>(null);
export const [isConfigLoading, setIsConfigLoading] = createSignal(false);
export const [configError, setConfigError] = createSignal<string | null>(null);
export const [selectedProvider, setSelectedProvider] = createSignal<string | null>(null);
export const [selectedModel, setSelectedModel] = createSignal<string | null>(null);

// Computed signals
export const hasConfig = createMemo(() => aiConfig() !== null);
export const defaultProvider = createMemo(() => aiConfig()?.defaultProvider || null);
export const availableProviders = createMemo(() => Object.keys(aiConfig()?.providers || {}));

export const providerModels = createMemo(() => {
	const config = aiConfig();
	const providerId = selectedProvider();
	if (!config || !providerId) return [];
	return config.providers?.[providerId]?.models || [];
});

export const selectedModelConfig = createMemo(() => {
	const config = aiConfig();
	const providerId = selectedProvider();
	const modelId = selectedModel();
	if (!config || !providerId || !modelId) return null;
	return config.providers?.[providerId]?.models?.find((m: any) => m.id === modelId) || null;
});

// Actions
export const setAIConfig = (config: AIConfig | null) => {
	setAiConfig(config);

	// Update selected provider and model when config loads
	if (config) {
		if (config.defaultProvider) {
			setSelectedProvider(config.defaultProvider);
		}

		// Set selected model from default provider
		if (config.defaultProvider && config.providers?.[config.defaultProvider]) {
			const providerConfig = config.providers[config.defaultProvider];
			if (providerConfig.defaultModel) {
				setSelectedModel(providerConfig.defaultModel);
			}
		}

		// Load default agent and rules from global config
		if (config.defaultAgentId) {
			const { setSelectedAgentId } = require("../settings/index.js");
			setSelectedAgentId(config.defaultAgentId);
		}

		if (config.defaultEnabledRuleIds) {
			const { setEnabledRuleIds } = require("../settings/index.js");
			setEnabledRuleIds(config.defaultEnabledRuleIds);
		}
	}
};

export const updateProvider = (providerId: string, data: any) => {
	const config = aiConfig();
	if (!config) return;

	setAiConfig({
		...config,
		providers: {
			...config.providers,
			[providerId]: {
				...config.providers?.[providerId],
				...data,
			},
		},
	});
};

export const removeProvider = (providerId: string) => {
	const config = aiConfig();
	if (!config) return;

	const providers = { ...config.providers };
	delete providers[providerId];

	setAiConfig({
		...config,
		providers,
		defaultProvider: config.defaultProvider === providerId ? undefined : config.defaultProvider,
	});
};

export const selectProvider = (providerId: string | null) => {
	setSelectedProvider(providerId);
	// Reset selected model when provider changes
	setSelectedModel(null);
};

export const selectModel = (modelId: string | null) => {
	setSelectedModel(modelId);
};

export const setLoading = (loading: boolean) => setIsConfigLoading(loading);
export const setError = (error: string | null) => setConfigError(error);

// Hooks for React components
export const useAIConfig = () => useSignal(aiConfig);
export const useHasAIConfig = () => useSignal(hasConfig);
export const useSelectedProvider = () => useSignal(selectedProvider);
export const useSelectedModel = () => useSignal(selectedModel);
export const useAvailableProviders = () => useSignal(availableProviders);
export const useProviderModels = () => useSignal(providerModels);
export const useSelectedModelConfig = () => useSignal(selectedModelConfig);
export const useIsConfigLoading = () => useSignal(isConfigLoading);
