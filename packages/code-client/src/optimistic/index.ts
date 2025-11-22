/**
 * Optimistic Update System - Public API
 *
 * Exports all public APIs for optimistic updates
 */

// Core manager
export { optimisticManager, OptimisticManager } from "./manager.js";

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

// Integration (main API for clients)
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
