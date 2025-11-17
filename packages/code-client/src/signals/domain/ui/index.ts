/**
 * UI Domain Signals
 * Manages UI state across the application
 */

import { createMemo, createSignal } from "solid-js";
import { useStore } from "@sylphx/zen-react";

export type Screen = "chat" | "settings" | "provider" | "help";

// Core UI signals
export const [currentScreen, setCurrentScreen] = createSignal<Screen>("chat");
export const [previousScreen, setPreviousScreen] = createSignal<Screen | null>(null);
export const [isLoading, setIsLoading] = createSignal(false);
export const [error, setError] = createSignal<string | null>(null);
export const [debugLogs, setDebugLogs] = createSignal<string[]>([]);

// Compacting state (for /compact command)
export const [isCompacting, setIsCompacting] = createSignal(false);
export const [compactAbortController, setCompactAbortController] =
	createSignal<AbortController | null>(null);

// Computed signals
export const canGoBack = createMemo(
	() => currentScreen() !== "chat" && previousScreen() !== null,
);

export const showNavigation = createMemo(() => ["chat", "settings"].includes(currentScreen()));

// Actions
export const navigateTo = (screen: Screen) => {
	const current = currentScreen();
	setPreviousScreen(current);
	setCurrentScreen(screen);
};

export const goBack = () => {
	const previous = previousScreen();
	if (previous) {
		navigateTo(previous);
	}
};

export const setLoading = (loading: boolean) => setIsLoading(loading);
export const setUIError = (err: string | null) => setError(err);

export const setCompacting = (compacting: boolean) => {
	setIsCompacting(compacting);
	if (!compacting) {
		// Clear abort controller when done
		setCompactAbortController(null);
	}
};

export const updateCompactAbortController = (controller: AbortController | null) => {
	setCompactAbortController(controller);
};

export const abortCompact = () => {
	const controller = compactAbortController();
	if (controller) {
		controller.abort();
		setCompacting(false);
	}
};

export const addDebugLog = (message: string) => {
	const timestamp = new Date().toLocaleTimeString();
	const logs = debugLogs() || [];
	const newLogs = [...logs, `[${timestamp}] ${message}`];

	// Keep only last 500 logs
	const MAX_LOGS = 1000;
	if (newLogs.length > MAX_LOGS) {
		newLogs.splice(0, newLogs.length - MAX_LOGS / 2);
	}

	setDebugLogs(newLogs);
};

export const clearDebugLogs = () => setDebugLogs([]);

// Hooks for React components
export const useCurrentScreen = () => useStore(currentScreen);
export const useCanGoBack = () => useStore(canGoBack);
export const useIsLoading = () => useStore(isLoading);
export const useUIError = () => useStore(error);
export const useShowNavigation = () => useStore(showNavigation);
export const useDebugLogs = () => useStore(debugLogs);
export const useIsCompacting = () => useStore(isCompacting);
