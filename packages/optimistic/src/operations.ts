/**
 * Optimistic Operations - Apply and Inverse
 *
 * Each operation defines how to:
 * 1. Apply forward mutation (optimistic)
 * 2. Apply inverse mutation (rollback)
 */

import type { Message, Operation, QueuedMessage, SessionState } from "./types.js";

/**
 * Apply operation to state (forward)
 */
export function applyOperation(state: SessionState, op: Operation): SessionState {
	switch (op.type) {
		case "add-message": {
			// Add optimistic message to conversation
			const newMessage = { ...op.message, optimistic: true };
			return {
				...state,
				serverMessages: [...state.serverMessages, newMessage],
			};
		}

		case "add-to-queue": {
			// Add optimistic message to queue
			return {
				...state,
				serverQueue: [...state.serverQueue, op.queuedMessage],
			};
		}

		case "move-to-queue": {
			// Remove from conversation, add to queue
			return {
				...state,
				serverMessages: state.serverMessages.filter((m) => m.id !== op.messageId),
				serverQueue: [...state.serverQueue, op.queuedMessage],
			};
		}

		case "move-to-conversation": {
			// Remove from queue, add to conversation
			return {
				...state,
				serverQueue: state.serverQueue.filter((q) => q.id !== op.queueId),
				serverMessages: [...state.serverMessages, op.message],
			};
		}

		case "remove-from-queue": {
			// Remove from queue
			return {
				...state,
				serverQueue: state.serverQueue.filter((q) => q.id !== op.queueId),
			};
		}

		case "update-message-status": {
			// Update message status
			return {
				...state,
				serverMessages: state.serverMessages.map((m) =>
					m.id === op.messageId ? { ...m, status: op.status } : m,
				),
			};
		}

		case "update-session-status": {
			// Update session status (for status indicator)
			return {
				...state,
				serverStatus: op.status,
			};
		}

		default:
			return state;
	}
}

/**
 * Apply inverse operation (rollback)
 */
export function applyInverse(state: SessionState, op: Operation): SessionState {
	switch (op.type) {
		case "add-message": {
			// Remove optimistic message
			return {
				...state,
				serverMessages: state.serverMessages.filter((m) => m.id !== op.optimisticId),
			};
		}

		case "add-to-queue": {
			// Remove from queue
			return {
				...state,
				serverQueue: state.serverQueue.filter((q) => q.id !== op.optimisticId),
			};
		}

		case "move-to-queue": {
			// Reverse: remove from queue, add back to conversation
			return {
				...state,
				serverQueue: state.serverQueue.filter((q) => q.id !== op.queuedMessage.id),
				serverMessages: [
					...state.serverMessages,
					{
						id: op.messageId,
						role: "user",
						content: op.queuedMessage.content,
						optimistic: true,
					},
				],
			};
		}

		case "move-to-conversation": {
			// Reverse: remove from conversation, add back to queue
			return {
				...state,
				serverMessages: state.serverMessages.filter((m) => m.id !== op.message.id),
				serverQueue: [
					...state.serverQueue,
					{
						id: op.queueId,
						content: op.message.content,
						attachments: [],
						enqueuedAt: Date.now(),
					},
				],
			};
		}

		case "remove-from-queue": {
			// Cannot reverse remove (no data to restore)
			// This should only be called when server confirms
			return state;
		}

		case "update-message-status": {
			// Cannot reverse status update without previous status
			// This should only be called when server confirms
			return state;
		}

		case "update-session-status": {
			// Reverse: restore previous status
			return {
				...state,
				serverStatus: op.previousStatus,
			};
		}

		default:
			return state;
	}
}

/**
 * Apply all pending operations to base state
 */
export function applyPendingOperations(baseState: SessionState): SessionState {
	let result = baseState;

	for (const pending of baseState.pending) {
		result = applyOperation(result, pending.operation);
	}

	return result;
}
