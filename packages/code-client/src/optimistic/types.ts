/**
 * Optimistic Update System - Types
 *
 * Supports multi-step optimistic updates with automatic rollback
 * and self-healing reconciliation with server state.
 *
 * Architecture:
 * - Operation: Defines a state mutation with its inverse
 * - OptimisticManager: Manages pending operations (apply/confirm/rollback)
 * - Reconciler: Self-healing when server state differs
 */

import type { QueuedMessage } from "@sylphx/code-core";

/**
 * Message in conversation (simplified)
 */
export interface Message {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	status?: "active" | "completed" | "error" | "abort";
	optimistic?: boolean; // True if not yet confirmed by server
}

/**
 * Operation Types
 * Each operation defines a forward mutation and its inverse
 */
export type Operation =
	// Add message to conversation (optimistic)
	| {
			type: "add-message";
			sessionId: string;
			optimisticId: string;
			message: Message;
	  }
	// Add message to queue (optimistic)
	| {
			type: "add-to-queue";
			sessionId: string;
			optimisticId: string;
			queuedMessage: QueuedMessage;
	  }
	// Move message from conversation to queue
	| {
			type: "move-to-queue";
			sessionId: string;
			messageId: string;
			queuedMessage: QueuedMessage;
	  }
	// Move message from queue to conversation
	| {
			type: "move-to-conversation";
			sessionId: string;
			queueId: string;
			message: Message;
	  }
	// Remove from queue
	| {
			type: "remove-from-queue";
			sessionId: string;
			queueId: string;
	  }
	// Update message status
	| {
			type: "update-message-status";
			sessionId: string;
			messageId: string;
			status: "active" | "completed" | "error" | "abort";
	  };

/**
 * Server Event (for reconciliation)
 * Maps server events to optimistic operations
 */
export type ServerEvent =
	| {
			type: "user-message-created";
			messageId: string;
			content: string;
	  }
	| {
			type: "queue-message-added";
			sessionId: string;
			message: QueuedMessage;
	  }
	| {
			type: "queue-cleared";
			sessionId: string;
	  }
	| {
			type: "message-status-updated";
			messageId: string;
			status: "active" | "completed" | "error" | "abort";
	  };

/**
 * Pending Operation (with timestamp for timeout)
 */
export interface PendingOperation {
	id: string;
	operation: Operation;
	timestamp: number;
}

/**
 * Session State (server + optimistic layer)
 */
export interface SessionState {
	sessionId: string;
	// Server state (source of truth)
	serverMessages: Message[];
	serverQueue: QueuedMessage[];
	// Optimistic operations (pending confirmation)
	pending: PendingOperation[];
}
