/**
 * AI Config State - Local config state with React hook
 */

import type { AIConfig } from "@sylphx/code-core";
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
// AI Config
// ============================================================================

const aiConfigState = createState<AIConfig>({ providers: {} });
export const setAIConfig = aiConfigState.set;
export const getAIConfig = aiConfigState.get;
export const useAIConfigState = () => useStore(aiConfigState);
