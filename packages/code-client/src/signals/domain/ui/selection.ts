/**
 * Selection Domain Signals
 * Manages multi-selection, pending input, and filter state for command interactions
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";
import type { WaitForInputOptions } from "../../../types/command-types.js";

// Core selection signals
export const pendingInput = zen<WaitForInputOptions | null>(null);
export const selectionFilter = zen<string>("");
export const isFilterMode = zen<boolean>(false);
export const multiSelectionPage = zen<number>(0);
export const multiSelectionAnswers = zen<Record<string, string | string[]>>({});
export const multiSelectChoices = zen<Set<string>>(new Set());
export const freeTextInput = zen<string>("");
export const isFreeTextMode = zen<boolean>(false);
export const askQueueLength = zen<number>(0);

// React hooks
export function usePendingInput(): WaitForInputOptions | null {
	return useZen(pendingInput);
}

export function useSelectionFilter(): string {
	return useZen(selectionFilter);
}

export function useIsFilterMode(): boolean {
	return useZen(isFilterMode);
}

export function useMultiSelectionPage(): number {
	return useZen(multiSelectionPage);
}

export function useMultiSelectionAnswers(): Record<string, string | string[]> {
	return useZen(multiSelectionAnswers);
}

export function useMultiSelectChoices(): Set<string> {
	return useZen(multiSelectChoices);
}

export function useFreeTextInput(): string {
	return useZen(freeTextInput);
}

export function useIsFreeTextMode(): boolean {
	return useZen(isFreeTextMode);
}

export function useAskQueueLength(): number {
	return useZen(askQueueLength);
}

// Actions
export function setPendingInput(value: WaitForInputOptions | null): void {
	pendingInput.value = value;
}

export function setSelectionFilter(value: string): void {
	selectionFilter.value = value;
}

export function setIsFilterMode(mode: boolean): void {
	isFilterMode.value = mode;
}

export function setMultiSelectionPage(page: number): void {
	multiSelectionPage.value = page;
}

export function setMultiSelectionAnswers(answers: Record<string, string | string[]>): void {
	multiSelectionAnswers.value = answers;
}

export function setMultiSelectChoices(choices: Set<string>): void {
	multiSelectChoices.value = choices;
}

export function setFreeTextInput(value: string): void {
	freeTextInput.value = value;
}

export function setIsFreeTextMode(mode: boolean): void {
	isFreeTextMode.value = mode;
}

export function setAskQueueLength(length: number): void {
	askQueueLength.value = length;
}

// Getters (for non-React code)
export function getPendingInput(): WaitForInputOptions | null {
	return pendingInput.value;
}
