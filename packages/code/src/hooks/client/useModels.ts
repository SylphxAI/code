/**
 * Models Hook
 * Fetch available models for a provider
 *
 * @example
 * ```tsx
 * function ModelSelector({ providerId }: { providerId: string | null }) {
 *   const { models, loading } = useModels(providerId);
 *   if (!providerId) return <Text>Select a provider first</Text>;
 *   if (loading) return <Spinner />;
 *   return models.map(m => <Option key={m.id}>{m.name}</Option>);
 * }
 * ```
 */

import { useLensClient, type ModelInfo } from "@sylphx/code-client";

export function useModels(providerId: string | null) {
	const client = useLensClient();

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
