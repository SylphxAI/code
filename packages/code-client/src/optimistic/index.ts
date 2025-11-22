/**
 * Optimistic Update System - Public API
 *
 * Exports all public APIs for optimistic updates
 */

// Core managers
export { optimisticManager, OptimisticManager } from "./manager.js";
export { optimisticManagerV2, OptimisticManagerV2 } from "./manager-v2.js";

// Effect System (V2)
export type { Effect, EffectResult, StatePatch } from "./effects.js";
export { runEffects } from "./effect-runner.js";
export { runOptimisticEffects } from "./zen-adapter.js";

// Operations (for custom operations)
export { applyOperation, applyInverse, applyPendingOperations } from "./operations.js";

// Types
export type {
	Message,
	SessionStatus,
	Operation,
	PendingOperation,
	ServerEvent,
	SessionState,
} from "./types.js";

// Integration (main API for clients) - V1 (legacy)
export {
	trackOptimisticMessage,
	trackOptimisticSessionStatus,
	confirmOptimistic,
	rollbackOptimistic,
	reconcileWithServer,
	getOptimisticState,
	syncServerState,
	handleQueueMessageAddedWithOptimistic,
	handleQueueClearedWithOptimistic,
	handleUserMessageCreatedWithOptimistic,
	handleMessageStatusUpdatedWithOptimistic,
	handleSessionStatusUpdatedWithOptimistic,
	initOptimisticUpdates,
} from "./integration.js";
