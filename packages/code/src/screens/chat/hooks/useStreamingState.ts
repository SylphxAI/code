/**
 * Streaming State Hook
 * Manages streaming flags and refs
 */

import type { MessagePart as StreamPart } from "@sylphx/code-core";
import { useRef, useState } from "react";

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
	const [isStreaming, setIsStreamingState] = useState(false);
	const [isTitleStreaming, setIsTitleStreaming] = useState(false);
	const [streamingTitle, setStreamingTitle] = useState("");
	const [streamingStartTime, setStreamingStartTime] = useState<number | null>(null);
	const [streamingOutputTokens, setStreamingOutputTokens] = useState(0);

	// Ref to track current streaming state (for stable access across renders)
	const isStreamingRef = useRef<boolean>(false);

	// Wrapper to keep ref in sync with state
	const setIsStreaming = (streaming: boolean) => {
		isStreamingRef.current = streaming;
		setIsStreamingState(streaming);
	};

	// Refs for streaming management
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
		setIsTitleStreaming,
		streamingTitle,
		setStreamingTitle,
		abortControllerRef,
		streamingMessageIdRef,
		dbWriteTimerRef,
		pendingDbContentRef,
		currentStepIndexRef,
		skipContentForStepRef,
		streamingStartTime,
		setStreamingStartTime,
		streamingOutputTokens,
		setStreamingOutputTokens,
	};
}
