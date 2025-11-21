/**
 * Streaming Domain Signals
 * Manages streaming state including flags, titles, and timing
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

// Core streaming signals
export const isStreaming = zen<boolean>(false);
export const isTitleStreaming = zen<boolean>(false);
export const streamingTitle = zen<string>("");
export const streamingStartTime = zen<number | null>(null);
export const streamingOutputTokens = zen<number>(0);

// React hooks
export function useIsStreamingUI(): boolean {
	return useZen(isStreaming);
}

export function useIsTitleStreaming(): boolean {
	return useZen(isTitleStreaming);
}

export function useStreamingTitle(): string {
	return useZen(streamingTitle);
}

export function useStreamingStartTime(): number | null {
	return useZen(streamingStartTime);
}

export function useStreamingOutputTokens(): number {
	return useZen(streamingOutputTokens);
}

// Actions
export function setIsStreamingUI(streaming: boolean): void {
	isStreaming.value = streaming;
}

export function setIsTitleStreaming(streaming: boolean): void {
	isTitleStreaming.value = streaming;
}

export function setStreamingTitle(title: string | ((prev: string) => string)): void {
	if (typeof title === "function") {
		streamingTitle.value = title(streamingTitle.value);
	} else {
		streamingTitle.value = title;
	}
}

export function setStreamingStartTime(time: number | null): void {
	streamingStartTime.value = time;
}

export function setStreamingOutputTokens(tokens: number | ((prev: number) => number)): void {
	if (typeof tokens === "function") {
		streamingOutputTokens.value = tokens(streamingOutputTokens.value);
	} else {
		streamingOutputTokens.value = tokens;
	}
}

// Getters (for non-React code)
export function getIsStreaming(): boolean {
	return isStreaming.value;
}

export function getStreamingTitle(): string {
	return streamingTitle.value;
}
