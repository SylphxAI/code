/**
 * Providers Hook
 * Get all available AI providers from server
 *
 * @example
 * ```tsx
 * function ProviderSelector() {
 *   const { providers, loading, error } = useProviders();
 *   if (loading) return <Spinner />;
 *   return providers.map(p => <Option key={p.id}>{p.name}</Option>);
 * }
 * ```
 */

import { useLensClient, type Provider } from "@sylphx/code-client";

export function useProviders() {
	const client = useLensClient();

	const { data, loading, error, refetch } = client.getProviders({}) as {
		data: Provider[] | null;
		loading: boolean;
		error: Error | null;
		refetch: () => void;
	};

	return {
		providers: data ?? [],
		loading,
		error: error?.message ?? null,
		refetch,
	};
}
