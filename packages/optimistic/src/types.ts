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

/**
 * File Attachment
 */
export interface FileAttachment {
	fileId: string; // Reference to uploaded file in object storage
	relativePath: string; // Display name (e.g., "image.png" or "src/app.ts")
	size: number; // File size in bytes
	mimeType: string; // MIME type (e.g., "image/png")
	type?: "file" | "image"; // Attachment type (default: "file")
}

/**
 * Queued Message
 */
export interface QueuedMessage {
	id: string; // temp-queue-{timestamp}
	content: string; // User message text
	attachments: FileAttachment[]; // File references
	enqueuedAt: number; // Unix timestamp (ms)
}

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
 * Session Status (for status indicator)
 */
export interface SessionStatus {
	text: string;
	duration: number;
	tokenUsage: number;
	isActive: boolean;
}

/**
 * Operation Types
 * Each operation defines a forward mutation and its inverse
 *
 * Design: Generic enough to support any entity type (messages, sessions, etc.)
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
	  }
	// Update session status (for status indicator)
	| {
			type: "update-session-status";
			sessionId: string;
			status: SessionStatus;
			previousStatus?: SessionStatus; // For rollback
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
	  }
	| {
			type: "session-status-updated";
			sessionId: string;
			status: SessionStatus;
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
	serverStatus?: SessionStatus; // Session-level status (for status indicator)
	// Optimistic operations (pending confirmation)
	pending: PendingOperation[];
}
