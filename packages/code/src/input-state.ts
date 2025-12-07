/**
 * Input State - Chat input field state
 *
 * This tracks the state for:
 * - Current input text and cursor position
 * - Message history and navigation
 * - Temporary input storage during history navigation
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

export interface MessageHistoryEntry {
	input: string;
	attachments?: Array<{
		fileId: string;
		relativePath: string;
		size: number;
		mimeType: string;
		type?: "file" | "image";
	}>;
}

// ============================================================================
// Input Text
// ============================================================================

const inputState = createState<string>("");
export const setInput = inputState.set;
export const getInput = inputState.get;
export const useInput = () => useStore(inputState);

// ============================================================================
// Cursor Position
// ============================================================================

const cursorState = createState<number>(0);
export const setCursor = cursorState.set;
export const getCursor = cursorState.get;
export const useCursor = () => useStore(cursorState);

// ============================================================================
// Normalized Cursor (computed)
// ============================================================================

export const useNormalizedCursor = (): number => {
	const input = useInput();
	const cursor = useCursor();
	// Clamp cursor to valid range [0, input.length]
	return Math.max(0, Math.min(cursor, input.length));
};

// ============================================================================
// Message History
// ============================================================================

const messageHistoryState = createState<MessageHistoryEntry[]>([]);
export const setMessageHistory = messageHistoryState.set;
export const getMessageHistory = messageHistoryState.get;
export const useMessageHistory = () => useStore(messageHistoryState);

// ============================================================================
// History Index
// ============================================================================

const historyIndexState = createState<number>(-1);
export const setHistoryIndex = historyIndexState.set;
export const getHistoryIndex = historyIndexState.get;
export const useHistoryIndex = () => useStore(historyIndexState);

// ============================================================================
// Temporary Input (stored when navigating history)
// ============================================================================

const tempInputState = createState<string>("");
export const setTempInput = tempInputState.set;
export const getTempInput = tempInputState.get;
export const useTempInput = () => useStore(tempInputState);
