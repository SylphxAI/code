/**
 * Hook to access queued messages for current session
 */

import { useSessionQueues } from "../../queue-state.js";
import { useCurrentSessionId } from "../../session-state.js";

export function useQueuedMessages() {
	const currentSessionId = useCurrentSessionId();
	const sessionQueues = useSessionQueues();

	const queuedMessages = currentSessionId ? sessionQueues[currentSessionId] || [] : [];

	return {
		queuedMessages,
		queueLength: queuedMessages.length,
	};
}
