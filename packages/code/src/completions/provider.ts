/**
 * Provider Completions
 * Lazy loading from zen signals, no extra cache needed
 */

import type { LensClient } from "@lens/client";
import { aiConfig, setAIConfig } from "@sylphx/code-client";
import type { AIConfig, ProviderId } from "@sylphx/code-core";

export interface CompletionOption {
	id: string;
	label: string;
	value: string;
}

/**
 * Get AI config from zen signals
 * First access: async load from server → cache in zen signal
 * Subsequent access: sync read from zen signal cache
 * Update: event-driven via setAIConfig()
 *
 * @param client - Lens client (passed from React hook useLensClient)
 */
async function _getAIConfig(client: LensClient<any, any>): Promise<AIConfig | null> {
	// Already in zen signal? Return cached (fast!)
	const currentConfig = aiConfig.value;
	if (currentConfig) {
		return currentConfig;
	}

	// First access - lazy load from server
	try {
		// Lens flat namespace: client.loadConfig()
		const result = await client.loadConfig({});

		if (result.success) {
			// Cache in zen signal (stays until explicitly updated)
			setAIConfig(result.config);
			return result.config;
		}

		return null;
	} catch (error) {
		console.error("[completions] Failed to load AI config:", error);
		return null;
	}
}

/**
 * Get provider completion options
 * Returns ALL available providers from the registry (not just configured ones)
 *
 * @param client - Lens client (passed from React hook useLensClient)
 * @param partial - Partial search string for filtering
 */
export async function getProviderCompletions(
	client: LensClient<any, any>,
	partial = "",
): Promise<CompletionOption[]> {
	try {
		// Lens flat namespace: client.getProviders()
		const result = await client.getProviders();

		const providers = Object.keys(result);
		const filtered = partial
			? providers.filter((id) => id.toLowerCase().includes(partial.toLowerCase()))
			: providers;

		return filtered.map((id) => ({
			id,
			label: id,
			value: id,
		}));
	} catch (error) {
		console.error("[completions] Failed to load providers:", error);
		return [];
	}
}

/**
 * Get action completion options (static)
 */
export function getActionCompletions(): CompletionOption[] {
	return [
		{ id: "use", label: "use", value: "use" },
		{ id: "configure", label: "configure", value: "configure" },
	];
}

/**
 * Get subaction completion options for configure command (static)
 */
export function getSubactionCompletions(): CompletionOption[] {
	return [
		{ id: "set", label: "set", value: "set" },
		{ id: "get", label: "get", value: "get" },
		{ id: "show", label: "show", value: "show" },
	];
}

/**
 * Get provider configuration key completions
 * Dynamically fetches schema from provider
 *
 * @param client - Lens client (passed from React hook useLensClient)
 * @param providerId - Provider ID to get schema for
 */
export async function getProviderKeyCompletions(
	client: LensClient<any, any>,
	providerId: ProviderId,
): Promise<CompletionOption[]> {
	try {
		// Lens flat namespace: client.getProviderSchema()
		const result = await client.getProviderSchema({ providerId });

		if (!result.success || !result.schema) {
			return [];
		}

		// Return all config field keys
		return result.schema.map((field: any) => ({
			id: field.key,
			label: field.key,
			value: field.key,
		}));
	} catch (error) {
		console.error("[completions] Failed to load provider schema:", error);
		return [];
	}
}
