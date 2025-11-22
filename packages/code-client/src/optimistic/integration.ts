/**
 * Optimistic Update Integration
 * Connects OptimisticManager to session signals and message flow
 *
 * Architecture:
 * - Session signals (zen) → Source of truth for UI state
 * - OptimisticManager → Manages pending operations + rollback
 * - Integration → Bridge between manager and signals
 */

import type { QueuedMessage, SessionMessage } from "@sylphx/code-core";
import {
	handleQueueCleared,
	handleQueueMessageAdded,
	handleQueueMessageRemoved,
	handleQueueMessageUpdated,
} from "../signals/domain/queue/index.js";
import {
	addMessage,
	currentSessionId,
	isStreaming,
	messages,
	updateMessage,
} from "../signals/domain/session/index.js";
import { optimisticManager } from "./manager.js";
import type { Message, Operation, ServerEvent } from "./types.js";

/**
 * Track optimistic user message
 *
 * Call this AFTER adding optimistic message to session signals
 * This tracks the operation for later reconciliation
 *
 * Flow:
 * 1. Check if streaming → determine expected operation (add-message vs add-to-queue)
 * 2. Track operation in OptimisticManager
 * 3. Return optimisticId for later confirmation/rollback
 */
export function trackOptimisticMessage(params: {
	sessionId: string;
	optimisticId: string;
	content: string;
	attachments?: Array<{
		path: string;
		relativePath: string;
		size: number;
		mimeType?: string;
	}>;
}): void {
	const { sessionId, optimisticId, content, attachments = [] } = params;

	// Determine expected operation type based on streaming state
	const streaming = isStreaming.value;

	if (streaming) {
		// Streaming → expect server will queue this message
		const queuedMessage: QueuedMessage = {
			id: optimisticId,
			content,
			attachments,
			enqueuedAt: Date.now(),
		};

		const operation: Operation = {
			type: "add-to-queue",
			sessionId,
			optimisticId,
			queuedMessage,
		};

		optimisticManager.apply(sessionId, operation);
		// console.log(`[Optimistic] Tracking add-to-queue (streaming): ${optimisticId}`);
	} else {
		// Not streaming → expect server will add to messages
		const message: Message = {
			id: optimisticId,
			role: "user",
			content,
			optimistic: true,
		};

		const operation: Operation = {
			type: "add-message",
			sessionId,
			optimisticId,
			message,
		};

		optimisticManager.apply(sessionId, operation);
		// console.log(`[Optimistic] Tracking add-message (idle): ${optimisticId}`);
	}
}

/**
 * Confirm optimistic operation with server data
 *
 * Called when server event confirms operation succeeded
 */
export function confirmOptimistic(
	sessionId: string,
	optimisticId: string,
	serverData?: any,
): void {
	optimisticManager.confirm(sessionId, optimisticId, serverData);
	// console.log(`[Optimistic] Confirmed: ${optimisticId}`);
}

/**
 * Rollback optimistic operation
 *
 * Called when server rejects operation or timeout occurs
 */
export function rollbackOptimistic(sessionId: string, optimisticId: string): void {
	optimisticManager.rollback(sessionId, optimisticId);
	// console.log(`[Optimistic] Rolled back: ${optimisticId}`);
}

/**
 * Reconcile with server event
 *
 * Called from stream event handlers to self-heal when server state differs
 */
export function reconcileWithServer(sessionId: string, event: ServerEvent): void {
	optimisticManager.reconcile(sessionId, event);
}

/**
 * Get computed state for session (server + optimistic layer)
 */
export function getOptimisticState(sessionId: string) {
	return optimisticManager.getState(sessionId);
}

/**
 * Sync server state from events
 *
 * Called when server events arrive to update the base server state
 */
export function syncServerState(
	sessionId: string,
	updates: {
		serverMessages?: Message[];
		serverQueue?: QueuedMessage[];
	},
): void {
	optimisticManager.updateServerState(sessionId, updates);
}

/**
 * Hook into session signals to provide optimistic state
 *
 * This creates computed signals that combine server state + optimistic operations
 */
