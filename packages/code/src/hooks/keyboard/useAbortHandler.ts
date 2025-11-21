/**
 * Abort Handler Hook
 * Handles ESC key to abort streaming AI response
 *
 * Single Responsibility: Abort control during streaming
 *
 * Note: Compact operations abort removed (feature not yet implemented)
 */

import { useInput } from "ink";
import type React from "react";

export interface UseAbortHandlerOptions {
	isStreaming: boolean;
	abortControllerRef: React.MutableRefObject<AbortController | null>;
	addLog: (message: string) => void;
}

/**
 * Handles abort control during AI streaming
 * - ESC while streaming → abort current AI response
 * - Takes priority over other ESC actions
 */
export function useAbortHandler(options: UseAbortHandlerOptions) {
	const { isStreaming, abortControllerRef, addLog } = options;

	useInput(
		(_char, key) => {
			if (!key.escape) {
				return false;
			}

			// ESC to abort streaming AI response
			if (isStreaming) {
				if (abortControllerRef.current) {
					addLog("[abort] Cancelling AI response...");
					abortControllerRef.current.abort();
					abortControllerRef.current = null;
				}
				return true; // Consumed
			}

			return false; // Not consumed, let other handlers process
		},
		{ isActive: true },
	);
}
