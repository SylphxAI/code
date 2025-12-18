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

/**
 * SessionSuggestions - Live AI suggestions from inline actions
 */
interface SessionSuggestions {
	suggestions: Array<{
		index: number;
		text: string;
		isStreaming: boolean;
	}>;
	isStreaming: boolean;
}

interface Todo {
	id: number;
	status: string;
	content: string;
	activeForm?: string;
	ordering: number;
}

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
	// Live suggestions from .subscribe() resolver
	suggestions?: SessionSuggestions;
	// Todos relation
	todos?: Todo[];
}

export function useCurrentSession() {
	const client = useLensClient();
	const currentSessionId = useCurrentSessionId();

	// Skip query when no valid session ID
	const skip = !currentSessionId || currentSessionId === "temp-session";

	// Debug flag for tracing title updates
	const DEBUG = process.env.DEBUG_LENS_TITLE === "true";

	// Use lens-react query hook for session data
	// The status field uses .subscribe() in the resolver, so Lens auto-streams
	const { data: session, loading, error, refetch } = client.getSession.useQuery({
		args: { id: currentSessionId || "" },
		skip,
		debug: DEBUG ? {
			onData: (data: SessionWithStatus | null) => {
				console.log(`[useCurrentSession] Received data update, title: "${data?.title}"`);
			},
			onSubscribe: () => {
				console.log(`[useCurrentSession] Subscribed to session: ${currentSessionId}`);
			},
		} : undefined,
	}) as {
		data: SessionWithStatus | null;
		loading: boolean;
		error: Error | null;
		refetch: () => void;
	};

	// Derive isStreaming from session status
	// Status comes directly from the query (live via Lens subscription)
	const isStreaming = session?.status?.isActive ?? false;

	// Extract suggestions from session (live via Lens subscription)
	const suggestions = session?.suggestions?.suggestions ?? [];

	return {
		currentSession: session,
		currentSessionId,
		isStreaming,
		suggestions,
		isLoading: loading,
		error,
		refetch,
	};
}

/**
 * Re-export useCurrentSessionId from session-state for convenience
 */
export { useCurrentSessionId } from "../../session-state.js";
