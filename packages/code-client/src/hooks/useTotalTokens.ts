/**
 * Total Tokens Hook (Real-time)
 * Subscribes to $currentSession signal for real-time token updates during streaming
 *
 * ARCHITECTURE: Event-driven real-time updates
 * - Server emits session-tokens-updated events during streaming
 * - useEventStream receives events and updates $currentSession signal
 * - This hook subscribes to signal for instant UI updates
 * - No API polling, no delayed updates
 *
 * This ensures StatusBar shows real-time token usage during AI responses.
 */

import { useCurrentSession } from "../signals/domain/session/index.js";

/**
 * Get total tokens from current session (real-time)
 * Subscribes to $currentSession signal which is updated via event stream
 *
 * @returns Total tokens or 0 if no session
 */
export function useTotalTokens(): number {
	const currentSession = useCurrentSession();
	const totalTokens = currentSession?.totalTokens || 0;

	console.log("[useTotalTokens] Hook called, returning:", {
		sessionId: currentSession?.id,
		totalTokens,
		hasSession: !!currentSession,
	});

	return totalTokens;
}
