/**
 * UI State - Simple module-level state with React hooks
 * For local UI state that doesn't need server persistence
 */

import { useSyncExternalStore } from "react";

// ============================================================================
// State + Listeners pattern
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
// Screen / Routing
// ============================================================================

export type Screen =
	| "chat"
	| "logs"
	| "settings"
	| "provider-management"
	| "model-selection"
	| "command-palette"
	| "bash-list"
	| "bash-detail"
	| "mcp";

const screenState = createState<Screen>("chat");
export const setCurrentScreen = screenState.set;
export const getCurrentScreen = screenState.get;
export const useCurrentScreen = () => useStore(screenState);

// ============================================================================
// Loading / Error
// ============================================================================

const loadingState = createState(false);
export const setLoading = loadingState.set;
export const getIsLoading = loadingState.get;
export const useIsLoading = () => useStore(loadingState);

const errorState = createState<string | null>(null);
export const setError = errorState.set;
export const getError = errorState.get;
export const useUIError = () => useStore(errorState);

// ============================================================================
// Command Palette
// ============================================================================

const commandPaletteState = createState<string | null>(null);
export const setCommandPaletteCommand = commandPaletteState.set;
export const getCommandPaletteCommand = commandPaletteState.get;
export const useCommandPaletteCommand = () => useStore(commandPaletteState);

// ============================================================================
// Bash Selection
// ============================================================================

const selectedBashIdState = createState<string | null>(null);
export const setSelectedBashId = selectedBashIdState.set;
export const getSelectedBashId = selectedBashIdState.get;
export const useSelectedBashId = () => useStore(selectedBashIdState);

// ============================================================================
// Streaming State
// ============================================================================

const streamingState = createState(false);
export const setIsStreaming = streamingState.set;
export const getIsStreaming = streamingState.get;
export const useIsStreaming = () => useStore(streamingState);

const streamingExpectedState = createState(false);
export const setStreamingExpected = streamingExpectedState.set;
export const getStreamingExpected = streamingExpectedState.get;
export const useStreamingExpected = () => useStore(streamingExpectedState);

// ============================================================================
// Session Status (for StatusIndicator)
// ============================================================================

export interface SessionStatusState {
	isActive: boolean;
	text: string;
	duration: number;
	tokenUsage: number;
}

const sessionStatusState = createState<SessionStatusState | null>(null);
export const setSessionStatus = sessionStatusState.set;
export const getSessionStatus = sessionStatusState.get;
export const useSessionStatus = () => useStore(sessionStatusState);

// Helper to update status
export const updateSessionStatus = (partial: Partial<SessionStatusState>) => {
	const current = sessionStatusState.get() || { isActive: false, text: "", duration: 0, tokenUsage: 0 };
	sessionStatusState.set({ ...current, ...partial });
};

export const clearSessionStatus = () => sessionStatusState.set(null);

// ============================================================================
// Compacting State
// ============================================================================

const compactingState = createState(false);
export const setCompacting = compactingState.set;
export const getIsCompacting = compactingState.get;
export const useIsCompacting = () => useStore(compactingState);

const compactAbortControllerState = createState<AbortController | null>(null);
export const setCompactAbortController = compactAbortControllerState.set;
export const getCompactAbortController = compactAbortControllerState.get;

// ============================================================================
// Debug Logs
// ============================================================================

const debugLogsState = createState<string[]>([]);
export const addDebugLog = (log: string) => {
	const current = debugLogsState.get();
	debugLogsState.set([...current.slice(-99), log]);
};
export const clearDebugLogs = () => debugLogsState.set([]);
export const getDebugLogs = debugLogsState.get;
export const useDebugLogs = () => useStore(debugLogsState);

// ============================================================================
// Display Settings
// ============================================================================

const hideMessageTitlesState = createState(true); // Default: hide message titles for cleaner UI
export const setHideMessageTitles = hideMessageTitlesState.set;
export const getHideMessageTitles = hideMessageTitlesState.get;
export const useHideMessageTitles = () => useStore(hideMessageTitlesState);

const hideMessageUsageState = createState(false);
export const setHideMessageUsage = hideMessageUsageState.set;
export const getHideMessageUsage = hideMessageUsageState.get;
export const useHideMessageUsage = () => useStore(hideMessageUsageState);
