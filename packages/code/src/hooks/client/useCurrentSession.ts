/**
 * useCurrentSession Hook
 * Provides current session data using lens-react hooks
 *
 * ARCHITECTURE: lens-react v5 API
 * ===============================
 * - client.xxx.useQuery({ input }) → React hook { data, loading, error, refetch }
 * - await client.xxx({ input }) → Vanilla JS Promise (for commands/utilities)
 */

import { useLensClient, type Session } from "@sylphx/code-client";
import { useCurrentSessionId } from "../../session-state.js";

export function useCurrentSession() {
	const client = useLensClient();
	const currentSessionId = useCurrentSessionId();

	// Skip query when no valid session ID
	const skip = !currentSessionId || currentSessionId === "temp-session";

	// DEBUG: Log when hook is called
	console.log(`[useCurrentSession] sessionId=${currentSessionId?.substring(0, 8) || 'null'}, skip=${skip}`);

	// Use lens-react query hook
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

	// DEBUG: Log when session data changes
	console.log(`[useCurrentSession] data received: id=${session?.id?.substring(0, 8) || 'null'}, status=`, session?.status);

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
 * Re-export useCurrentSessionId from session-state for convenience
 */
export { useCurrentSessionId } from "../../session-state.js";
