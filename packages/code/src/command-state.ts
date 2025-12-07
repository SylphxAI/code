/**
 * Command State - Command menu and input component state with React hooks
 */

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import type { Command } from "@sylphx/code-client";

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
// Command Menu State
// ============================================================================

const ctrlPressedState = createState<boolean>(false);
export const setCtrlPressed = ctrlPressedState.set;
export const useCtrlPressed = () => useStore(ctrlPressedState);

const showCommandMenuState = createState<boolean>(false);
export const setShowCommandMenu = showCommandMenuState.set;
export const useShowCommandMenu = () => useStore(showCommandMenuState);

const selectedCommandIndexState = createState<number>(0);
export const setSelectedCommandIndex = selectedCommandIndexState.set;
export const useSelectedCommandIndex = () => useStore(selectedCommandIndexState);

const pendingCommandState = createState<{ command: Command; currentInput: string } | null>(null);
export const setPendingCommand = pendingCommandState.set;
export const usePendingCommand = () => useStore(pendingCommandState);

const showEscHintState = createState<boolean>(false);
export const setShowEscHint = showEscHintState.set;
export const useShowEscHint = () => useStore(showEscHintState);

const selectedFileIndexState = createState<number>(0);
export const setSelectedFileIndex = selectedFileIndexState.set;
export const useSelectedFileIndex = () => useStore(selectedFileIndexState);

// ============================================================================
// Command Options Cache
// ============================================================================

const cachedOptionsState = createState<
	Map<string, Array<{ id: string; name: string; label: string; value?: string }>>
>(new Map());
export const setCachedOptions = cachedOptionsState.set;
export const useCachedOptions = () => useStore(cachedOptionsState);

// ============================================================================
// Loading State
// ============================================================================

const currentlyLoadingState = createState<string | null>(null);
export const setCurrentlyLoading = currentlyLoadingState.set;
export const useCurrentlyLoading = () => useStore(currentlyLoadingState);

const loadErrorState = createState<string | null>(null);
export const setLoadError = loadErrorState.set;
export const useLoadError = () => useStore(loadErrorState);

// ============================================================================
// Custom Input Component State
// ============================================================================

const inputComponentState = createState<ReactNode | null>(null);
const inputComponentTitleState = createState<string | null>(null);

export const setInputComponent = (component: ReactNode | null, title?: string) => {
	inputComponentState.set(component);
	inputComponentTitleState.set(title ?? null);
};

export const useInputComponent = () => useStore(inputComponentState);
export const useInputComponentTitle = () => useStore(inputComponentTitleState);
