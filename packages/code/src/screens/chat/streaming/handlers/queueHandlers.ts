/**
 * Queue Event Handlers
 * Handles message queue events from server
 *
 * ARCHITECTURE: Server-authoritative queue state
 * - Server events update queue state directly
 * - Lens handles optimistic updates via mutations
 * - Multi-client sync automatic via Lens subscriptions
 */

import {
	handleQueueCleared,
	handleQueueMessageAdded,
	handleQueueMessageRemoved,
	handleQueueMessageUpdated,
} from "@sylphx/code-client";
import type { EventHandlerContext } from "../types.js";

/**
 * Handle queue-message-added event
 * Server added message to queue
 */
export function handleQueueMessageAddedEvent(
	event: {
		type: "queue-message-added";
		sessionId: string;
		message: {
			id: string;
			content: string;
			attachments: Array<{
				path: string;
				relativePath: string;
				size: number;
				mimeType?: string;
			}>;
			enqueuedAt: number;
		};
	},
	_context: EventHandlerContext,
): void {
	// Update queue state directly (server-authoritative)
	handleQueueMessageAdded({
		sessionId: event.sessionId,
		message: event.message,
	});
}

/**
 * Handle queue-message-updated event
 * Server updated message in queue
 */
export function handleQueueMessageUpdatedEvent(
	event: {
		type: "queue-message-updated";
		sessionId: string;
		message: {
			id: string;
			content: string;
			attachments: Array<{
				path: string;
				relativePath: string;
				size: number;
				mimeType?: string;
			}>;
			enqueuedAt: number;
		};
	},
	_context: EventHandlerContext,
): void {
	// Forward to queue signal handler
	handleQueueMessageUpdated({
		sessionId: event.sessionId,
		message: event.message,
	});
}

/**
 * Handle queue-message-removed event
 * Server removed message from queue
 */
export function handleQueueMessageRemovedEvent(
	event: {
		type: "queue-message-removed";
		sessionId: string;
		messageId: string;
	},
	_context: EventHandlerContext,
): void {
	// Forward to queue signal handler
	handleQueueMessageRemoved({
		sessionId: event.sessionId,
		messageId: event.messageId,
	});
}

/**
 * Handle queue-cleared event
 * Server cleared all queued messages
 */
export function handleQueueClearedEvent(
	event: {
		type: "queue-cleared";
		sessionId: string;
	},
	_context: EventHandlerContext,
): void {
	// Update queue state directly (server-authoritative)
	handleQueueCleared({
		sessionId: event.sessionId,
	});
}
