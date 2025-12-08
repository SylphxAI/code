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
// State declarations (must be before setPendingInput which references them)
// ============================================================================

const pendingInputState = createState<WaitForInputOptions | null>(null);
const selectionFilterState = createState<string>("");
const isFilterModeState = createState<boolean>(false);
const multiSelectionPageState = createState<number>(0);
const multiSelectionAnswersState = createState<Record<string, string | string[]>>({});
const multiSelectChoicesState = createState<Set<string>>(new Set());

// ============================================================================
// Pending Input (from Ask tool)
// ============================================================================

/**
 * Set pending input with automatic initialization of multiSelectChoices
 * from preSelected values on the first question
 */
export const setPendingInput = (input: WaitForInputOptions | null) => {
	pendingInputState.set(input);

	// Initialize multiSelectChoices from preSelected when selection mode starts
	if (input && input.type === "selection" && input.questions?.length > 0) {
		const firstQuestion = input.questions[0];
		if (firstQuestion?.multiSelect && firstQuestion?.preSelected) {
			multiSelectChoicesState.set(new Set(firstQuestion.preSelected));
		} else {
			multiSelectChoicesState.set(new Set());
		}
		// Reset other selection state
		multiSelectionPageState.set(0);
		multiSelectionAnswersState.set({});
		selectionFilterState.set("");
		isFilterModeState.set(false);
	}
};
export const getPendingInput = pendingInputState.get;
export const usePendingInput = () => useStore(pendingInputState);

// ============================================================================
// Selection Filter
// ============================================================================

export const setSelectionFilter = selectionFilterState.set;
export const getSelectionFilter = selectionFilterState.get;
export const useSelectionFilter = () => useStore(selectionFilterState);

// ============================================================================
// Filter Mode
// ============================================================================

export const setIsFilterMode = isFilterModeState.set;
export const getIsFilterMode = isFilterModeState.get;
export const useIsFilterMode = () => useStore(isFilterModeState);

// ============================================================================
// Multi-selection Page
// ============================================================================

export const setMultiSelectionPage = multiSelectionPageState.set;
export const getMultiSelectionPage = multiSelectionPageState.get;
export const useMultiSelectionPage = () => useStore(multiSelectionPageState);

// ============================================================================
// Multi-selection Answers
// ============================================================================

export const setMultiSelectionAnswers = multiSelectionAnswersState.set;
export const getMultiSelectionAnswers = multiSelectionAnswersState.get;
export const useMultiSelectionAnswers = () => useStore(multiSelectionAnswersState);

// ============================================================================
// Multi-select Choices
// ============================================================================

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
