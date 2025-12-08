/**
 * AI Config Hook
 * Load and save AI configuration via Lens (backend handles file system)
 *
 * ARCHITECTURE: lens-react v5 API
 * - client.xxx.useQuery({ input }) → React hook { data, loading, error, refetch }
 * - client.xxx.useMutation() → React hook { mutate, loading, error }
 */

import type { AIConfig } from "@sylphx/code-core";
import { useCallback, useEffect } from "react";
import { useLensClient } from "@sylphx/code-client";
import { setAIConfig } from "../../ai-config-state.js";
import { setError } from "../../ui-state.js";
import { getSelectedProvider, setSelectedProvider, getSelectedModel, setSelectedModel } from "../../session-state.js";

export function useAIConfig() {
	const client = useLensClient();

	// Query hook - auto-loads config on mount
	const configQuery = client.loadConfig.useQuery({ input: {} });

	// Mutation hook - for saving config
	const { mutate: saveConfigMutate } = client.saveConfig.useMutation();

	// Sync config to global state when data changes
	useEffect(() => {
		if (configQuery.data) {
			const result = configQuery.data as { success: boolean; config: AIConfig; error?: string };
			if (result.success && result.config) {
				setAIConfig(result.config);

				// Sync defaultProvider to selectedProvider if not already set
				if (result.config.defaultProvider && !getSelectedProvider()) {
					setSelectedProvider(result.config.defaultProvider);
				}

				// Sync defaultModel to selectedModel if not already set
				const providerConfig = result.config.providers?.[result.config.defaultProvider || ""];
				if (providerConfig?.defaultModel && !getSelectedModel()) {
					setSelectedModel(providerConfig.defaultModel);
				}
			} else {
				// No config yet, start with empty
				setAIConfig({ providers: {} });
			}
		}
	}, [configQuery.data]);

	// Handle errors
	useEffect(() => {
		if (configQuery.error) {
			setError(configQuery.error.message || "Failed to load AI config");
		}
	}, [configQuery.error]);

	// Imperative load (just triggers refetch)
	const loadConfig = useCallback(async () => {
		configQuery.refetch();
	}, [configQuery]);

	// Save config using mutation
	const saveConfig = useCallback(
		async (config: AIConfig) => {
			try {
				const result = await saveConfigMutate({ input: { config } }) as { success: boolean; error?: string };

				if (result.success) {
					setAIConfig(config);
					return true;
				}
				setError(result.error || "Failed to save AI config");
				return false;
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to save AI config");
				return false;
			}
		},
		[saveConfigMutate],
	);

	return { loadConfig, saveConfig };
}

/**
 * Alias for useAIConfig (for backwards compatibility)
 */
export { useAIConfig as useAIConfigActions };
