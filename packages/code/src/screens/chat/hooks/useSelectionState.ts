/**
 * Selection State Hook
 * Manages multi-selection, pending input, and filter state using local state
 */

import {
	usePendingInput,
	setPendingInput as setPendingInputSignal,
	useSelectionFilter,
	setSelectionFilter as setSelectionFilterSignal,
	useIsFilterMode,
	setIsFilterMode as setIsFilterModeSignal,
	useMultiSelectionPage,
	setMultiSelectionPage as setMultiSelectionPageSignal,
	useMultiSelectionAnswers,
	setMultiSelectionAnswers as setMultiSelectionAnswersSignal,
	useMultiSelectChoices,
	setMultiSelectChoices as setMultiSelectChoicesSignal,
	useFreeTextInput,
	setFreeTextInput as setFreeTextInputSignal,
	useIsFreeTextMode,
	setIsFreeTextMode as setIsFreeTextModeSignal,
	useAskQueueLength,
	setAskQueueLength as setAskQueueLengthSignal,
} from "../../../selection-state.js";
import type { WaitForInputOptions } from "@sylphx/code-client";
import { useRef } from "react";

export interface SelectionState {
	pendingInput: WaitForInputOptions | null;
	setPendingInput: (input: WaitForInputOptions | null) => void;
	inputResolver: React.MutableRefObject<
		((value: string | Record<string, string | string[]>) => void) | null
	>;
	selectionFilter: string;
	setSelectionFilter: (filter: string) => void;
	isFilterMode: boolean;
	setIsFilterMode: (mode: boolean) => void;
	multiSelectionPage: number;
	setMultiSelectionPage: (page: number) => void;
	multiSelectionAnswers: Record<string, string | string[]>;
	setMultiSelectionAnswers: (answers: Record<string, string | string[]>) => void;
	multiSelectChoices: Set<string>;
	setMultiSelectChoices: (choices: Set<string>) => void;
	freeTextInput: string;
	setFreeTextInput: (input: string) => void;
	isFreeTextMode: boolean;
	setIsFreeTextMode: (mode: boolean) => void;
	askQueueLength: number;
	setAskQueueLength: (length: number) => void;
	askToolContextRef: React.MutableRefObject<{
		sessionId: string;
		toolCallId: string;
	} | null>;
}

export function useSelectionState(): SelectionState {
	const pendingInput = usePendingInput();
	const selectionFilter = useSelectionFilter();
	const isFilterMode = useIsFilterMode();
	const multiSelectionPage = useMultiSelectionPage();
	const multiSelectionAnswers = useMultiSelectionAnswers();
	const multiSelectChoices = useMultiSelectChoices();
	const freeTextInput = useFreeTextInput();
	const isFreeTextMode = useIsFreeTextMode();
	const askQueueLength = useAskQueueLength();

	// Refs are not migrated to signals (they're React-specific and don't need reactivity)
	const inputResolver = useRef<
		((value: string | Record<string, string | string[]>) => void) | null
	>(null);
	const askToolContextRef = useRef<{ sessionId: string; toolCallId: string } | null>(null);

	return {
		pendingInput,
		setPendingInput: setPendingInputSignal,
		inputResolver,
		askToolContextRef,
		selectionFilter,
		setSelectionFilter: setSelectionFilterSignal,
		isFilterMode,
		setIsFilterMode: setIsFilterModeSignal,
		multiSelectionPage,
		setMultiSelectionPage: setMultiSelectionPageSignal,
		multiSelectionAnswers,
		setMultiSelectionAnswers: setMultiSelectionAnswersSignal,
		multiSelectChoices,
		setMultiSelectChoices: setMultiSelectChoicesSignal,
		freeTextInput,
		setFreeTextInput: setFreeTextInputSignal,
		isFreeTextMode,
		setIsFreeTextMode: setIsFreeTextModeSignal,
		askQueueLength,
		setAskQueueLength: setAskQueueLengthSignal,
	};
}
