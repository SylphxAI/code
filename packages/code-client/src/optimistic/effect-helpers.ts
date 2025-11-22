/**
 * Effect Helpers
 *
 * Helper functions to generate effects for common optimistic operations.
 * These translate operations into state patches.
 */

import type { Effect, StatePatch } from "./effects.js";
import { cancelTimeout, emitEvent, log, patchState, scheduleTimeout } from "./effects.js";
import { applyInverse, applyOperation } from "./operations.js";
import type { Operation, SessionState } from "./types.js";

/**
 * Generate effects for applying an operation
 */
export function effectsForApply(
	sessionId: string,
	operation: Operation,
	optimisticId: string,
	baseState: SessionState,
	timeoutMs: number,
): Effect[] {
	const effects: Effect[] = [];

	// 1. Apply operation to get new state
	const newState = applyOperation(baseState, operation);

	// 2. Generate state patches
	const patches = generatePatchesForOperation(operation, baseState, newState);
	if (patches.length > 0) {
		effects.push(patchState(patches));
	}

	// 3. Schedule timeout for rollback
	effects.push(
		scheduleTimeout(optimisticId, timeoutMs, () => {
			// When timeout triggers, generate rollback effects
			return [
				log("warn", `Operation timed out: ${operation.type}`, { optimisticId }),
				...effectsForRollback(sessionId, operation, optimisticId, newState),
			];
		}),
	);

	// 4. Emit event
	effects.push(
		emitEvent("optimistic:applied", {
			sessionId,
			operationId: optimisticId,
			operationType: operation.type,
		}),
	);

	return effects;
}

/**
 * Generate effects for confirming an operation
 */
export function effectsForConfirm(
	sessionId: string,
	operation: Operation,
	optimisticId: string,
	serverData?: any,
): Effect[] {
	const effects: Effect[] = [];

	// 1. Cancel timeout
	effects.push(cancelTimeout(optimisticId));

	// 2. If server data provided, update with confirmed data
	if (serverData) {
		const patches = generatePatchesForServerData(operation, serverData);
		if (patches.length > 0) {
			effects.push(patchState(patches));
		}
	}

	// 3. Emit event
	effects.push(
		emitEvent("optimistic:confirmed", {
			sessionId,
			operationId: optimisticId,
			operationType: operation.type,
		}),
	);

	return effects;
}

/**
 * Generate effects for rolling back an operation
 */
export function effectsForRollback(
	sessionId: string,
	operation: Operation,
	optimisticId: string,
	currentState: SessionState,
): Effect[] {
	const effects: Effect[] = [];

	// 1. Cancel timeout
	effects.push(cancelTimeout(optimisticId));

	// 2. Apply inverse operation to get rollback state
	const rolledBackState = applyInverse(currentState, operation);

	// 3. Generate state patches for rollback
	const patches = generatePatchesForOperation(operation, currentState, rolledBackState);
	if (patches.length > 0) {
		effects.push(patchState(patches));
	}

	// 4. Emit event
	effects.push(
		emitEvent("optimistic:rolled-back", {
			sessionId,
			operationId: optimisticId,
			operationType: operation.type,
		}),
	);

	return effects;
}

/**
 * Generate state patches for an operation
 * Maps operation changes to signal paths
 */
function generatePatchesForOperation(
	operation: Operation,
	prevState: SessionState,
	newState: SessionState,
): StatePatch[] {
	const patches: StatePatch[] = [];

	switch (operation.type) {
		case "update-session-status": {
			// Path: currentSession.status
			patches.push({
				path: "currentSession.status",
				value: newState.serverStatus,
				previousValue: prevState.serverStatus,
			});
			break;
		}

		case "add-message":
		case "move-to-queue":
		case "move-to-conversation": {
			// Messages changed
			if (newState.serverMessages !== prevState.serverMessages) {
				patches.push({
					path: "currentSession.messages",
					value: newState.serverMessages,
					previousValue: prevState.serverMessages,
				});
			}
			// Queue might have changed too
			if (newState.serverQueue !== prevState.serverQueue) {
				patches.push({
					path: "queuedMessages",
					value: newState.serverQueue,
					previousValue: prevState.serverQueue,
				});
			}
			break;
		}

		case "add-to-queue":
		case "remove-from-queue": {
			// Queue changed
			patches.push({
				path: "queuedMessages",
				value: newState.serverQueue,
				previousValue: prevState.serverQueue,
			});
			break;
		}

		case "update-message-status": {
			// Messages changed (status update)
			patches.push({
				path: "currentSession.messages",
				value: newState.serverMessages,
				previousValue: prevState.serverMessages,
			});
			break;
		}
	}

	return patches;
}

/**
 * Generate patches for server-confirmed data
 */
function generatePatchesForServerData(operation: Operation, serverData: any): StatePatch[] {
	const patches: StatePatch[] = [];

	switch (operation.type) {
		case "add-message": {
			// Replace optimistic message with server message
			// This is handled by message reconciliation, not here
			// Just log for now
			break;
		}

		case "add-to-queue": {
			// Replace optimistic queue entry with server entry
			// This is handled by queue reconciliation, not here
			break;
		}

		// Other operations don't need server data updates
	}

	return patches;
}
