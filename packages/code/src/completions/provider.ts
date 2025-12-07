/**
 * Provider Completions
 * Lazy loading from local state, no extra cache needed
 *
 * ARCHITECTURE: lens-react v5 API
 * ===============================
 * - await client.xxx({ input }) → Vanilla JS Promise (this file)
 * - client.xxx.useQuery({ input }) → React hook (components)
 */

import type { CodeClient } from "@sylphx/code-client";
import { getAIConfig, setAIConfig } from "../ai-config-state.js";
import type { AIConfig, ProviderId } from "@sylphx/code-core";

export interface CompletionOption {
	id: string;
	label: string;
	value: string;
}

/**
 * Get AI config from local state
 * First access: async load from server → cache in local state
 * Subsequent access: sync read from local state cache
 * Update: event-driven via setAIConfig()
 *
 * @param client - Lens client for vanilla API calls
 */
async function _getAIConfig(client: CodeClient): Promise<AIConfig | null> {
	// Already in local state? Return cached (fast!)
	const currentConfig = getAIConfig();
	if (currentConfig) {
		return currentConfig;
	}

	// First access - lazy load from server
	try {
		// Use vanilla client call
		const result = await client.loadConfig({}) as { success: boolean; config?: AIConfig };

		if (result.success && result.config) {
			// Cache in local state (stays until explicitly updated)
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
 * @param client - Lens client for vanilla API calls
 * @param partial - Partial search string for filtering
 */
export async function getProviderCompletions(
	client: CodeClient,
	partial = "",
): Promise<CompletionOption[]> {
	try {
		// Use vanilla client call
		const result = await client.getProviders({ input: {} });

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
 * @param client - Lens client for vanilla API calls
 * @param providerId - Provider ID to get schema for
 */
export async function getProviderKeyCompletions(
	client: CodeClient,
	providerId: ProviderId,
): Promise<CompletionOption[]> {
	try {
		// Use vanilla client call
		const result = await client.getProviderSchema({ input: { providerId } }) as {
			success: boolean;
			schema?: Array<{ key: string }>;
		};

		if (!result.success || !result.schema) {
			return [];
		}

		// Return all config field keys
		return result.schema.map((field) => ({
			id: field.key,
			label: field.key,
			value: field.key,
		}));
	} catch (error) {
		console.error("[completions] Failed to load provider schema:", error);
		return [];
	}
}
