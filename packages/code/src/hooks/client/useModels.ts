/**
 * useModels Hook
 * Fetch available models for a provider using Zen signals
 */

import { useEffect } from "react";
import {
	useLensClient,
	useModelsByProvider,
	useModelsLoading,
	useModelsError,
	setModelsForProvider as setModelsForProviderSignal,
	setModelsLoading as setModelsLoadingSignal,
	setModelsError as setModelsErrorSignal,
	type ModelInfo,
} from "@sylphx/code-client";

/**
 * Hook to fetch models for a specific provider
 * Returns models list from server
 * Data stored in Zen signals for global access
 *
 * DESIGN: providerId is string (not hardcoded union) because:
 * - Server is source of truth for available providers
 * - Providers can be added dynamically
 * - Client shouldn't need updates when new providers are added
 */
export function useModels(providerId: string | null) {
	const client = useLensClient();
	const modelsByProvider = useModelsByProvider();
	const loading = useModelsLoading();
	const error = useModelsError();

	// Get models for this specific provider
	const models = providerId ? (modelsByProvider[providerId] || []) : [];

	useEffect(() => {
		if (!providerId) {
			return;
		}

		let mounted = true;

		async function fetchModels() {
			try {
				setModelsLoadingSignal(true);
				setModelsErrorSignal(null);
				// Lens flat namespace: client.fetchModels.fetch({ input })
				const result = await client.fetchModels.fetch({ input: { providerId } }) as { success: boolean; models: ModelInfo[]; error?: string };
				if (mounted) {
					if (result.success) {
						setModelsForProviderSignal(providerId, result.models);
					} else {
						setModelsErrorSignal(result.error);
					}
				}
			} catch (err) {
				if (mounted) {
					setModelsErrorSignal(err instanceof Error ? err.message : "Failed to load models");
				}
			} finally {
				if (mounted) {
					setModelsLoadingSignal(false);
				}
			}
		}

		fetchModels();

		return () => {
			mounted = false;
		};
	}, [client, providerId]);

	return { models, loading, error };
}
