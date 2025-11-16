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
}

export function useStreamingState(): StreamingState {
	const [isStreaming, setIsStreamingState] = useState(false);
	const [isTitleStreaming, setIsTitleStreaming] = useState(false);
	const [streamingTitle, setStreamingTitle] = useState("");

	// Ref to track current streaming state (for stable access across renders)
	const isStreamingRef = useRef<boolean>(false);

	// Wrapper to keep ref in sync with state
	const setIsStreaming = (streaming: boolean) => {
		console.log(`[useStreamingState] setIsStreaming called:`, streaming);
		isStreamingRef.current = streaming;
		console.log(`[useStreamingState] isStreamingRef.current updated to:`, isStreamingRef.current);
		setIsStreamingState(streaming);
	};

	// Refs for streaming management
	const abortControllerRef = useRef<AbortController | null>(null);
	const streamingMessageIdRef = useRef<string | null>(null);

	// Database persistence refs
	const dbWriteTimerRef = useRef<NodeJS.Timeout | null>(null);
	const pendingDbContentRef = useRef<StreamPart[] | null>(null);

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
	};
}
