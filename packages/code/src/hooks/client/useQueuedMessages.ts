/**
 * Hook to access queued messages for current session
 */

import { useCurrentSessionId, useSessionQueues } from "@sylphx/code-client";

export function useQueuedMessages() {
	const currentSessionId = useCurrentSessionId();
	const sessionQueues = useSessionQueues();

	const queuedMessages = currentSessionId ? sessionQueues[currentSessionId] || [] : [];

	return {
		queuedMessages,
		queueLength: queuedMessages.length,
	};
}
