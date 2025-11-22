/**
 * Optimistic Update System - Public API
 *
 * Exports all public APIs for optimistic updates
 */

// V2 Effect System (from standalone package)
export type { Effect, EffectResult, StatePatch, EffectRunnerConfig } from "@sylphx/optimistic";
export {
	optimisticManagerV2,
	OptimisticManagerV2,
	runEffects,
	applyOperation,
	applyInverse,
	applyPendingOperations,
	patchState,
	scheduleTimeout,
	cancelTimeout,
	emitEvent,
	log,
} from "@sylphx/optimistic";

// Types (from standalone package)
export type {
	Message,
	SessionStatus,
	Operation,
	PendingOperation,
	ServerEvent,
	SessionState,
	FileAttachment,
	QueuedMessage,
} from "@sylphx/optimistic";

// Zen Signal Adapter (framework-specific, kept in code-client)
export { runOptimisticEffects } from "./zen-adapter.js";

// V1 Legacy (deprecated - will be removed in future)
export { optimisticManager, OptimisticManager } from "./manager.js";

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
