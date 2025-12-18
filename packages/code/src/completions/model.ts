/**
 * Model Completions
 * Fetches models from provider API for current provider
 *
 * ARCHITECTURE: lens-react v5 API
 * ===============================
 * - await client.xxx({ input }) → Vanilla JS Promise (this file)
 * - client.xxx.useQuery({ input }) → React hook (components)
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
 * Uses vanilla client call for Lens endpoint (server-side fetches models)
 *
 * @param client - Lens client for vanilla API calls
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

		// Use vanilla client call
		const result = await client.fetchModels({ args: { providerId: currentProviderId } }) as {
			success: boolean;
			error?: string;
			models?: Array<{ id: string; name: string }>;
		};

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
