/**
 * AI Domain Signals
 * Manages AI configuration and provider state
 */

import type { AIConfig } from "@sylphx/code-core";
import { zen, computed } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

// Core AI signals
export const aiConfig = zen<AIConfig | null>(null);
export const isConfigLoading = zen(false);
export const configError = zen<string | null>(null);
export const selectedProvider = zen<string | null>(null);
export const selectedModel = zen<string | null>(null);

// Computed signals
export const hasConfig = computed(() => aiConfig.value !== null);
export const defaultProvider = computed(() => aiConfig.value?.defaultProvider || null);
export const availableProviders = computed(() => Object.keys(aiConfig.value?.providers || {}));

export const providerModels = computed(() => {
	const config = aiConfig.value;
	const providerId = selectedProvider.value;
	if (!config || !providerId) return [];
	return config.providers?.[providerId]?.models || [];
});

export const selectedModelConfig = computed(() => {
	const config = aiConfig.value;
	const providerId = selectedProvider.value;
	const modelId = selectedModel.value;
	if (!config || !providerId || !modelId) return null;
	return config.providers?.[providerId]?.models?.find((m: any) => m.id === modelId) || null;
});

// Setter functions for backwards compatibility
export const setAiConfig = (value: AIConfig | null) => { (aiConfig as any).value = value };
export const setIsConfigLoading = (value: boolean) => { (isConfigLoading as any).value = value };
export const setConfigError = (value: string | null) => { (configError as any).value = value };
export const setSelectedProvider = (value: string | null) => { (selectedProvider as any).value = value };
export const setSelectedModel = (value: string | null) => { (selectedModel as any).value = value };

// Actions
export const setAIConfig = (config: AIConfig | null) => {
	(aiConfig as any).value = config;

	// Update selected provider and model when config loads
	if (config) {
		if (config.defaultProvider) {
			(selectedProvider as any).value = config.defaultProvider;
		}

		// Set selected model from default provider
		if (config.defaultProvider && config.providers?.[config.defaultProvider]) {
			const providerConfig = config.providers[config.defaultProvider];
			if (providerConfig.defaultModel) {
				(selectedModel as any).value = providerConfig.defaultModel;
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
	const config = aiConfig.value;
	if (!config) return;

	(aiConfig as any).value = {
		...config,
		providers: {
			...config.providers,
			[providerId]: {
				...config.providers?.[providerId],
				...data,
			},
		},
	};
};

export const removeProvider = (providerId: string) => {
	const config = aiConfig.value;
	if (!config) return;

	const providers = { ...config.providers };
	delete providers[providerId];

	(aiConfig as any).value = {
		...config,
		providers,
		defaultProvider: config.defaultProvider === providerId ? undefined : config.defaultProvider,
	};
};

export const selectProvider = (providerId: string | null) => {
	(selectedProvider as any).value = providerId;
	// Reset selected model when provider changes
	(selectedModel as any).value = null;
};

export const selectModel = (modelId: string | null) => {
	(selectedModel as any).value = modelId;
};

export const setAIConfigLoading = (loading: boolean) => { (isConfigLoading as any).value = loading };
export const setAIConfigError = (error: string | null) => { (configError as any).value = error };

// Hooks for React components
export const useAIConfig = () => useZen(aiConfig);
export const useHasAIConfig = () => useZen(hasConfig);
export const useSelectedProvider = () => useZen(selectedProvider);
export const useSelectedModel = () => useZen(selectedModel);
export const useAvailableProviders = () => useZen(availableProviders);
export const useProviderModels = () => useZen(providerModels);
export const useSelectedModelConfig = () => useZen(selectedModelConfig);
export const useIsConfigLoading = () => useZen(isConfigLoading);
