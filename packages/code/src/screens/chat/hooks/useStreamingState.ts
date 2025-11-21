/**
 * Streaming State Hook
 * Manages streaming flags and refs using Zen signals
 */

import {
	useIsStreamingUI,
	setIsStreamingUI as setIsStreamingSignal,
	useIsTitleStreaming,
	setIsTitleStreaming as setIsTitleStreamingSignal,
	useStreamingTitle,
	setStreamingTitle as setStreamingTitleSignal,
	useStreamingStartTime,
	setStreamingStartTime as setStreamingStartTimeSignal,
	useStreamingOutputTokens,
	setStreamingOutputTokens as setStreamingOutputTokensSignal,
	getIsStreaming,
} from "@sylphx/code-client";
import type { MessagePart as StreamPart } from "@sylphx/code-core";
import { useEffect, useRef } from "react";

export interface StreamingState {
	isStreaming: boolean;
	setIsStreaming: (streaming: boolean) => void;
	isStreamingRef: React.MutableRefObject<boolean>;
	isTitleStreaming: boolean;
	setIsTitleStreaming: (streaming: boolean) => void;
	streamingTitle: string;
	setStreamingTitle: (title: string | ((prev: string) => string)) => void;
	abortControllerRef: React.MutableRefObject<AbortController | null>;
	streamingMessageIdRef: React.MutableRefObject<string | null>;
	dbWriteTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
	pendingDbContentRef: React.MutableRefObject<StreamPart[] | null>;
	/** Track current step index for replay idempotency */
	currentStepIndexRef: React.MutableRefObject<number | null>;
	/** Track if content events should be skipped (step already exists) */
	skipContentForStepRef: React.MutableRefObject<boolean>;
	/** Track streaming start time for duration display */
	streamingStartTime: number | null;
	setStreamingStartTime: (time: number | null) => void;
	/** Track cumulative output tokens during streaming */
	streamingOutputTokens: number;
	setStreamingOutputTokens: (tokens: number | ((prev: number) => number)) => void;
}

export function useStreamingState(): StreamingState {
	const isStreaming = useIsStreamingUI();
	const isTitleStreaming = useIsTitleStreaming();
	const streamingTitle = useStreamingTitle();
	const streamingStartTime = useStreamingStartTime();
	const streamingOutputTokens = useStreamingOutputTokens();

	// Ref to track current streaming state (for stable access across renders)
	const isStreamingRef = useRef<boolean>(isStreaming);

	// Keep ref in sync with signal
	useEffect(() => {
		isStreamingRef.current = isStreaming;
	}, [isStreaming]);

	// Wrapper to keep ref in sync with signal when setting
	const setIsStreaming = (streaming: boolean) => {
		isStreamingRef.current = streaming;
		setIsStreamingSignal(streaming);
	};

	// Refs for streaming management (not migrated - React-specific, no reactivity needed)
	const abortControllerRef = useRef<AbortController | null>(null);
	const streamingMessageIdRef = useRef<string | null>(null);

	// Database persistence refs
	const dbWriteTimerRef = useRef<NodeJS.Timeout | null>(null);
	const pendingDbContentRef = useRef<StreamPart[] | null>(null);

	// Replay idempotency refs
	const currentStepIndexRef = useRef<number | null>(null);
	const skipContentForStepRef = useRef<boolean>(false);

	return {
		isStreaming,
		setIsStreaming,
		isStreamingRef,
		isTitleStreaming,
		setIsTitleStreaming: setIsTitleStreamingSignal,
		streamingTitle,
		setStreamingTitle: setStreamingTitleSignal,
		abortControllerRef,
		streamingMessageIdRef,
		dbWriteTimerRef,
		pendingDbContentRef,
		currentStepIndexRef,
		skipContentForStepRef,
		streamingStartTime,
		setStreamingStartTime: setStreamingStartTimeSignal,
		streamingOutputTokens,
		setStreamingOutputTokens: setStreamingOutputTokensSignal,
	};
}

// Export getter for non-React code
export { getIsStreaming };
