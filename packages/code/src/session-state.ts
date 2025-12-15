/**
 * Session State - Local session tracking
 *
 * This tracks which session is currently selected.
 * Actual session data comes from lens-react queries.
 */

import { useSyncExternalStore } from "react";
import type { Session } from "@sylphx/code-core";

// ============================================================================
// State pattern
// ============================================================================

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
// Current Session ID (the selected session)
// ============================================================================

const currentSessionIdState = createState<string | null>(null);
export const setCurrentSessionId = currentSessionIdState.set;
export const getCurrentSessionId = currentSessionIdState.get;
export const useCurrentSessionId = () => useStore(currentSessionIdState);

// ============================================================================
// Current Session (cached session object - updated by lens queries)
// ============================================================================

const currentSessionState = createState<Session | null>(null);
export const setCurrentSession = currentSessionState.set;
export const getCurrentSession = currentSessionState.get;
export const useCurrentSessionState = () => useStore(currentSessionState);

// Helper to update both
export const updateCurrentSession = (session: Session | null) => {
	currentSessionState.set(session);
	if (session) {
		currentSessionIdState.set(session.id);
	}
};

// ============================================================================
// Selected Provider / Model (user's current selection)
// ============================================================================

const selectedProviderState = createState<string | null>(null);
export const setSelectedProvider = selectedProviderState.set;
export const getSelectedProvider = selectedProviderState.get;
export const useSelectedProvider = () => useStore(selectedProviderState);

const selectedModelState = createState<string | null>(null);
export const setSelectedModel = selectedModelState.set;
export const getSelectedModel = selectedModelState.get;
export const useSelectedModel = () => useStore(selectedModelState);

// ============================================================================
// Selected Agent
// ============================================================================

const selectedAgentIdState = createState<string | null>(null);
export const setSelectedAgentId = selectedAgentIdState.set;
export const getSelectedAgentId = selectedAgentIdState.get;
export const useSelectedAgentId = () => useStore(selectedAgentIdState);

// ============================================================================
// Enabled Rules
// ============================================================================

const enabledRuleIdsState = createState<string[]>([]);
export const setEnabledRuleIds = enabledRuleIdsState.set;
export const getEnabledRuleIds = enabledRuleIdsState.get;
export const useEnabledRuleIds = () => useStore(enabledRuleIdsState);

// ============================================================================
// Session Status (live streaming status from event stream)
// ============================================================================

export interface SessionStatus {
	text: string;
	/** Timestamp when streaming started (client calculates duration locally) */
	startTime: number;
	tokenUsage: number;
	isActive: boolean;
}

const sessionStatusState = createState<SessionStatus | null>(null);
export const setSessionStatus = sessionStatusState.set;
export const getSessionStatus = sessionStatusState.get;
export const useSessionStatus = () => useStore(sessionStatusState);
