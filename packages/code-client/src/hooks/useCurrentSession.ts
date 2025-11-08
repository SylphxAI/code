/**
 * useCurrentSession Hook
 * Fetches current session data from server using tRPC React Query
 *
 * Pure UI Client Architecture:
 * - Store only has currentSessionId (UI state)
 * - This hook fetches session data from server (source of truth)
 * - React Query handles caching, refetching, loading states
 */

import { useEffect } from 'react';
import { useTRPCClient } from '../trpc-provider.js';
import { useSessionStore } from '../stores/session-store.js';

export function useCurrentSession() {
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const trpc = useTRPCClient();

  // Fetch session data when currentSessionId changes
  const { data: currentSession, isLoading, error, refetch } = trpc.session.getById.useQuery(
    { sessionId: currentSessionId! },
    {
      enabled: !!currentSessionId, // Only fetch if sessionId exists
      staleTime: 1000, // Consider data stale after 1 second
      refetchOnWindowFocus: false, // Don't refetch on window focus (single-client TUI)
    }
  );

  // Load session's enabled rules into settings store when session changes
  useEffect(() => {
    if (currentSession) {
      import('../stores/settings-store.js').then(({ useSettingsStore }) => {
        useSettingsStore.getState().setEnabledRuleIds(currentSession.enabledRuleIds || []);
      });
    }
  }, [currentSession]);

  return {
    currentSession,
    currentSessionId,
    isLoading,
    error,
    refetch,
  };
}
