/**
 * Attachment State - File attachment state with React hooks
 */

import type { FileAttachment } from "@sylphx/code-core";
import { useSyncExternalStore } from "react";

type Listener = () => void;

function createState<T>(initial: T) {
	let value = initial;
	const listeners = new Set<Listener>();

	return {
		get: () => value,
		set: (newValue: T | ((prev: T) => T)) => {
			if (typeof newValue === "function") {
				value = (newValue as (prev: T) => T)(value);
			} else {
				value = newValue;
			}
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
// Pending Attachments
// ============================================================================

const pendingAttachmentsState = createState<FileAttachment[]>([]);
export const setPendingAttachments = pendingAttachmentsState.set;
export const getPendingAttachments = pendingAttachmentsState.get;
export const usePendingAttachments = () => useStore(pendingAttachmentsState);

export const addPendingAttachment = (attachment: FileAttachment) => {
	pendingAttachmentsState.set((prev) => [...prev, attachment]);
};

export const clearAttachments = () => {
	pendingAttachmentsState.set([]);
};

// ============================================================================
// Attachment Token Count
// ============================================================================

const attachmentTokensState = createState<number>(0);
export const setAttachmentTokenCount = attachmentTokensState.set;
export const getAttachmentTokenCount = attachmentTokensState.get;
export const useAttachmentTokens = () => useStore(attachmentTokensState);

// ============================================================================
// Valid Tags (for @file completions)
// ============================================================================

const validTagsState = createState<string[]>([]);
export const setValidTags = validTagsState.set;
export const getValidTags = validTagsState.get;
export const useValidTags = () => useStore(validTagsState);

// ============================================================================
// Extract file references from input text
// ============================================================================

export function extractFileReferences(input: string): string[] {
	const regex = /@([^\s@]+)/g;
	const matches = input.match(regex) || [];
	return matches.map((m) => m.slice(1)); // Remove @ prefix
}
