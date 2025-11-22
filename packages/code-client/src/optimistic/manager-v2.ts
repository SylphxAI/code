/**
 * Optimistic Manager V2 - Effect System
 *
 * Pure functional manager that returns effects instead of mutating state.
 * This version is:
 * - Testable (no side effects)
 * - Composable (effects can be combined/filtered)
 * - Framework agnostic (works with any state system)
 * - Ready for extraction as standalone package
 */

import type { Effect, EffectResult } from "./effects.js";
import { effectsForApply, effectsForConfirm, effectsForRollback } from "./effect-helpers.js";
import { applyPendingOperations } from "./operations.js";
import type { Operation, PendingOperation, ServerEvent, SessionState } from "./types.js";

const OPERATION_TIMEOUT_MS = 10000; // 10 seconds

export class OptimisticManagerV2 {
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
	 * Returns effects to execute (no side effects)
	 */
	apply(sessionId: string, op: Operation): EffectResult {
		const state = this.getSession(sessionId);
		const optimisticId = `optimistic-${this.nextOptimisticId++}`;

		// Add to pending operations (internal state only)
		const pending: PendingOperation = {
			id: optimisticId,
			operation: op,
			timestamp: Date.now(),
		};

		state.pending.push(pending);

		// Generate effects (pure)
		const effects = effectsForApply(sessionId, op, optimisticId, state, OPERATION_TIMEOUT_MS);

		return {
			effects,
			operationId: optimisticId,
		};
	}

	/**
	 * Confirm operation (server acknowledged)
	 * Returns effects to execute (no side effects)
	 */
	confirm(sessionId: string, optimisticId: string, serverData?: any): EffectResult {
		const state = this.getSession(sessionId);
		const pendingIndex = state.pending.findIndex((p) => p.id === optimisticId);

		if (pendingIndex === -1) {
			console.warn(`[Optimistic] Cannot confirm ${optimisticId} - not found`);
			return { effects: [] };
		}

		const pending = state.pending[pendingIndex];

		// Remove from pending (internal state only)
		state.pending.splice(pendingIndex, 1);

		// Generate effects (pure)
		const effects = effectsForConfirm(sessionId, pending.operation, optimisticId, serverData);

		return {
			effects,
			operationId: optimisticId,
		};
	}

	/**
	 * Rollback operation (server rejected or timeout)
	 * Returns effects to execute (no side effects)
	 */
	rollback(sessionId: string, optimisticId: string): EffectResult {
		const state = this.getSession(sessionId);
		const pendingIndex = state.pending.findIndex((p) => p.id === optimisticId);

		if (pendingIndex === -1) {
			console.warn(`[Optimistic] Cannot rollback ${optimisticId} - not found`);
			return { effects: [] };
		}

		const pending = state.pending[pendingIndex];

		// Remove from pending (internal state only)
		state.pending.splice(pendingIndex, 1);

		// Generate effects (pure)
		const currentState = this.getState(sessionId);
		const effects = effectsForRollback(sessionId, pending.operation, optimisticId, currentState);

		return {
			effects,
			operationId: optimisticId,
		};
	}

	/**
	 * Reconcile with server event
	 * Self-healing: rollback operations that conflict with server state
	 * Returns effects to execute (no side effects)
	 */
	reconcile(sessionId: string, event: ServerEvent): EffectResult {
		const state = this.getSession(sessionId);
		const effects: Effect[] = [];

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
					const rollbackResult = this.rollback(sessionId, conflicting.id);
					effects.push(...rollbackResult.effects);

					// Apply correct operation: add-to-queue
					const corrected: Operation = {
						type: "add-to-queue",
						sessionId,
						optimisticId: event.message.id,
						queuedMessage: event.message,
					};
					const applyResult = this.apply(sessionId, corrected);
					effects.push(...applyResult.effects);

					const confirmResult = this.confirm(sessionId, event.message.id, event.message);
					effects.push(...confirmResult.effects);
				}
				break;
			}

			case "queue-cleared": {
				// Remove all pending queue operations
				const queueOps = state.pending.filter(
					(p) => p.operation.type === "add-to-queue" && p.operation.sessionId === sessionId,
				);

				for (const op of queueOps) {
					const rollbackResult = this.rollback(sessionId, op.id);
					effects.push(...rollbackResult.effects);
				}
				break;
			}
		}

		return { effects };
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
	 * This is still stateful (stores server state internally)
	 * but doesn't generate effects - consumer should already have the data
	 */
	updateServerState(
		sessionId: string,
		updates: Partial<Pick<SessionState, "serverMessages" | "serverQueue" | "serverStatus">>,
	): void {
		const state = this.getSession(sessionId);

		if (updates.serverMessages) {
			state.serverMessages = updates.serverMessages;
		}

		if (updates.serverQueue) {
			state.serverQueue = updates.serverQueue;
		}

		if (updates.serverStatus !== undefined) {
			state.serverStatus = updates.serverStatus;
		}
	}
}

/**
 * Global optimistic manager instance (V2)
 */
export const optimisticManagerV2 = new OptimisticManagerV2();
