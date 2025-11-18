/**
 * Model Completions
 * Fetches models from provider API for current provider
 */

import { aiConfig, currentSession, getTRPCClient } from "@sylphx/code-client";

export interface CompletionOption {
	id: string;
	label: string;
	value: string;
}

/**
 * Get model completion options for current provider
 * ARCHITECTURE: Uses tRPC endpoint (server-side fetches models)
 * - Client = Pure UI
 * - Server = Business logic + File access
 * - Works for both CLI and Web GUI
 */
export async function getModelCompletions(partial = ""): Promise<CompletionOption[]> {
	try {
		const trpc = getTRPCClient();

		// Get current provider from session or config
		const currentSessionValue = currentSession.value;
		const config = aiConfig.value;
		const currentProviderId = currentSessionValue?.provider || config?.defaultProvider;

		if (!currentProviderId) {
			return [];
		}

		// Fetch models from server (server loads config with API keys)
		const result = await trpc.config.fetchModels.query({
			providerId: currentProviderId,
		});

		if (!result.success) {
			console.error("[completions] Failed to fetch models:", result.error);
			return [];
		}

		// Filter by partial match
		const filtered = partial
			? result.models.filter((m) => m.name.toLowerCase().includes(partial.toLowerCase()))
			: result.models;

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
