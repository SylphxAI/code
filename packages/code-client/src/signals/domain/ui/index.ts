/**
 * UI Domain Signals
 * Manages UI state across the application
 */

import { zen, computed } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

export type Screen = "chat" | "settings" | "provider" | "help";

// Core UI signals
export const currentScreen = zen<Screen>("chat");
export const previousScreen = zen<Screen | null>(null);
export const isLoading = zen(false);
export const error = zen<string | null>(null);
export const debugLogs = zen<string[]>([]);

// Compacting state (for /compact command)
export const isCompacting = zen(false);
export const compactAbortController = zen<AbortController | null>(null);

// Computed signals
export const canGoBack = computed(
	() => currentScreen.value !== "chat" && previousScreen.value !== null,
);

export const showNavigation = computed(() =>
	["chat", "settings"].includes(currentScreen.value),
);

// Actions
export const navigateTo = (screen: Screen) => {
	const current = currentScreen.value;
	previousScreen.value = current;
	currentScreen.value = screen;
};

export const goBack = () => {
	const previous = previousScreen.value;
	if (previous) {
		navigateTo(previous);
	}
};

export const setCurrentScreen = (screen: Screen) => {
	currentScreen.value = screen;
};

export const setIsLoading = (loading: boolean) => {
	isLoading.value = loading;
};

export const setError = (err: string | null) => {
	error.value = err;
};

export const setCompacting = (compacting: boolean) => {
	isCompacting.value = compacting;
	if (!compacting) {
		// Clear abort controller when done
		compactAbortController.value = null;
	}
};

export const updateCompactAbortController = (controller: AbortController | null) => {
	compactAbortController.value = controller;
};

export const abortCompact = () => {
	const controller = compactAbortController.value;
	if (controller) {
		controller.abort();
		setCompacting(false);
	}
};

export const addDebugLog = (message: string) => {
	const timestamp = new Date().toLocaleTimeString();
	const logs = debugLogs.value || [];
	const newLogs = [...logs, `[${timestamp}] ${message}`];

	// Keep only last 500 logs
	const MAX_LOGS = 1000;
	if (newLogs.length > MAX_LOGS) {
		newLogs.splice(0, newLogs.length - MAX_LOGS / 2);
	}

	debugLogs.value = newLogs;
};

export const clearDebugLogs = () => {
	debugLogs.value = [];
};

// Backwards compatibility aliases
export const setLoading = setIsLoading;
export const setUIError = setError;
export const setPreviousScreen = (screen: Screen | null) => {
	previousScreen.value = screen;
};

// Hooks for React components
export const useCurrentScreen = () => useZen(currentScreen);
export const useCanGoBack = () => useZen(canGoBack);
export const useIsLoading = () => useZen(isLoading);
export const useUIError = () => useZen(error);
export const useShowNavigation = () => useZen(showNavigation);
export const useDebugLogs = () => useZen(debugLogs);
export const useIsCompacting = () => useZen(isCompacting);
