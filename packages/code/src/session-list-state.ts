/**
 * Session List State - Local session list state with React hooks
 */

import type { SessionMetadata } from "@sylphx/code-core";
import { useSyncExternalStore } from "react";

type Listener = () => void;

function createState<T>(initial: T) {
	let value = initial;
	const listeners = new Set<Listener>();

	return {
		get: () => value,
		set: (newValue: T) => {
			value = newValue;
			listeners.forEach((l) => l());
		},
		subscribe: (listener: Listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

function useStore<T>(store: ReturnType<typeof createState<T>>): T {
	return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ============================================================================
// Recent Sessions State
// ============================================================================

const recentSessionsState = createState<SessionMetadata[]>([]);
export const setRecentSessions = recentSessionsState.set;
export const getRecentSessions = recentSessionsState.get;
export const useRecentSessions = () => useStore(recentSessionsState);

// ============================================================================
// Sessions Loading State
// ============================================================================

const sessionsLoadingState = createState<boolean>(false);
export const setSessionsLoading = sessionsLoadingState.set;
export const getSessionsLoading = sessionsLoadingState.get;
export const useSessionsLoading = () => useStore(sessionsLoadingState);

// ============================================================================
// Sessions Error State
// ============================================================================

const sessionsErrorState = createState<string | null>(null);
export const setSessionsError = sessionsErrorState.set;
export const getSessionsError = sessionsErrorState.get;
export const useSessionsError = () => useStore(sessionsErrorState);
