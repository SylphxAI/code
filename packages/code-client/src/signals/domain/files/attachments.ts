/**
 * File Attachments Domain Signals
 * Manages file attachments for messages (ChatGPT-style architecture)
 */

import { zen, computed } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";
import type { FileAttachment } from "@sylphx/code-core";

// Core attachment signals
export const pendingAttachments = zen<FileAttachment[]>([]);
export const attachmentTokens = zen<Map<string, number>>(new Map());

// Computed signals
export const attachmentCount = computed(() => pendingAttachments.value.length);
export const validTags = computed(() => {
	return new Set(pendingAttachments.value.map((att) => att.relativePath));
});

// React hooks
export function usePendingAttachments(): FileAttachment[] {
	return useZen(pendingAttachments);
}

export function useAttachmentTokens(): Map<string, number> {
	return useZen(attachmentTokens);
}

export function useAttachmentCount(): number {
	return useZen(attachmentCount);
}

export function useValidTags(): Set<string> {
	return useZen(validTags);
}

// Actions
export function setPendingAttachments(
	attachments: FileAttachment[] | ((prev: FileAttachment[]) => FileAttachment[]),
): void {
	if (typeof attachments === "function") {
		pendingAttachments.value = attachments(pendingAttachments.value);
	} else {
		pendingAttachments.value = attachments;
	}
}

export function addPendingAttachment(attachment: FileAttachment): void {
	// Check if already attached
	if (pendingAttachments.value.some((a) => a.fileId === attachment.fileId)) {
		return;
	}
	pendingAttachments.value = [...pendingAttachments.value, attachment];
}

export function clearAttachments(): void {
	pendingAttachments.value = [];
}

export function setAttachmentTokenCount(path: string, tokens: number): void {
	const newMap = new Map(attachmentTokens.value);
	newMap.set(path, tokens);
	attachmentTokens.value = newMap;
}

// Getters (for non-React code)
export function getPendingAttachments(): FileAttachment[] {
	return pendingAttachments.value;
}

export function getValidTags(): Set<string> {
	return validTags.value;
}
