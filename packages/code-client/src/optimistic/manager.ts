/**
 * Optimistic Manager
 *
 * Manages pending optimistic operations:
 * - apply: Add optimistic update
 * - confirm: Server confirmed operation
 * - rollback: Server rejected operation
 * - reconcile: Self-healing on server state mismatch
 */

import { applyInverse, applyOperation, applyPendingOperations } from "./operations.js";
import type { Operation, PendingOperation, ServerEvent, SessionState } from "./types.js";

const OPERATION_TIMEOUT_MS = 10000; // 10 seconds

export class OptimisticManager {
	private sessions = new Map<string, SessionState>();
	private nextOptimisticId = 1;

	/**
	 * Get or create session state
	 */
	private getSession(sessionId: string): SessionState {
		let state = this.sessions.get(sessionId);
		if (!state) {
			state = {
				sessionId,
				serverMessages: [],
				serverQueue: [],
				pending: [],
			};
			this.sessions.set(sessionId, state);
		}
		return state;
	}

	/**
	 * Apply optimistic operation
	 * Returns optimistic ID for later confirmation/rollback
	 */
	apply(sessionId: string, op: Operation): string {
		const state = this.getSession(sessionId);
		const optimisticId = `optimistic-${this.nextOptimisticId++}`;

		// Add to pending operations
		const pending: PendingOperation = {
			id: optimisticId,
			operation: op,
			timestamp: Date.now(),
		};

		state.pending.push(pending);
		// console.log(`[Optimistic] Applied ${op.type} (${optimisticId})`);

		return optimisticId;
	}

	/**
	 * Confirm operation (server acknowledged)
	 * Remove from pending, update server state
	 */
	confirm(sessionId: string, optimisticId: string, serverData?: any): void {
		const state = this.getSession(sessionId);
		const pendingIndex = state.pending.findIndex((p) => p.id === optimisticId);

		if (pendingIndex === -1) {
			console.warn(`[Optimistic] Cannot confirm ${optimisticId} - not found`);
			return;
		}

		const pending = state.pending[pendingIndex];

		// Remove from pending
		state.pending.splice(pendingIndex, 1);

		// Update server state with confirmed data
		if (serverData) {
			this.updateServerState(state, pending.operation, serverData);
		}

		// console.log(`[Optimistic] Confirmed ${pending.operation.type} (${optimisticId})`);
	}

	/**
	 * Rollback operation (server rejected or timeout)
	 */
	rollback(sessionId: string, optimisticId: string): void {
		const state = this.getSession(sessionId);
		const pendingIndex = state.pending.findIndex((p) => p.id === optimisticId);

		if (pendingIndex === -1) {
			console.warn(`[Optimistic] Cannot rollback ${optimisticId} - not found`);
			return;
		}

		const pending = state.pending[pendingIndex];

		// Remove from pending
		state.pending.splice(pendingIndex, 1);

		// Apply inverse operation to server state
		const newState = applyInverse(state, pending.operation);
		state.serverMessages = newState.serverMessages;
		state.serverQueue = newState.serverQueue;

		// console.log(`[Optimistic] Rolled back ${pending.operation.type} (${optimisticId})`);
	}

	/**
	 * Update server state with confirmed data
	 */
	private updateServerState(state: SessionState, op: Operation, serverData: any): void {
		switch (op.type) {
			case "add-message": {
				// Replace optimistic message with server message
				const index = state.serverMessages.findIndex(
					(m) => m.id === op.optimisticId || m.optimistic,
				);
				if (index !== -1) {
					state.serverMessages[index] = {
						...serverData,
						optimistic: false,
					};
				}
				break;
			}

			case "add-to-queue": {
				// Replace optimistic queue entry with server entry
				const index = state.serverQueue.findIndex((q) => q.id === op.optimisticId);
				if (index !== -1) {
					state.serverQueue[index] = serverData;
				}
				break;
			}

			// Other operations don't need server data updates
		}
	}

	/**
	 * Reconcile with server event
	 * Self-healing: rollback operations that conflict with server state
	 */
	reconcile(sessionId: string, event: ServerEvent): void {
		const state = this.getSession(sessionId);

		switch (event.type) {
			case "queue-message-added": {
				// Check if we have pending add-message that should be add-to-queue
				const conflicting = state.pending.find(
					(p) =>
						p.operation.type === "add-message" &&
						p.operation.message.content === event.message.content,
				);

				if (conflicting) {
					// Rollback add-message
					this.rollback(sessionId, conflicting.id);

					// Apply correct operation: add-to-queue
					const corrected: Operation = {
						type: "add-to-queue",
						sessionId,
						optimisticId: event.message.id,
						queuedMessage: event.message,
					};
					this.apply(sessionId, corrected);
					this.confirm(sessionId, event.message.id, event.message);

					// console.log(`[Optimistic] Self-healed: moved message to queue`);
				}
				break;
			}

			case "queue-cleared": {
				// Remove all pending queue operations
				const queueOps = state.pending.filter(
					(p) => p.operation.type === "add-to-queue" && p.operation.sessionId === sessionId,
				);

				for (const op of queueOps) {
					this.rollback(sessionId, op.id);
				}
				break;
			}
		}
	}

	/**
	 * Get computed state (server + optimistic layer)
	 */
	getState(sessionId: string): SessionState {
		const baseState = this.getSession(sessionId);
		return applyPendingOperations(baseState);
	}

	/**
	 * Update server state directly (from server events)
	 */
	updateServerState(
		sessionId: string,
		updates: Partial<Pick<SessionState, "serverMessages" | "serverQueue">>,
	): void {
		const state = this.getSession(sessionId);

		if (updates.serverMessages) {
			state.serverMessages = updates.serverMessages;
		}

		if (updates.serverQueue) {
			state.serverQueue = updates.serverQueue;
		}
	}

	/**
	 * Cleanup timed-out operations
	 */
	cleanupTimedOut(): void {
		const now = Date.now();

		for (const [sessionId, state] of this.sessions.entries()) {
			const timedOut = state.pending.filter((p) => now - p.timestamp > OPERATION_TIMEOUT_MS);

			for (const op of timedOut) {
				console.warn(`[Optimistic] Operation timed out: ${op.operation.type} (${op.id})`);
				this.rollback(sessionId, op.id);
			}
		}
	}
}

/**
 * Global optimistic manager instance
 */
export const optimisticManager = new OptimisticManager();

// Cleanup timed-out operations every 5 seconds
setInterval(() => optimisticManager.cleanupTimedOut(), 5000);