export function createOptimisticSignals() {
	// Future: Create zen computed signals that combine server state + optimistic layer
	// For now, we'll integrate directly in event handlers

	// Example:
	// export const optimisticMessages = computed(() => {
	//   const sessionId = currentSessionId.value;
	//   if (!sessionId) return [];
	//   const state = optimisticManager.getState(sessionId);
	//   return state.serverMessages;
	// });
}

/**
 * Event Handler Wrappers
 *
 * These wrap existing queue handlers to also trigger optimistic reconciliation
 */

/**
 * Handle queue-message-added event with reconciliation
 */
export function handleQueueMessageAddedWithOptimistic(event: {
	sessionId: string;
	message: QueuedMessage;
}): void {
	// Update base server state
	handleQueueMessageAdded(event);

	// Reconcile optimistic state
	const serverEvent: ServerEvent = {
		type: "queue-message-added",
		sessionId: event.sessionId,
		message: event.message,
	};
	reconcileWithServer(event.sessionId, serverEvent);
}

/**
 * Handle queue-cleared event with reconciliation
 */
export function handleQueueClearedWithOptimistic(event: { sessionId: string }): void {
	// Update base server state
	handleQueueCleared(event);

	// Reconcile optimistic state
	const serverEvent: ServerEvent = {
		type: "queue-cleared",
		sessionId: event.sessionId,
	};
	reconcileWithServer(event.sessionId, serverEvent);
}

/**
 * Handle user-message-created event with confirmation
 *
 * Confirms optimistic operation when server confirms message creation
 */
export function handleUserMessageCreatedWithOptimistic(event: {
	messageId: string;
	content: string;
}): void {
	// Find optimistic ID (temp ID before server confirmation)
	// This requires tracking mapping between optimistic IDs and server message IDs
	// For now, we'll just confirm by content match (simple reconciliation)

	const sessionId = currentSessionId.value;
	if (!sessionId) return;

	const serverEvent: ServerEvent = {
		type: "user-message-created",
		messageId: event.messageId,
		content: event.content,
	};
	reconcileWithServer(sessionId, serverEvent);
}

/**
 * Handle message-status-updated event with reconciliation
 */
export function handleMessageStatusUpdatedWithOptimistic(event: {
	messageId: string;
	status: "active" | "completed" | "error" | "abort";
}): void {
	const sessionId = currentSessionId.value;
	if (!sessionId) return;

	// Update message in signals
	updateMessage(event.messageId, { status: event.status });

	const serverEvent: ServerEvent = {
		type: "message-status-updated",
		messageId: event.messageId,
		status: event.status,
	};
	reconcileWithServer(sessionId, serverEvent);
}

/**
 * Track optimistic session status update
 *
 * Call this AFTER setting optimistic status in session signals
 * This tracks the operation for later reconciliation/rollback
 *
 * @param sessionId - Session ID
 * @param status - New session status
 * @param previousStatus - Previous status (for rollback)
 */
export function trackOptimisticSessionStatus(params: {
	sessionId: string;
	status: import("./types.js").SessionStatus;
	previousStatus?: import("./types.js").SessionStatus;
}): void {
	const { sessionId, status, previousStatus } = params;

	const operation: Operation = {
		type: "update-session-status",
		sessionId,
		status,
		previousStatus,
	};

	optimisticManager.apply(sessionId, operation);
}

/**
 * Handle session-status-updated event with reconciliation
 *
 * Called when server confirms session status update
 * This will reconcile with optimistic state
 */
export function handleSessionStatusUpdatedWithOptimistic(event: {
	sessionId: string;
	status: import("./types.js").SessionStatus;
}): void {
	const sessionId = currentSessionId.value;
	if (!sessionId || sessionId !== event.sessionId) return;

	// Reconcile with server event
	const serverEvent: ServerEvent = {
		type: "session-status-updated",
		sessionId: event.sessionId,
		status: event.status,
	};
	reconcileWithServer(event.sessionId, serverEvent);
}

/**
 * Initialize optimistic update system
 *
 * Call this during app startup to wire up event handlers
 */
export function initOptimisticUpdates() {
	// Event handlers are already wired up in streamEventHandlers.ts
	// This function is reserved for future initialization logic
	// console.log("[Optimistic] Initialized optimistic update system");
}
