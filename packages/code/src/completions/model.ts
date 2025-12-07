/**
 * Model Completions
 * Fetches models from provider API for current provider
 */

import type { LensClient } from "@lens/client";
import { aiConfig, currentSession } from "@sylphx/code-client";

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
	client: LensClient<any, any>,
	partial = "",
): Promise<CompletionOption[]> {
	try {

		// Get current provider from session or config
		const currentSessionValue = currentSession.value;
		const config = aiConfig.value;
		const currentProviderId = currentSessionValue?.provider || config?.defaultProvider;

		if (!currentProviderId) {
			return [];
		}

		// Lens flat namespace: client.fetchModels.fetch({ input })
		const result = await client.fetchModels.fetch({ input: { providerId: currentProviderId } }) as { success: boolean; models: any[]; error?: string };

		if (!result.success) {
			console.error("[completions] Failed to fetch models:", result.error);
			return [];
		}

		// Filter by partial match
		const filtered = partial
			? result.models.filter((m: any) => m.name.toLowerCase().includes(partial.toLowerCase()))
			: result.models;

		return filtered.map((m: any) => ({
			id: m.id,
			label: m.name,
			value: m.id,
		}));
	} catch (error) {
		console.error("[completions] Failed to fetch models:", error);
		return [];
	}
}
