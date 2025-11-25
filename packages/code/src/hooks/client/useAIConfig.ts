/**
 * AI Config Hook
 * Load and save AI configuration via Lens (backend handles file system)
 */

import type { AIConfig } from "@sylphx/code-core";
import { useCallback } from "react";
import { setAIConfig, setError, setLoading, useLensClient } from "@sylphx/code-client";

export function useAIConfig() {
	const client = useLensClient();

	const loadConfig = useCallback(async () => {
		setLoading(true);
		try {
			// Lens flat namespace: client.loadConfig()
			const result = await client.loadConfig();

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
		} finally {
			setLoading(false);
		}
	}, [client]);

	const saveConfig = useCallback(
		async (config: AIConfig) => {
			setLoading(true);
			try {
				// Lens flat namespace: client.saveConfig()
				const result = await client.saveConfig({ config });

				if (result.success) {
					setAIConfig(config);
					return true;
				}
				setError(result.error || "Failed to save AI config");
				return false;
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to save AI config");
				return false;
			} finally {
				setLoading(false);
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
