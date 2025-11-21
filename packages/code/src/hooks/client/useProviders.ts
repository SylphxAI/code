/**
 * useProviders Hook
 * Get all available AI providers from server using Zen signals
 */

import { useEffect } from "react";
import {
	useTRPCClient,
	useProviders as useProvidersSignal,
	useProvidersLoading,
	useProvidersError,
	setProviders as setProvidersSignal,
	setProvidersLoading as setProvidersLoadingSignal,
	setProvidersError as setProvidersErrorSignal,
	type Provider,
} from "@sylphx/code-client";

/**
 * Hook to fetch all available AI providers
 * Returns provider metadata (id, name) from server
 * Data stored in Zen signals for global access
 */
export function useProviders() {
	const trpc = useTRPCClient();
	const providers = useProvidersSignal();
	const loading = useProvidersLoading();
	const error = useProvidersError();

	useEffect(() => {
		let mounted = true;

		async function fetchProviders() {
			try {
				setProvidersLoadingSignal(true);
				setProvidersErrorSignal(null);
				const data = await trpc.config.getProviders.query();
				if (mounted) {
					setProvidersSignal(data);
				}
			} catch (err) {
				if (mounted) {
					setProvidersErrorSignal(err instanceof Error ? err.message : "Failed to load providers");
				}
			} finally {
				if (mounted) {
					setProvidersLoadingSignal(false);
				}
			}
		}

		fetchProviders();

		return () => {
			mounted = false;
		};
	}, [trpc]);

	return { providers, loading, error };
}
