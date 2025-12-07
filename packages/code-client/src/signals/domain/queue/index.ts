/**
 * Queue Domain Signals
 * Manages per-session message queues
 *
 * Architecture:
 * - Server manages queue state (single source of truth)
 * - Client syncs via queue events (queue-message-added, queue-message-removed, queue-cleared)
 * - Per-session isolation (each session has own queue)
 * - Event-driven updates (all clients see same queue)
 */

import type { QueuedMessage } from "@sylphx/code-core";
import { zen, computed } from "@sylphx/zen";

// Type for accessor function (zen computed returns reactive value)
type Accessor<T> = () => T;

/**
 * Per-session queue state
 * Key: sessionId, Value: array of queued messages
 */
export const sessionQueues = zen<Record<string, QueuedMessage[]>>({});

// Setter function for backwards compatibility
export const setSessionQueues = (value: Record<string, QueuedMessage[]>) => { (sessionQueues as any).value = value };

/**
 * Get queue for specific session
 */
export function getSessionQueue(sessionId: string | null): QueuedMessage[] {
	if (!sessionId) return [];
	const queues = sessionQueues.value;
	return queues[sessionId] || [];
}

/**
 * Get queue length for specific session
 */
export function getQueueLength(sessionId: string | null): number {
	return getSessionQueue(sessionId).length;
}

/**
 * Computed signal for current session's queue
 * Requires currentSessionId from session signals
 */
export const createCurrentQueueComputed = (
	getCurrentSessionId: () => string | null,
): Accessor<QueuedMessage[]> => {
	// zen@3.47.0 computed returns a reactive value, not an Accessor
	// Return a function that matches Accessor signature
	const comp = computed(() => getSessionQueue(getCurrentSessionId()));
	return () => comp.value;
};

/**
 * Event Handlers
 * These are called from streamEventHandlers when queue events arrive
 */

/**
 * Handle queue-message-added event
 * Adds message to session's queue
 */
export function handleQueueMessageAdded(event: {
	sessionId: string;
	message: QueuedMessage;
}): void {
	const queues = sessionQueues.value;
	const sessionQueue = queues[event.sessionId] || [];

	const newQueues = {
		...queues,
		[event.sessionId]: [...sessionQueue, event.message],
	};
	(sessionQueues as any).value = newQueues;
}

/**
 * Handle queue-message-updated event
 * Updates message in session's queue
 */
export function handleQueueMessageUpdated(event: {
	sessionId: string;
	message: QueuedMessage;
}): void {
	const queues = sessionQueues.value;
	const sessionQueue = queues[event.sessionId] || [];

	// Find and update the message
	const updatedQueue = sessionQueue.map((msg) =>
		msg.id === event.message.id ? event.message : msg,
	);

	(sessionQueues as any).value = {
		...queues,
		[event.sessionId]: updatedQueue,
	};
}

/**
 * Handle queue-message-removed event
 * Removes message from session's queue by ID
 */
export function handleQueueMessageRemoved(event: {
	sessionId: string;
	messageId: string;
}): void {
	const queues = sessionQueues.value;
	const sessionQueue = queues[event.sessionId] || [];

	(sessionQueues as any).value = {
		...queues,
		[event.sessionId]: sessionQueue.filter((msg) => msg.id !== event.messageId),
	};
}

/**
 * Handle queue-cleared event
 * Removes all queued messages for session
 */
export function handleQueueCleared(event: { sessionId: string }): void {
	const queues = sessionQueues.value;

	(sessionQueues as any).value = {
		...queues,
		[event.sessionId]: [],
	};
}

/**
 * React Hooks
 */
export const useSessionQueues = () => {
	const { useZen } = require("../../react-bridge.js");
	return useZen(sessionQueues);
};

/**
 * Client Actions
 * TODO: These need queue mutations to be added to Lens server
 * For now, queue operations are handled via local state only
 */

/**
 * Enqueue message (local only)
 * TODO: Add enqueueMessage mutation to Lens server
 */
export async function enqueueMessage(
	sessionId: string,
	content: string,
	attachments: Array<{
		path: string;
		relativePath: string;
		size: number;
		mimeType?: string;
	}> = [],
): Promise<QueuedMessage> {
	// Create local queued message
	const message: QueuedMessage = {
		id: crypto.randomUUID(),
		sessionId,
		content,
		attachments: attachments.map(a => ({
			fileId: a.path,
			relativePath: a.relativePath,
			size: a.size,
			mediaType: a.mimeType || "application/octet-stream",
		})),
		timestamp: Date.now(),
		status: "queued",
	};

	// Add to local queue
	handleQueueMessageAdded({ sessionId, message });

	return message;
}

/**
 * Clear queue (local only)
 * TODO: Add clearQueue mutation to Lens server
 */
export async function clearQueue(sessionId: string): Promise<void> {
	handleQueueCleared({ sessionId });
}

/**
 * Update queued message (local only)
 * TODO: Add updateQueuedMessage mutation to Lens server
 */
export async function updateQueuedMessage(
	sessionId: string,
	messageId: string,
	content: string,
	attachments: Array<{
		path: string;
		relativePath: string;
		size: number;
		mimeType?: string;
	}> = [],
): Promise<QueuedMessage> {
	const message: QueuedMessage = {
		id: messageId,
		sessionId,
		content,
		attachments: attachments.map(a => ({
			fileId: a.path,
			relativePath: a.relativePath,
			size: a.size,
			mediaType: a.mimeType || "application/octet-stream",
		})),
		timestamp: Date.now(),
		status: "queued",
	};

	handleQueueMessageUpdated({ sessionId, message });

	return message;
}

/**
 * Remove specific queued message (local only)
 * TODO: Add removeQueuedMessage mutation to Lens server
 */
export async function removeQueuedMessage(sessionId: string, messageId: string): Promise<void> {
	handleQueueMessageRemoved({ sessionId, messageId });
}
