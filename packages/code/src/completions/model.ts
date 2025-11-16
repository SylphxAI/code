/**
 * Model Completions
 * Fetches models from provider API for current provider
 */

import { getTRPCClient } from "@sylphx/code-client";
import { fetchModels } from "@sylphx/code-core";
import { get } from "@sylphx/zen";
import { $aiConfig, $currentSession, setAIConfig } from "@sylphx/code-client";
import type { AIConfig, ProviderId } from "@sylphx/code-core";

export interface CompletionOption {
	id: string;
	label: string;
	value: string;
}

/**
 * Get AI config with API keys for model fetching
 * ARCHITECTURE: Direct filesystem access (CLI only, not web)
 * - loadAIConfig() includes API keys (not sanitized)
 * - Used for server-side operations like fetching models
 * - DO NOT send this config to remote clients
 */
async function getAIConfigWithKeys(): Promise<AIConfig | null> {
	try {
		const { loadAIConfig } = await import("@sylphx/code-core");
		const result = await loadAIConfig();

		if (!result.success) {
			console.error("[completions] Failed to load AI config:", result.error);
			return null;
		}

		return result.data;
	} catch (error) {
		console.error("[completions] Failed to load AI config:", error);
		return null;
	}
}

/**
 * Get model completion options for current provider
 * Fetches models from provider API (not cached - models can change frequently)
 */
export async function getModelCompletions(partial = ""): Promise<CompletionOption[]> {
	try {
		// Load config with API keys (direct filesystem access)
		const config = await getAIConfigWithKeys();

		if (!config?.providers) {
			return [];
		}

		// Get current provider from session or config
		const currentSession = get($currentSession);
		const currentProviderId = currentSession?.provider || config.defaultProvider;

		if (!currentProviderId) {
			return [];
		}

		// Get provider config (already includes API key from loadAIConfig)
		const providerConfig = config.providers[currentProviderId];
		if (!providerConfig) {
			return [];
		}

		// Fetch models from provider API
		const models = await fetchModels(currentProviderId as ProviderId, providerConfig);

		// Filter by partial match
		const filtered = partial
			? models.filter((m) => m.name.toLowerCase().includes(partial.toLowerCase()))
			: models;

		return filtered.map((m) => ({
			id: m.id,
			label: m.name,
			value: m.id,
		}));
	} catch (error) {
		console.error("[completions] Failed to fetch models:", error);
		return [];
	}
}
