/**
 * Streaming Domain Signals
 * Manages streaming state including flags, titles, and timing
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";
// Re-export isStreaming from session domain to avoid duplicate exports
import { useIsStreaming, setIsStreaming } from "../session/index.js";

// Core streaming signals
// Note: isStreaming is managed by session domain, not UI domain
export const isTitleStreaming = zen<boolean>(false);
export const streamingTitle = zen<string>("");
export const streamingStartTime = zen<number | null>(null);
export const streamingOutputTokens = zen<number>(0);

// React hooks
// Re-export from session domain to maintain backwards compatibility
export function useIsStreamingUI(): boolean {
	return useIsStreaming();
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
// Backwards compatibility: delegate to session domain
export function setIsStreamingUI(streaming: boolean): void {
	setIsStreaming(streaming);
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
// Note: getIsStreaming is exported from session domain, not UI domain
// to avoid naming conflict. Use session domain's getIsStreaming for non-React code.

export function getStreamingTitle(): string {
	return streamingTitle.value;
}
