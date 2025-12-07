/**
 * Queue State - Message queue state with React hooks
 */

import { useSyncExternalStore } from "react";

type Listener = () => void;

function createState<T>(initial: T) {
	let value = initial;
	const listeners = new Set<Listener>();

	return {
		get: () => value,
		set: (newValue: T) => {
			value = newValue;
			listeners.forEach((l) => l());
		},
		subscribe: (listener: Listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

function useStore<T>(store: ReturnType<typeof createState<T>>): T {
	return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ============================================================================
// Session Queues State (maps session ID to queued messages)
// ============================================================================

export interface QueuedMessage {
	id: string;
	content: string;
	timestamp: number;
}

const sessionQueuesState = createState<Record<string, QueuedMessage[]>>({});
export const setSessionQueues = sessionQueuesState.set;
export const getSessionQueues = sessionQueuesState.get;
export const useSessionQueues = () => useStore(sessionQueuesState);

// Helper to add message to queue
export const addToQueue = (sessionId: string, message: QueuedMessage) => {
	const current = sessionQueuesState.get();
	const queue = current[sessionId] || [];
	sessionQueuesState.set({
		...current,
		[sessionId]: [...queue, message],
	});
};

// Helper to remove message from queue
export const removeFromQueue = (sessionId: string, messageId: string) => {
	const current = sessionQueuesState.get();
	const queue = current[sessionId] || [];
	sessionQueuesState.set({
		...current,
		[sessionId]: queue.filter((m) => m.id !== messageId),
	});
};

// Helper to clear queue
export const clearQueue = (sessionId: string) => {
	const current = sessionQueuesState.get();
	sessionQueuesState.set({
		...current,
		[sessionId]: [],
	});
};
