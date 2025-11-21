/**
 * Command Domain Signals
 * Manages command menu, pending commands, selection state, and custom input components
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";
import type { ReactNode } from "react";
import type { Command } from "../../../types/command-types.js";

// Core command signals
export const ctrlPressed = zen<boolean>(false);
export const showCommandMenu = zen<boolean>(false);
export const selectedCommandIndex = zen<number>(0);
export const pendingCommand = zen<{ command: Command; currentInput: string } | null>(null);
export const showEscHint = zen<boolean>(false);
export const selectedFileIndex = zen<number>(0);
export const cachedOptions = zen<Map<string, Array<{ id: string; name: string; label: string; value?: string }>>>(new Map());
export const currentlyLoading = zen<string | null>(null);
export const loadError = zen<string | null>(null);
export const inputComponent = zen<ReactNode | null>(null);
export const inputComponentTitle = zen<string | null>(null);

// React hooks
export function useCtrlPressed(): boolean {
	return useZen(ctrlPressed);
}

export function useShowCommandMenu(): boolean {
	return useZen(showCommandMenu);
}

export function useSelectedCommandIndex(): number {
	return useZen(selectedCommandIndex);
}

export function usePendingCommand(): { command: Command; currentInput: string } | null {
	return useZen(pendingCommand);
}

export function useShowEscHint(): boolean {
	return useZen(showEscHint);
}

export function useSelectedFileIndex(): number {
	return useZen(selectedFileIndex);
}

export function useCachedOptions(): Map<string, Array<{ id: string; name: string; label: string; value?: string }>> {
	return useZen(cachedOptions);
}

export function useCurrentlyLoading(): string | null {
	return useZen(currentlyLoading);
}

export function useLoadError(): string | null {
	return useZen(loadError);
}

export function useInputComponent(): ReactNode | null {
	return useZen(inputComponent);
}

export function useInputComponentTitle(): string | null {
	return useZen(inputComponentTitle);
}

// Actions
export function setCtrlPressed(pressed: boolean): void {
	ctrlPressed.value = pressed;
}

export function setShowCommandMenu(show: boolean): void {
	showCommandMenu.value = show;
}

export function setSelectedCommandIndex(index: number): void {
	selectedCommandIndex.value = index;
}

export function setPendingCommand(command: { command: Command; currentInput: string } | null): void {
	pendingCommand.value = command;
}

export function setShowEscHint(show: boolean): void {
	showEscHint.value = show;
}

export function setSelectedFileIndex(index: number): void {
	selectedFileIndex.value = index;
}

export function setCachedOptions(options: Map<string, Array<{ id: string; name: string; label: string; value?: string }>>): void {
	cachedOptions.value = options;
}

export function setCurrentlyLoading(loading: string | null): void {
	currentlyLoading.value = loading;
}

export function setLoadError(error: string | null): void {
	loadError.value = error;
}

export function setInputComponent(component: ReactNode | null, title?: string): void {
	inputComponent.value = component;
	inputComponentTitle.value = title || null;
}

// Getters (for non-React code)
export function getShowCommandMenu(): boolean {
	return showCommandMenu.value;
}

export function getPendingCommand(): { command: Command; currentInput: string } | null {
	return pendingCommand.value;
}
