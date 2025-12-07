/**
 * Session List Hook
 * Provides reactive session list with loading/error states using lens-react
 *
 * ARCHITECTURE: lens-react v5 API
 * - client.xxx.useQuery({ input }) → React hook { data, loading, error, refetch }
 */

import type { SessionMetadata } from "@sylphx/code-core";
import { useCallback, useEffect, useRef } from "react";
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
	const limitRef = useRef(100);

	// Query hook - reactive data fetching
	const sessionsQuery = client.listSessions.useQuery({
		input: { limit: limitRef.current },
	});

	// Sync query state to global signals
	useEffect(() => {
		setSessionsLoadingSignal(sessionsQuery.loading);
	}, [sessionsQuery.loading]);

	useEffect(() => {
		if (sessionsQuery.error) {
			const errorMessage = sessionsQuery.error.message || "Failed to load sessions";
			setSessionsErrorSignal(errorMessage);
		} else {
			setSessionsErrorSignal(null);
		}
	}, [sessionsQuery.error]);

	useEffect(() => {
		if (sessionsQuery.data) {
			setRecentSessionsSignal((sessionsQuery.data as unknown as SessionMetadata[]) || []);
		}
	}, [sessionsQuery.data]);

	// Imperative load (just triggers refetch)
	const loadSessions = useCallback(async (limit: number = 100) => {
		limitRef.current = limit;
		sessionsQuery.refetch();
	}, [sessionsQuery]);

	return {
		sessions,
		loading,
		error,
		loadSessions,
	};
}
