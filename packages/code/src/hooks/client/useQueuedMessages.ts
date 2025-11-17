/**
 * Hook to access queued messages for current session
 */

import { useStore } from "@sylphx/zen-react";
import { $currentSessionId, $sessionQueues } from "@sylphx/code-client";

export function useQueuedMessages() {
	const currentSessionId = useStore($currentSessionId);
	const sessionQueues = useStore($sessionQueues);

	const queuedMessages = currentSessionId ? sessionQueues[currentSessionId] || [] : [];

	return {
		queuedMessages,
		queueLength: queuedMessages.length,
	};
}
