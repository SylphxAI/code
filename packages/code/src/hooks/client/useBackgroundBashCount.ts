/**
 * Hook to track background bash count
 *
 * @example
 * ```tsx
 * const bgCount = useBackgroundBashCount();
 * if (bgCount > 0) return <Text>🔄 {bgCount} background tasks</Text>;
 * ```
 */

import { useLensClient } from "@sylphx/code-client";

interface BashProcess {
	isActive?: boolean;
	status?: string;
}

export function useBackgroundBashCount(): number {
	const client = useLensClient();

	const { data: processes } = client.listBash({}) as {
		data: BashProcess[] | null;
		loading: boolean;
		error: Error | null;
	};

	return processes?.filter((p) => !p.isActive && p.status === "running").length ?? 0;
}
