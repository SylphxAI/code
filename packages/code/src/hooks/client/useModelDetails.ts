/**
 * useModelDetails Hook
 * Get model details including context length, capabilities, and tokenizer info
 * State stored in Zen signals for global caching
 */

import { useEffect } from "react";
import {
	useTRPCClient,
	useModelDetailsCache,
	useModelDetailsLoading,
	useModelDetailsError,
	setModelDetails as setModelDetailsSignal,
	setModelDetailsLoading as setModelDetailsLoadingSignal,
	setModelDetailsError as setModelDetailsErrorSignal,
	type ModelDetails,
} from "@sylphx/code-client";

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
	const trpc = useTRPCClient();
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

				// Fetch model details and tokenizer info in parallel
				const [detailsResult, tokInfo] = await Promise.all([
					trpc.config.getModelDetails.query({ providerId, modelId }),
					trpc.config.getTokenizerInfo.query({ model: modelId }),
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

					const modelDetails = {
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
	}, [trpc, providerId, modelId, cacheKey, detailsCache]);

	return {
		details: details || { contextLength: null, capabilities: null, tokenizerInfo: null },
		loading,
		error,
	};
}
