/**
 * useMessages Hook
 * Fetches messages for the current session using lens-react hooks
 * and converts them to SessionMessage format with steps and parts
 *
 * ARCHITECTURE: lens-react hooks pattern
 * ======================================
 * Uses client.listMessages({ input, skip }) - the lens-react hook.
 * The hook internally manages React state.
 *
 * Real-time updates come from:
 * - subscribeToSession subscription for streaming events
 * - refetch() when needed
 *
 * NOTE: Currently returns empty array as a temporary fix.
 * TODO: Implement full Message -> SessionMessage conversion with steps/parts
 */

import type { SessionMessage } from "@sylphx/code-core";

export function useMessages(sessionId: string | null | undefined) {
	// TEMPORARY: Return empty array until we implement full message fetching
	// with steps and parts. The new Lens API separates messages from steps/parts,
	// so we need to:
	// 1. Fetch messages with client.listMessages
	// 2. For each message, fetch steps with client.listSteps
	// 3. For each step, fetch parts with client.listParts
	// 4. Combine into SessionMessage structure

	const messages: SessionMessage[] = [];

	return {
		messages,
		isLoading: false,
		error: null,
		refetch: () => {},
	};
}
