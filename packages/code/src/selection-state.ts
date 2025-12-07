/**
 * Selection State - Ask tool and multi-selection UI state
 *
 * This tracks the state for:
 * - Pending input from Ask tool
 * - Multi-selection UI (filtering, paging, answers)
 * - Free text input mode
 * - Ask queue length
 */

import { useSyncExternalStore } from "react";
import type { WaitForInputOptions } from "@sylphx/code-client";

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
// Pending Input (from Ask tool)
// ============================================================================

const pendingInputState = createState<WaitForInputOptions | null>(null);
export const setPendingInput = pendingInputState.set;
export const getPendingInput = pendingInputState.get;
export const usePendingInput = () => useStore(pendingInputState);

// ============================================================================
// Selection Filter
// ============================================================================

const selectionFilterState = createState<string>("");
export const setSelectionFilter = selectionFilterState.set;
export const getSelectionFilter = selectionFilterState.get;
export const useSelectionFilter = () => useStore(selectionFilterState);

// ============================================================================
// Filter Mode
// ============================================================================

const isFilterModeState = createState<boolean>(false);
export const setIsFilterMode = isFilterModeState.set;
export const getIsFilterMode = isFilterModeState.get;
export const useIsFilterMode = () => useStore(isFilterModeState);

// ============================================================================
// Multi-selection Page
// ============================================================================

const multiSelectionPageState = createState<number>(0);
export const setMultiSelectionPage = multiSelectionPageState.set;
export const getMultiSelectionPage = multiSelectionPageState.get;
export const useMultiSelectionPage = () => useStore(multiSelectionPageState);

// ============================================================================
// Multi-selection Answers
// ============================================================================

const multiSelectionAnswersState = createState<Record<string, string | string[]>>({});
export const setMultiSelectionAnswers = multiSelectionAnswersState.set;
export const getMultiSelectionAnswers = multiSelectionAnswersState.get;
export const useMultiSelectionAnswers = () => useStore(multiSelectionAnswersState);

// ============================================================================
// Multi-select Choices
// ============================================================================

const multiSelectChoicesState = createState<Set<string>>(new Set());
export const setMultiSelectChoices = multiSelectChoicesState.set;
export const getMultiSelectChoices = multiSelectChoicesState.get;
export const useMultiSelectChoices = () => useStore(multiSelectChoicesState);

// ============================================================================
// Free Text Input
// ============================================================================

const freeTextInputState = createState<string>("");
export const setFreeTextInput = freeTextInputState.set;
export const getFreeTextInput = freeTextInputState.get;
export const useFreeTextInput = () => useStore(freeTextInputState);

// ============================================================================
// Free Text Mode
// ============================================================================

const isFreeTextModeState = createState<boolean>(false);
export const setIsFreeTextMode = isFreeTextModeState.set;
export const getIsFreeTextMode = isFreeTextModeState.get;
export const useIsFreeTextMode = () => useStore(isFreeTextModeState);

// ============================================================================
// Ask Queue Length
// ============================================================================

const askQueueLengthState = createState<number>(0);
export const setAskQueueLength = askQueueLengthState.set;
export const getAskQueueLength = askQueueLengthState.get;
export const useAskQueueLength = () => useStore(askQueueLengthState);
