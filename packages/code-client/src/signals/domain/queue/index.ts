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
	console.log("[handleQueueMessageAdded] Event received:", JSON.stringify(event));
	const queues = sessionQueues.value;
	console.log("[handleQueueMessageAdded] Current queues:", JSON.stringify(queues));
	const sessionQueue = queues[event.sessionId] || [];
	console.log("[handleQueueMessageAdded] Current session queue length:", sessionQueue.length);

	const newQueues = {
		...queues,
		[event.sessionId]: [...sessionQueue, event.message],
	};
	console.log("[handleQueueMessageAdded] New queues:", JSON.stringify(newQueues));
	(sessionQueues as any).value = newQueues;
	console.log("[handleQueueMessageAdded] Signal updated");
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
 * These call tRPC mutations which emit events back to all clients
 */

/**
 * Enqueue message
 * Adds message to server queue, emits queue-message-added event
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
	const { getTRPCClient } = await import("../../../trpc-provider.js");
	const caller = await getTRPCClient();

	// @ts-expect-error - tRPC router types not fully resolved
	return await caller.message.enqueueMessage.mutate({
		sessionId,
		content,
		attachments,
	});
}

/**
 * Clear queue
 * Removes all queued messages from server queue, emits queue-cleared event
 */
export async function clearQueue(sessionId: string): Promise<void> {
	const { getTRPCClient } = await import("../../../trpc-provider.js");
	const caller = await getTRPCClient();

	// @ts-expect-error - tRPC router types not fully resolved
	await caller.message.clearQueue.mutate({ sessionId });
}

/**
 * Update queued message
 * Updates message content/attachments by ID in server queue, emits queue-message-updated event
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
	const { getTRPCClient } = await import("../../../trpc-provider.js");
	const caller = await getTRPCClient();

	// @ts-expect-error - tRPC router types not fully resolved
	return await caller.message.updateQueuedMessage.mutate({
		sessionId,
		messageId,
		content,
		attachments,
	});
}

/**
 * Remove specific queued message
 * Removes message by ID from server queue, emits queue-message-removed event
 */
export async function removeQueuedMessage(sessionId: string, messageId: string): Promise<void> {
	const { getTRPCClient } = await import("../../../trpc-provider.js");
	const caller = await getTRPCClient();

	// @ts-expect-error - tRPC router types not fully resolved
	await caller.message.removeQueuedMessage.mutate({
		sessionId,
		messageId,
	});
}
