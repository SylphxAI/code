/**
 * Queue Event Handlers
 * Handles message queue events from server
 *
 * ARCHITECTURE: Uses optimistic update system for self-healing
 * - Handlers call optimistic wrappers which reconcile with server state
 * - Rollback pending operations that conflict with server events
 * - Multi-client safe (all clients reconcile to same server state)
 */

import {
	handleQueueCleared,
	handleQueueMessageAdded,
	handleQueueMessageRemoved,
	handleQueueMessageUpdated,
	handleQueueMessageAddedWithOptimistic,
	handleQueueClearedWithOptimistic,
} from "@sylphx/code-client";
import type { EventHandlerContext } from "../types.js";

/**
 * Handle queue-message-added event
 * Server added message to queue
 *
 * OPTIMISTIC: Reconciles with pending operations
 * - If we have conflicting add-message operation, rolls it back
 * - Server state wins (self-healing)
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
	// Use optimistic wrapper for self-healing
	handleQueueMessageAddedWithOptimistic({
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
 *
 * OPTIMISTIC: Reconciles with pending operations
 * - Rolls back all pending add-to-queue operations
 * - Server state wins (self-healing)
 */
export function handleQueueClearedEvent(
	event: {
		type: "queue-cleared";
		sessionId: string;
	},
	_context: EventHandlerContext,
): void {
	// Use optimistic wrapper for self-healing
	handleQueueClearedWithOptimistic({
		sessionId: event.sessionId,
	});
}
