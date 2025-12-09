/**
 * useCurrentSession Hook
 * Provides current session data with live status updates
 *
 * ARCHITECTURE: Lens Live Query (v2.4.0+)
 * ========================================
 * - Session status uses `.subscribe()` resolver field
 * - When client selects `status` field, Lens auto-routes to streaming transport
 * - No manual event stream subscription or status merging needed
 *
 * Flow:
 * 1. Client queries getSession with status field selected
 * 2. Lens detects status field has mode "subscribe"
 * 3. Lens routes to streaming transport (not one-shot)
 * 4. Server resolver subscribes to session-stream events
 * 5. Server emits status updates via ctx.emit()
 * 6. Client receives live updates through the query
 */

import { useLensClient } from "@sylphx/code-client";
import { useCurrentSessionId } from "../../session-state.js";
import type { SessionStatus } from "../../session-state.js";

interface SessionWithStatus {
	id: string;
	title?: string;
	flags?: unknown;
	modelId?: string;
	provider?: string;
	model?: string;
	agentId: string;
	enabledRuleIds: string[];
	enabledToolIds?: string[];
	enabledMcpServerIds?: string[];
	baseContextTokens?: number;
	totalTokens?: number;
	messageQueue?: unknown;
	nextTodoId: number;
	created: number;
	updated: number;
	lastAccessedAt?: number;
	// Live status from .subscribe() resolver
	status?: SessionStatus;
}

export function useCurrentSession() {
	const client = useLensClient();
	const currentSessionId = useCurrentSessionId();

	// Skip query when no valid session ID
	const skip = !currentSessionId || currentSessionId === "temp-session";

	// Use lens-react query hook for session data
	// The status field uses .subscribe() in the resolver, so Lens auto-streams
	const { data: session, loading, error, refetch } = client.getSession.useQuery({
		input: { id: currentSessionId || "" },
		skip,
	}) as {
		data: SessionWithStatus | null;
		loading: boolean;
		error: Error | null;
		refetch: () => void;
	};

	// Derive isStreaming from session status
	// Status comes directly from the query (live via Lens subscription)
	const isStreaming = session?.status?.isActive ?? false;

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
