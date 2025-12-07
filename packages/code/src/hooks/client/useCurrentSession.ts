/**
 * useCurrentSession Hook
 * Provides current session data using lens-react hooks
 *
 * ARCHITECTURE: lens-react hooks pattern
 * ======================================
 * Uses client.getSession({ input, skip }) - the lens-react hook.
 * The hook internally uses useState, useEffect, and useReducer
 * to manage React state, so we don't need manual state or polling.
 *
 * The lens-react hook:
 * - client.xxx({ input }) → React hook with { data, loading, error, refetch }
 * - client.xxx.fetch({ input }) → Promise for SSR/utilities
 *
 * Real-time updates come from:
 * - subscribeToSession subscription for streaming events
 * - refetch() when needed
 */

import { useLensClient, useCurrentSessionId } from "@sylphx/code-client";

export function useCurrentSession() {
	const client = useLensClient();
	const currentSessionId = useCurrentSessionId();

	// Skip query when no valid session ID
	const skip = !currentSessionId || currentSessionId === "temp-session";

	// Use lens-react hook directly - no manual state or polling needed!
	// The hook handles all React state management internally
	const { data: session, loading, error, refetch } = client.getSession({
		input: { id: currentSessionId || "" },
		skip,
	}) as {
		data: {
			id: string;
			title?: string;
			streamingStatus?: "idle" | "streaming" | "waiting_input";
			isTextStreaming?: boolean;
			isReasoningStreaming?: boolean;
			currentTool?: string;
			[key: string]: unknown;
		} | null;
		loading: boolean;
		error: Error | null;
		refetch: () => void;
	};

	// Derive isStreaming from session state
	const isStreaming = session?.streamingStatus === "streaming" ||
		session?.streamingStatus === "waiting_input" ||
		session?.isTextStreaming ||
		session?.isReasoningStreaming ||
		!!session?.currentTool;

	return {
		currentSession: session,
		currentSessionId,
		isStreaming,
		isLoading: loading,
		error,
		refetch,
	};
}

/**
 * Re-export useCurrentSessionId from code-client for convenience
 */
export { useCurrentSessionId } from "@sylphx/code-client";
