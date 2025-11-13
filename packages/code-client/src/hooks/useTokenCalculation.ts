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
import type { Session } from "@sylphx/code-core";

export function useTokenCalculation(currentSession: Session | null): number {
	return useMemo(() => {
		if (!currentSession) {
			console.log("[useTokenCalculation] No session");
			return 0;
		}

		// Return tokens calculated by server
		// Server updates this field after each message
		const tokens = currentSession.totalTokens || 0;
		console.log("[useTokenCalculation] Session:", currentSession.id, "totalTokens:", tokens, "baseContextTokens:", currentSession.baseContextTokens);
		return tokens;
	}, [currentSession?.id, currentSession?.totalTokens]);
}
