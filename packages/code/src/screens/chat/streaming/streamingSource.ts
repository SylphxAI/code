/**
 * Streaming Source Management
 * Basic utilities for streaming state
 */

import type React from "react";

/**
 * Reset streaming message ID ref
 * Called when streaming completes or is aborted
 */
export function resetStreamingSource(
	streamingMessageIdRef: React.MutableRefObject<string | null>,
): void {
	streamingMessageIdRef.current = null;
}
