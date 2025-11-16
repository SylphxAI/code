/**
 * Hook to access queued messages for current session
 */

import { useStore } from "@sylphx/zen-react";
import { $currentSessionId } from "../signals/domain/session/index.js";
import { $sessionQueues } from "../signals/domain/queue/index.js";

export function useQueuedMessages() {
	const currentSessionId = useStore($currentSessionId);
	const sessionQueues = useStore($sessionQueues);

	console.log("[useQueuedMessages] currentSessionId:", currentSessionId);
	console.log("[useQueuedMessages] sessionQueues:", JSON.stringify(sessionQueues));

	const queuedMessages = currentSessionId ? sessionQueues[currentSessionId] || [] : [];

	console.log("[useQueuedMessages] queuedMessages:", JSON.stringify(queuedMessages));
	console.log("[useQueuedMessages] queueLength:", queuedMessages.length);

	return {
		queuedMessages,
		queueLength: queuedMessages.length,
	};
}
