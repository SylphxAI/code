/**
 * AI Config Hook
 * Load and save AI configuration via Lens (backend handles file system)
 */

import type { AIConfig } from "@sylphx/code-core";
import { useCallback } from "react";
import { useLensClient } from "@sylphx/code-client";
import { setAIConfig } from "../../ai-config-state.js";
import { setError } from "../../ui-state.js";

export function useAIConfig() {
	const client = useLensClient();

	const loadConfig = useCallback(async () => {
		try {
			// Lens flat namespace: client.loadConfig.fetch({})
			const result = await client.loadConfig.fetch({}) as { success: boolean; config: AIConfig; error?: string };

			if (result.success) {
				// Use setAIConfig to trigger logic for loading defaultEnabledRuleIds and defaultAgentId
				setAIConfig(result.config);
			} else {
				// No config yet, start with empty
				setAIConfig({ providers: {} });
			}
		} catch (err) {
			console.error("[useAIConfig] Load error:", err);
			setError(err instanceof Error ? err.message : "Failed to load AI config");
		}
	}, [client]);

	const saveConfig = useCallback(
		async (config: AIConfig) => {
			try {
				// Lens flat namespace: client.saveConfig.fetch({ input })
				const result = await client.saveConfig.fetch({ input: { config } }) as { success: boolean; error?: string };

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
		[client],
	);

	return { loadConfig, saveConfig };
}

/**
 * Alias for useAIConfig (for backwards compatibility)
 */
export { useAIConfig as useAIConfigActions };
