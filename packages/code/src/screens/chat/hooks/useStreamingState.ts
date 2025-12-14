/**
 * Streaming State Hook
 * Derives streaming state from session via Live Query
 *
 * LENS ARCHITECTURE:
 * All streaming state comes from server via useQuery session data.
 * Server uses emit API to push updates, client just reads.
 *
 * NOTE: This hook accepts session data as parameters to avoid duplicate
 * useCurrentSession() calls. The parent (useChatState) should call
 * useCurrentSession() once and pass the data here.
 */

import type { MessagePart as StreamPart } from "@sylphx/code-core";
import { useRef } from "react";

export interface StreamingState {
	isStreaming: boolean;
	isStreamingRef: React.MutableRefObject<boolean>;
	isTitleStreaming: boolean;
	streamingTitle: string;
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
	/** Track cumulative output tokens during streaming */
	streamingOutputTokens: number;
}

interface UseStreamingStateParams {
	currentSession: { title?: string } | null;
	isStreaming: boolean;
}

export function useStreamingState(params: UseStreamingStateParams): StreamingState {
	const { currentSession, isStreaming } = params;

	// Derive streaming state from session (server-driven)
	const isTitleStreaming = false; // Title streaming not yet implemented in Session type
	const streamingTitle = currentSession?.title ?? "";
	const streamingStartTime = null; // Streaming start time not yet in Session type
	const streamingOutputTokens = 0; // Token tracking not yet in Session type

	// Ref to track current streaming state (for stable access across renders)
	const isStreamingRef = useRef<boolean>(isStreaming);
	isStreamingRef.current = isStreaming;

	// Refs for streaming management (React-specific, not server state)
	const abortControllerRef = useRef<AbortController | null>(null);
	const streamingMessageIdRef = useRef<string | null>(null);

	// Database persistence refs
	const dbWriteTimerRef = useRef<NodeJS.Timeout | null>(null);
	const pendingDbContentRef = useRef<StreamPart[] | null>(null);

	// Replay idempotency refs
	const currentStepIndexRef = useRef<number | null>(null);
	const skipContentForStepRef = useRef<boolean>(false);

	return {
		// Streaming state (from server via useQuery)
		isStreaming,
		isStreamingRef,
		isTitleStreaming,
		streamingTitle,
		streamingStartTime,
		streamingOutputTokens,

		// React refs (local to component)
		abortControllerRef,
		streamingMessageIdRef,
		dbWriteTimerRef,
		pendingDbContentRef,
		currentStepIndexRef,
		skipContentForStepRef,
	};
}

/**
 * Get streaming status synchronously (for non-React code)
 * NOTE: For React components, use useCurrentSession().isStreaming
 */
export function getIsStreaming(): boolean {
	// This is a fallback for non-React code
	// In practice, prefer using hooks
	return false;
}
