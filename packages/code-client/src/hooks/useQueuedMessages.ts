/**
 * Hook to access queued messages for current session
 */

import { useSignal } from "@sylphx/zen/react";
import { $currentSessionId } from "../signals/domain/session/index.js";
import { $sessionQueues } from "../signals/domain/queue/index.js";

export function useQueuedMessages() {
	const currentSessionId = useSignal($currentSessionId);
	const sessionQueues = useSignal($sessionQueues);

	const queuedMessages = currentSessionId ? sessionQueues[currentSessionId] || [] : [];

	return {
		queuedMessages,
		queueLength: queuedMessages.length,
	};
}
