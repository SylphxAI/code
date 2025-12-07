/**
 * useProviders Hook
 * Get all available AI providers from server
 *
 * ============================================================================
 * LENS-REACT HOOK PATTERN (正確用法)
 * ============================================================================
 *
 * lens-react 提供兩種 API:
 *
 * 1. HOOK PATTERN (React components 入面用)
 *    ```tsx
 *    const { data, loading, error, refetch } = client.getProviders({})
 *    ```
 *    - 自動 subscribe to updates (reactive)
 *    - 自動 handle loading/error state
 *    - Component unmount 自動 cleanup
 *    - Input 改變自動 re-fetch
 *
 * 2. FETCH PATTERN (SSR / actions / commands 入面用)
 *    ```tsx
 *    const result = await client.getProviders.fetch({})
 *    ```
 *    - Promise-based, one-shot
 *    - 用喺 non-React context (commands, utilities)
 *    - 用喺 actions (save, delete, etc.)
 *
 * ============================================================================
 * 點解唔用 useEffect + fetch?
 * ============================================================================
 *
 * ❌ WRONG (手動管理 state):
 * ```tsx
 * useEffect(() => {
 *   let mounted = true;
 *   async function load() {
 *     setLoading(true);
 *     const data = await client.xxx.fetch({});
 *     if (mounted) setData(data);
 *     setLoading(false);
 *   }
 *   load();
 *   return () => { mounted = false; };
 * }, []);
 * ```
 *
 * ✅ CORRECT (lens-react hook):
 * ```tsx
 * const { data, loading, error } = client.xxx({});
 * ```
 *
 * lens-react hook 已經處理:
 * - Loading state
 * - Error state
 * - Mounted check
 * - Cleanup on unmount
 * - Re-fetch on input change
 * - Subscription to live updates
 *
 * ============================================================================
 */

import { useLensClient, type Provider } from "@sylphx/code-client";

/**
 * Hook to fetch all available AI providers
 *
 * @example
 * ```tsx
 * function ProviderSelector() {
 *   const { providers, loading, error } = useProviders();
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <select>
 *       {providers.map(p => <option key={p.id}>{p.name}</option>)}
 *     </select>
 *   );
 * }
 * ```
 */
export function useProviders() {
	const client = useLensClient();

	// lens-react hook pattern: client.xxx({}) returns { data, loading, error, refetch }
	// - Automatically subscribes to updates
	// - Automatically handles loading/error state
	// - Automatically cleans up on unmount
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
