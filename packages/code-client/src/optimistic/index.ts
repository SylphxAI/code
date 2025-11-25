/**
 * Optimistic Update System - Deprecated
 *
 * This module is DEPRECATED. Use Lens OptimisticManager instead.
 *
 * Lens provides:
 * - Automatic optimistic updates via .optimistic() on mutations
 * - Automatic reconciliation via wrapSubscriptionWithOptimistic()
 * - Type-safe, frontend-driven architecture
 *
 * See @sylphx/lens-client for the new optimistic update system.
 */

// Re-export queue handlers (still needed for direct signal updates)
export {
	handleQueueCleared,
	handleQueueMessageAdded,
	handleQueueMessageRemoved,
	handleQueueMessageUpdated,
} from "../signals/domain/queue/index.js";

// Note: Old optimistic functions are REMOVED
// - trackOptimisticMessage → Use Lens mutation .optimistic()
// - optimisticManagerV2 → Use Lens OptimisticManager
// - runOptimisticEffects → Handled automatically by Lens
