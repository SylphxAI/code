/**
 * Model Completions
 * Fetches models from provider API for current provider
 */

import type { CodeClient } from "@sylphx/code-client";
import { getAIConfig } from "../ai-config-state.js";
import { getCurrentSession } from "../session-state.js";

export interface CompletionOption {
	id: string;
	label: string;
	value: string;
}

/**
 * Get model completion options for current provider
 * ARCHITECTURE: Uses Lens endpoint (server-side fetches models)
 * - Client = Pure UI
 * - Server = Business logic + File access
 * - Works for both CLI and Web GUI
 *
 * @param client - Lens client (passed from React hook useLensClient)
 * @param partial - Partial search string for filtering
 */
export async function getModelCompletions(
	client: CodeClient,
	partial = "",
): Promise<CompletionOption[]> {
	try {

		// Get current provider from session or config
		const currentSessionValue = getCurrentSession();
		const config = getAIConfig();
		const currentProviderId = currentSessionValue?.provider || config?.defaultProvider;

		if (!currentProviderId) {
			return [];
		}

		// Lens flat namespace: client.fetchModels.fetch({ input })
		const result = await client.fetchModels.fetch({ input: { providerId: currentProviderId } });

		if (!result.success) {
			console.error("[completions] Failed to fetch models:", result.error);
			return [];
		}

		// Filter by partial match
		const models = result.models || [];
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
