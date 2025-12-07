/**
 * Bash State - Local bash process tracking
 *
 * Tracks bash process details and outputs for the UI.
 * Updated by event subscriptions and trpc queries.
 */

import { useSyncExternalStore } from "react";

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
// Types
// ============================================================================

export interface BashProcessDetails {
	id: string;
	command: string;
	cwd: string;
	status: string;
	exitCode?: number | null;
	duration: number;
	isActive?: boolean;
	mode?: string;
}

export interface BashProcessOutput {
	stdout: string;
	stderr: string;
}

// ============================================================================
// Bash Process Details (maps bashId to process details)
// ============================================================================

const bashProcessDetailsState = createState<Record<string, BashProcessDetails>>({});
export const getBashProcessDetails = bashProcessDetailsState.get;
export const useBashProcessDetails = () => useStore(bashProcessDetailsState);

// Helper to set a single process detail
export const setBashProcessDetail = (bashId: string, details: BashProcessDetails) => {
	const current = bashProcessDetailsState.get();
	bashProcessDetailsState.set({
		...current,
		[bashId]: details,
	});
};

// ============================================================================
// Bash Process Outputs (maps bashId to output string)
// ============================================================================

const bashProcessOutputsState = createState<Record<string, string>>({});
export const getBashProcessOutputs = bashProcessOutputsState.get;
export const useBashProcessOutputs = () => useStore(bashProcessOutputsState);

// Helper to set a single process output
export const setBashProcessOutput = (
	bashId: string,
	output: string | ((prev: string) => string)
) => {
	const current = bashProcessOutputsState.get();
	const newOutput = typeof output === "function" ? output(current[bashId] || "") : output;
	bashProcessOutputsState.set({
		...current,
		[bashId]: newOutput,
	});
};

// ============================================================================
// Bash Process Details Loading (maps bashId to loading state)
// ============================================================================

const bashProcessDetailsLoadingState = createState<Record<string, boolean>>({});
export const getBashProcessDetailsLoading = bashProcessDetailsLoadingState.get;
export const useBashProcessDetailsLoading = () => useStore(bashProcessDetailsLoadingState);

// Helper to set loading state for a single process
export const setBashProcessDetailLoading = (bashId: string, loading: boolean) => {
	const current = bashProcessDetailsLoadingState.get();
	bashProcessDetailsLoadingState.set({
		...current,
		[bashId]: loading,
	});
};
