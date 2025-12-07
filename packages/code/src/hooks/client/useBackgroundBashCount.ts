/**
 * Hook to track background bash count
 *
 * ============================================================================
 * LENS-REACT DATA TRANSFORMATION PATTERN
 * ============================================================================
 *
 * 當你需要 transform query result:
 *
 * ```tsx
 * const { data: processes } = client.listBash({});
 *
 * // Derive values directly from query data
 * const bgCount = processes?.filter(p => p.status === "running").length ?? 0;
 * ```
 *
 * 唔需要:
 * - 額外 state 去 store derived values
 * - useEffect 去 sync derived values
 * - useMemo (除非計算好重)
 *
 * lens-react hook 已經係 reactive，derive 嘅 values 會自動更新！
 *
 * ============================================================================
 */

import { useLensClient } from "@sylphx/code-client";

interface BashProcess {
	isActive?: boolean;
	status?: string;
}

/**
 * Hook to get count of background bash processes
 *
 * @returns Number of background bash processes currently running
 *
 * @example
 * ```tsx
 * function StatusBar() {
 *   const bgCount = useBackgroundBashCount();
 *
 *   return (
 *     <Box>
 *       {bgCount > 0 && <Text>🔄 {bgCount} background tasks</Text>}
 *     </Box>
 *   );
 * }
 * ```
 */
export function useBackgroundBashCount(): number {
	const client = useLensClient();

	// lens-react hook: auto-subscribes to bash process list
	const { data: processes } = client.listBash({}) as {
		data: BashProcess[] | null;
		loading: boolean;
		error: Error | null;
	};

	// Derive count directly - simple calculation, no useMemo needed
	return processes?.filter((p) => !p.isActive && p.status === "running").length ?? 0;
}
