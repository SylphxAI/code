/**
 * Session List Hook
 * Provides reactive session list with loading/error states using Zen signals
 */

import type { SessionMetadata } from "@sylphx/code-core";
import { useCallback } from "react";
import {
	getRecentSessions,
	useRecentSessions,
	useSessionsLoading,
	useSessionsError,
	setRecentSessions as setRecentSessionsSignal,
	setSessionsLoading as setSessionsLoadingSignal,
	setSessionsError as setSessionsErrorSignal,
} from "@sylphx/code-client";

export interface UseSessionListReturn {
	sessions: SessionMetadata[];
	loading: boolean;
	error: string | null;
	loadSessions: (limit?: number) => Promise<void>;
}

/**
 * Hook for managing session list
 * Data stored in Zen signals for global access
 *
 * @returns Session list with loading/error states and refresh function
 *
 * @example
 * ```tsx
 * const { sessions, loading, loadSessions } = useSessionList();
 *
 * useEffect(() => {
 *   loadSessions(100);
 * }, []);
 * ```
 */
export function useSessionList(): UseSessionListReturn {
	const sessions = useRecentSessions();
	const loading = useSessionsLoading();
	const error = useSessionsError();

	const loadSessions = useCallback(async (limit: number = 100) => {
		setSessionsLoadingSignal(true);
		setSessionsErrorSignal(null);
		try {
			const result = await getRecentSessions(limit);
			setRecentSessionsSignal(result);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to load sessions";
			setSessionsErrorSignal(errorMessage);
			setRecentSessionsSignal([]);
		} finally {
			setSessionsLoadingSignal(false);
		}
	}, []);

	return {
		sessions,
		loading,
		error,
		loadSessions,
	};
}
