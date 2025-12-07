/**
 * Session Initialization Hook
 * Creates a new session on mount if none exists
 *
 * DESIGN: Falls back to provider-specific default-model when top-level defaultModel is missing
 * This handles configs where only defaultProvider is set (common after initial setup)
 *
 * ARCHITECTURE: lens-react hooks pattern
 * - Queries: client.queryName({ input, skip }) → { data, loading, error, refetch }
 */

import type { AIConfig } from "@sylphx/code-core";
import { useEffect, useState } from "react";
import { useLensClient } from "@sylphx/code-client";

interface UseSessionInitializationProps {
	currentSessionId: string | null;
	aiConfig: AIConfig | null;
	createSession: (provider: string, model: string) => Promise<string>;
}

export function useSessionInitialization({
	currentSessionId,
	aiConfig,
	createSession,
}: UseSessionInitializationProps) {
	const client = useLensClient();
	const [initialized, setInitialized] = useState(false);

	// Get provider's default model (last used)
	const providerConfig = aiConfig?.defaultProvider
		? aiConfig.providers?.[aiConfig.defaultProvider]
		: null;
	const defaultModel = providerConfig?.defaultModel as string | undefined;

	// Query for models if no default model set
	const needsModels = !initialized && !currentSessionId && aiConfig?.defaultProvider && !defaultModel;
	const modelsQuery = client.fetchModels({
		input: { providerId: aiConfig?.defaultProvider || "" },
		skip: !needsModels,
	});

	// Effect: Initialize session when we have a model
	useEffect(() => {
		if (initialized || currentSessionId || !aiConfig?.defaultProvider) {
			return;
		}

		// Determine model to use
		let model = defaultModel;

		// If no default model, get from query
		if (!model && modelsQuery.data) {
			const result = modelsQuery.data as { success: boolean; models?: Array<{ id: string }> };
			if (result.success && result.models && result.models.length > 0) {
				const firstModel = result.models[0];
				if (firstModel) {
					model = firstModel.id;
				}
			}
		}

		if (model) {
			// Always create a new session on app start
			// Old sessions are loaded and available in the store but not auto-selected
			createSession(aiConfig.defaultProvider, model).then(() => {
				setInitialized(true);
			}).catch(err => {
				console.error("Failed to create session:", err);
			});
		}
	}, [initialized, currentSessionId, aiConfig, defaultModel, modelsQuery.data, createSession]);
}
