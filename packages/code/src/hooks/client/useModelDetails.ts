/**
 * useModelDetails Hook
 * Get model details including context length, capabilities, and tokenizer info
 * State stored in local state for global caching
 *
 * ARCHITECTURE: lens-react v5 API
 * - client.xxx.useQuery({ input }) → React hook { data, loading, error, refetch }
 */

import { useEffect } from "react";
import { useLensClient } from "@sylphx/code-client";
import {
	useModelDetailsCache,
	useModelDetailsLoading,
	useModelDetailsError,
	setModelDetails as setModelDetailsSignal,
	setModelDetailsLoading as setModelDetailsLoadingSignal,
	setModelDetailsError as setModelDetailsErrorSignal,
	type ModelDetails,
} from "../../model-details-state.js";

export type { ModelDetails };

/**
 * Hook to fetch model details from server
 * Returns context length and tokenizer information
 *
 * DESIGN: providerId is string (not hardcoded union) because:
 * - Server is source of truth for available providers
 * - Providers can be added dynamically
 * - Client shouldn't need updates when new providers are added
 */
export function useModelDetails(providerId: string | null, modelId: string | null) {
	const client = useLensClient();
	const detailsCache = useModelDetailsCache();
	const loading = useModelDetailsLoading();
	const error = useModelDetailsError();

	// Get cached details for this model
	const cacheKey = providerId && modelId ? `${providerId}:${modelId}` : null;
	const details = cacheKey ? detailsCache[cacheKey] : null;

	// Skip queries if already cached or missing params
	const skipQueries = !providerId || !modelId || (cacheKey != null && detailsCache[cacheKey] != null);

	// Query hooks - reactive data fetching
	const modelDetailsQuery = client.getModelDetails.useQuery({
		input: { providerId: providerId || "", modelId: modelId || "" },
		skip: skipQueries,
	});

	const tokenizerQuery = client.getTokenizerInfo.useQuery({
		input: { model: modelId || "" },
		skip: skipQueries,
	});

	// Sync loading state
	useEffect(() => {
		if (!providerId || !modelId) {
			setModelDetailsLoadingSignal(false);
			setModelDetailsErrorSignal(null);
			return;
		}
		setModelDetailsLoadingSignal(modelDetailsQuery.loading || tokenizerQuery.loading);
	}, [providerId, modelId, modelDetailsQuery.loading, tokenizerQuery.loading]);

	// Sync error state
	useEffect(() => {
		const err = modelDetailsQuery.error || tokenizerQuery.error;
		if (err) {
			setModelDetailsErrorSignal(err.message || "Failed to load model details");
		} else {
			setModelDetailsErrorSignal(null);
		}
	}, [modelDetailsQuery.error, tokenizerQuery.error]);

	// Cache results when both queries complete
	useEffect(() => {
		if (!providerId || !modelId) return;
		if (cacheKey && detailsCache[cacheKey]) return; // Already cached

		if (modelDetailsQuery.data && tokenizerQuery.data) {
			const detailsResult = modelDetailsQuery.data as {
				success: boolean;
				details?: { contextLength?: number; capabilities?: Record<string, boolean> };
			};
			const tokInfo = tokenizerQuery.data as {
				name: string;
				modelId: string;
				source: string;
			};

			const contextLength =
				detailsResult.success && detailsResult.details
					? detailsResult.details.contextLength || null
					: null;

			const capabilities =
				detailsResult.success && detailsResult.details
					? detailsResult.details.capabilities || null
					: null;

			const modelDetails: ModelDetails = {
				contextLength,
				capabilities,
				tokenizerInfo: tokInfo,
			};

			setModelDetailsSignal(providerId, modelId, modelDetails);
		}
	}, [providerId, modelId, cacheKey, detailsCache, modelDetailsQuery.data, tokenizerQuery.data]);

	return {
		details: details || { contextLength: null, capabilities: null, tokenizerInfo: null },
		loading,
		error,
	};
}
