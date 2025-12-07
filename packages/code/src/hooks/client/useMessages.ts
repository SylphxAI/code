/**
 * useMessages Hook
 * Fetches messages for the current session using lens-react hooks
 *
 * ARCHITECTURE: lens-react hooks pattern
 * ======================================
 * Uses client.listMessages({ input, skip }) - the lens-react hook.
 * The hook internally manages React state.
 *
 * Real-time updates come from:
 * - subscribeToSession subscription for streaming events
 * - refetch() when needed
 */

import { useLensClient, type Message } from "@sylphx/code-client";

export function useMessages(sessionId: string | null | undefined) {
	const client = useLensClient();

	// Skip query when no valid session ID
	const skip = !sessionId || sessionId === "temp-session";

	// Use lens-react hook to fetch messages
	const { data: messages, loading, error, refetch } = client.listMessages({
		input: { sessionId: sessionId || "" },
		skip,
	}) as {
		data: Message[] | null;
		loading: boolean;
		error: Error | null;
		refetch: () => void;
	};

	return {
		messages: messages || [],
		isLoading: loading,
		error,
		refetch,
	};
}
