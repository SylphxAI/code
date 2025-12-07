/**
 * Token Calculation Hook
 * Returns total token usage for the current session
 *
 * ARCHITECTURE: Pure UI - NO calculation
 * - Server calculates tokens using Hugging Face tokenizer
 * - Server stores tokens in session.totalTokens
 * - Client only displays what server provides
 * - Multi-client sync: all clients see same tokens (from server)
 */

import { useMemo } from "react";

/**
 * Session-like object that may have totalTokens
 * Accepts both lens Session and code-core Session types
 */
interface SessionLike {
	id: string;
	totalTokens?: number;
}

export function useTokenCalculation(currentSession: SessionLike | null | undefined): number {
	return useMemo(() => {
		if (!currentSession) {
			return 0;
		}

		// Return tokens calculated by server
		// Server updates this field after each message
		const tokens = currentSession.totalTokens || 0;
		return tokens;
	}, [currentSession?.id, currentSession?.totalTokens, currentSession]);
}
