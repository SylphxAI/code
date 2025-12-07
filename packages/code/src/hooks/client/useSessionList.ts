/**
 * Session List Hook
 * Provides reactive session list with loading/error states using local state
 */

import type { SessionMetadata } from "@sylphx/code-core";
import { useCallback } from "react";
import { useLensClient } from "@sylphx/code-client";
import {
	useRecentSessions,
	useSessionsLoading,
	useSessionsError,
	setRecentSessions as setRecentSessionsSignal,
	setSessionsLoading as setSessionsLoadingSignal,
	setSessionsError as setSessionsErrorSignal,
} from "../../session-list-state.js";

export interface UseSessionListReturn {
	sessions: SessionMetadata[];
	loading: boolean;
	error: string | null;
	loadSessions: (limit?: number) => Promise<void>;
}

/**
 * Hook for managing session list
 * Data stored in local state for global access
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
	const client = useLensClient();
	const sessions = useRecentSessions();
	const loading = useSessionsLoading();
	const error = useSessionsError();

	const loadSessions = useCallback(async (limit: number = 100) => {
		setSessionsLoadingSignal(true);
		setSessionsErrorSignal(null);
		try {
			// Use lens client to fetch sessions
			const result = await client.listSessions.fetch({ input: { limit } }) as SessionMetadata[];
			setRecentSessionsSignal(result || []);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to load sessions";
			setSessionsErrorSignal(errorMessage);
			setRecentSessionsSignal([]);
		} finally {
			setSessionsLoadingSignal(false);
		}
	}, [client]);

	return {
		sessions,
		loading,
		error,
		loadSessions,
	};
}
