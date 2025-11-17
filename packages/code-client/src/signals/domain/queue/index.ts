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
import type { Accessor } from "solid-js";
import { createMemo, createSignal } from "solid-js";

/**
 * Per-session queue state
 * Key: sessionId, Value: array of queued messages
 */
export const [sessionQueues, setSessionQueues] = createSignal<Record<string, QueuedMessage[]>>(
	{},
);

/**
 * Get queue for specific session
 */
export function getSessionQueue(sessionId: string | null): QueuedMessage[] {
	if (!sessionId) return [];
	const queues = sessionQueues();
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
): Accessor<QueuedMessage[]> => createMemo(() => getSessionQueue(getCurrentSessionId()));

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
	const queues = sessionQueues();
	console.log("[handleQueueMessageAdded] Current queues:", JSON.stringify(queues));
	const sessionQueue = queues[event.sessionId] || [];
	console.log("[handleQueueMessageAdded] Current session queue length:", sessionQueue.length);

	const newQueues = {
		...queues,
		[event.sessionId]: [...sessionQueue, event.message],
	};
	console.log("[handleQueueMessageAdded] New queues:", JSON.stringify(newQueues));
	setSessionQueues(newQueues);
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
	const queues = sessionQueues();
	const sessionQueue = queues[event.sessionId] || [];

	// Find and update the message
	const updatedQueue = sessionQueue.map((msg) =>
		msg.id === event.message.id ? event.message : msg,
	);

	setSessionQueues({
		...queues,
		[event.sessionId]: updatedQueue,
	});
}

/**
 * Handle queue-message-removed event
 * Removes message from session's queue by ID
 */
export function handleQueueMessageRemoved(event: {
	sessionId: string;
	messageId: string;
}): void {
	const queues = sessionQueues();
	const sessionQueue = queues[event.sessionId] || [];

	setSessionQueues({
		...queues,
		[event.sessionId]: sessionQueue.filter((msg) => msg.id !== event.messageId),
	});
}

/**
 * Handle queue-cleared event
 * Removes all queued messages for session
 */
export function handleQueueCleared(event: { sessionId: string }): void {
	const queues = sessionQueues();

	setSessionQueues({
		...queues,
		[event.sessionId]: [],
	});
}

/**
 * React Hooks
 */
export const useSessionQueues = () => {
	const { useSignal } = require("../../react-bridge.js");
	return useSignal(sessionQueues);
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

	await caller.message.removeQueuedMessage.mutate({
		sessionId,
		messageId,
	});
}
