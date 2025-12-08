/**
 * useCurrentSession Hook
 * Provides current session data with live status updates
 *
 * ARCHITECTURE:
 * - Session data: lens-react query (client.getSession.useQuery)
 * - Live status: Event stream (subscribeToSession -> session-updated events)
 * - Status merging: useSessionStatus() from session-state
 *
 * Flow:
 * 1. Server publishes session-updated events to session-stream:{id}
 * 2. Client receives via subscribeToSession (event stream)
 * 3. useChatEffects extracts status and calls setSessionStatus()
 * 4. This hook merges status into session via useSessionStatus()
 */

import { useLensClient, type Session } from "@sylphx/code-client";
import { useCurrentSessionId, useSessionStatus } from "../../session-state.js";

export function useCurrentSession() {
	const client = useLensClient();
	const currentSessionId = useCurrentSessionId();
	const sessionStatus = useSessionStatus();

	// Skip query when no valid session ID
	const skip = !currentSessionId || currentSessionId === "temp-session";

	// Use lens-react query hook for session data
	const { data: session, loading, error, refetch } = client.getSession.useQuery({
		input: { id: currentSessionId || "" },
		skip,
	}) as {
		data: Session & {
			streamingStatus?: "idle" | "streaming" | "waiting_input";
			isTextStreaming?: boolean;
			isReasoningStreaming?: boolean;
			currentTool?: string;
		} | null;
		loading: boolean;
		error: Error | null;
		refetch: () => void;
	};

	// Merge session status from event stream into session
	// Status is updated via useEventStream -> setSessionStatus
	const sessionWithStatus = session ? {
		...session,
		status: sessionStatus,
	} : null;

	// Derive isStreaming from session status
	const isStreaming = sessionStatus?.isActive ||
		session?.streamingStatus === "streaming" ||
		session?.streamingStatus === "waiting_input" ||
		session?.isTextStreaming ||
		session?.isReasoningStreaming ||
		!!session?.currentTool;

	return {
		currentSession: sessionWithStatus,
		currentSessionId,
		isStreaming,
		isLoading: loading,
		error,
		refetch,
	};
}

/**
 * Re-export useCurrentSessionId from session-state for convenience
 */
export { useCurrentSessionId } from "../../session-state.js";
