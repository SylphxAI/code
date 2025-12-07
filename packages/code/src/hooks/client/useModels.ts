/**
 * useModels Hook
 * Fetch available models for a provider
 *
 * ============================================================================
 * LENS-REACT CONDITIONAL QUERY PATTERN
 * ============================================================================
 *
 * 當 query 需要 conditional execution (有時要 skip):
 *
 * ```tsx
 * const { data, loading } = client.fetchModels({
 *   input: { providerId },
 *   skip: !providerId,  // Skip when no provider selected
 * });
 * ```
 *
 * skip: true 會:
 * - 唔發 request
 * - Return { data: null, loading: false, error: null }
 * - 當 skip 變 false 會自動 fetch
 *
 * ============================================================================
 * INPUT 改變自動 RE-FETCH
 * ============================================================================
 *
 * lens-react hook 會 track input 改變:
 *
 * ```tsx
 * // providerId 改變 → 自動 re-fetch
 * const { data } = client.fetchModels({ input: { providerId } });
 * ```
 *
 * 唔需要手動 useEffect 去 watch providerId 改變！
 *
 * ============================================================================
 */

import { useLensClient, type ModelInfo } from "@sylphx/code-client";

/**
 * Hook to fetch models for a specific provider
 *
 * DESIGN: providerId is string (not hardcoded union) because:
 * - Server is source of truth for available providers
 * - Providers can be added dynamically
 * - Client shouldn't need updates when new providers are added
 *
 * @param providerId - Provider ID to fetch models for (null = skip query)
 *
 * @example
 * ```tsx
 * function ModelSelector({ providerId }: { providerId: string | null }) {
 *   const { models, loading, error } = useModels(providerId);
 *
 *   if (!providerId) return <Text>Select a provider first</Text>;
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *
 *   return (
 *     <select>
 *       {models.map(m => <option key={m.id}>{m.name}</option>)}
 *     </select>
 *   );
 * }
 * ```
 */
export function useModels(providerId: string | null) {
	const client = useLensClient();

	// lens-react hook with conditional execution:
	// - skip: true → don't fetch, return null
	// - skip: false → fetch and subscribe to updates
	// - providerId changes → automatically re-fetch
	const { data, loading, error, refetch } = client.fetchModels({
		input: { providerId: providerId ?? "" },
		skip: !providerId, // Skip when no provider selected
	}) as {
		data: { success: boolean; models: ModelInfo[]; error?: string } | null;
		loading: boolean;
		error: Error | null;
		refetch: () => void;
	};

	return {
		models: data?.success ? data.models : [],
		loading,
		error: data?.error ?? error?.message ?? null,
		refetch,
	};
}
