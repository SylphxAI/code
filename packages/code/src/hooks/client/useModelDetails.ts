/**
 * useModelDetails Hook
 * Get model details including context length, capabilities, and tokenizer info
 * State stored in local state for global caching
 *
 * ARCHITECTURE: Promise-based API using client.xxx.fetch({ input })
 */

import { useEffect } from "react";
import { getClient } from "@sylphx/code-client";
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
	const detailsCache = useModelDetailsCache();
	const loading = useModelDetailsLoading();
	const error = useModelDetailsError();

	// Get cached details for this model
	const cacheKey = providerId && modelId ? `${providerId}:${modelId}` : null;
	const details = cacheKey ? detailsCache[cacheKey] : null;

	useEffect(() => {
		if (!providerId || !modelId) {
			setModelDetailsLoadingSignal(false);
			setModelDetailsErrorSignal(null);
			return;
		}

		// Skip if already cached
		if (cacheKey && detailsCache[cacheKey]) {
			setModelDetailsLoadingSignal(false);
			return;
		}

		let mounted = true;

		async function fetchDetails() {
			try {
				setModelDetailsLoadingSignal(true);
				setModelDetailsErrorSignal(null);

				const client = getClient();

				// Fetch model details and tokenizer info in parallel
				// Lens flat namespace: client.xxx.fetch({ input })
				// providerId and modelId are guaranteed non-null here due to early return check
				const [detailsResult, tokInfo] = await Promise.all([
					client.getModelDetails.fetch({ input: { providerId: providerId!, modelId: modelId! } }) as Promise<{
						success: boolean;
						details?: { contextLength?: number; capabilities?: Record<string, boolean> };
					}>,
					client.getTokenizerInfo.fetch({ input: { model: modelId! } }) as Promise<{
						name: string;
						modelId: string;
						source: string;
					}>,
				]);

				if (mounted) {
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

					// Cache the result
					if (providerId && modelId) {
						setModelDetailsSignal(providerId, modelId, modelDetails);
					}
				}
			} catch (err) {
				if (mounted) {
					setModelDetailsErrorSignal(
						err instanceof Error ? err.message : "Failed to load model details"
					);
				}
			} finally {
				if (mounted) {
					setModelDetailsLoadingSignal(false);
				}
			}
		}

		fetchDetails();

		return () => {
			mounted = false;
		};
	}, [providerId, modelId, cacheKey, detailsCache]);

	return {
		details: details || { contextLength: null, capabilities: null, tokenizerInfo: null },
		loading,
		error,
	};
}
