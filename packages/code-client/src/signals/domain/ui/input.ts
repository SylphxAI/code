/**
 * Input Domain Signals
 * Manages input field state including message history
 */

import { zen, computed } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";
import type { FileAttachment } from "@sylphx/code-core";

/**
 * Message history entry with text and attachments
 */
export interface MessageHistoryEntry {
	text: string;
	attachments: FileAttachment[];
}

// Core input signals
export const input = zen<string>("");
export const cursor = zen<number>(0);
export const messageHistory = zen<MessageHistoryEntry[]>([]);
export const historyIndex = zen<number>(-1);
export const tempInput = zen<string>("");

// Computed signal
export const normalizedCursor = computed(() =>
	Math.max(0, Math.min(cursor.value, input.value.length))
);

// React hooks
export function useInput(): string {
	return useZen(input);
}

export function useCursor(): number {
	return useZen(cursor);
}

export function useNormalizedCursor(): number {
	return useZen(normalizedCursor);
}

export function useMessageHistory(): MessageHistoryEntry[] {
	return useZen(messageHistory);
}

export function useHistoryIndex(): number {
	return useZen(historyIndex);
}

export function useTempInput(): string {
	return useZen(tempInput);
}

// Actions
export function setInput(value: string): void {
	input.value = value;
}

export function setCursor(value: number): void {
	cursor.value = value;
}

export function setMessageHistory(entries: MessageHistoryEntry[]): void {
	messageHistory.value = entries;
}

export function setHistoryIndex(index: number): void {
	historyIndex.value = index;
}

export function setTempInput(value: string): void {
	tempInput.value = value;
}

// Getters (for non-React code)
export function getInput(): string {
	return input.value;
}

export function getCursor(): number {
	return cursor.value;
}
