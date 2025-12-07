/**
 * Model Details State - Cache for model details with React hooks
 */

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
// Model Details Types
// ============================================================================

export interface TokenizerInfo {
	name: string;
	modelId: string;
	source: string;
}

export interface ModelDetails {
	contextLength: number | null;
	capabilities: Record<string, boolean> | null;
	tokenizerInfo: TokenizerInfo | null;
}

// ============================================================================
// Model Details Cache State
// ============================================================================

const modelDetailsCacheState = createState<Record<string, ModelDetails>>({});
export const getModelDetailsCache = modelDetailsCacheState.get;
export const useModelDetailsCache = () => useStore(modelDetailsCacheState);

export const setModelDetails = (providerId: string, modelId: string, details: ModelDetails) => {
	const key = `${providerId}:${modelId}`;
	const current = modelDetailsCacheState.get();
	modelDetailsCacheState.set({ ...current, [key]: details });
};

// ============================================================================
// Model Details Loading State
// ============================================================================

const modelDetailsLoadingState = createState<boolean>(false);
export const setModelDetailsLoading = modelDetailsLoadingState.set;
export const getModelDetailsLoading = modelDetailsLoadingState.get;
export const useModelDetailsLoading = () => useStore(modelDetailsLoadingState);

// ============================================================================
// Model Details Error State
// ============================================================================

const modelDetailsErrorState = createState<string | null>(null);
export const setModelDetailsError = modelDetailsErrorState.set;
export const getModelDetailsError = modelDetailsErrorState.get;
export const useModelDetailsError = () => useStore(modelDetailsErrorState);
