/**
 * Queue Browsing Domain Signals
 * Manages queue browsing navigation state
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";
import type { FileAttachment } from "@sylphx/code-core";

// Core queue browsing signals
export const queueBrowseIndex = zen<number>(-1);
export const tempQueueInput = zen<string>("");
export const tempQueueAttachments = zen<FileAttachment[]>([]);

// React hooks
export function useQueueBrowseIndex(): number {
	return useZen(queueBrowseIndex);
}

export function useTempQueueInput(): string {
	return useZen(tempQueueInput);
}

export function useTempQueueAttachments(): FileAttachment[] {
	return useZen(tempQueueAttachments);
}

// Actions
export function setQueueBrowseIndex(index: number): void {
	queueBrowseIndex.value = index;
}

export function setTempQueueInput(input: string): void {
	tempQueueInput.value = input;
}

export function setTempQueueAttachments(attachments: FileAttachment[]): void {
	tempQueueAttachments.value = attachments;
}
