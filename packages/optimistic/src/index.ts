/**
 * @sylphx/optimistic - Pure Functional Optimistic Update System
 *
 * Zero-dependency, framework-agnostic optimistic update system using Effect Pattern.
 *
 * Features:
 * - Pure functional (manager returns effects, no side effects)
 * - Framework agnostic (works with React, Vue, Svelte, Angular, etc.)
 * - Testable (mock effect runner for testing)
 * - Composable (effects can be combined/filtered/transformed)
 * - Self-healing (automatic reconciliation with server state)
 *
 * @example
 * ```ts
 * import { OptimisticManagerV2, runEffects } from '@sylphx/optimistic';
 *
 * const manager = new OptimisticManagerV2();
 *
 * // Apply optimistic update
 * const result = manager.apply(sessionId, {
 *   type: "update-session-status",
 *   sessionId,
 *   status: { text: "Processing...", duration: 0, tokenUsage: 0, isActive: true }
 * });
 *
 * // Run effects (updates state, schedules timeout, emits events)
 * runEffects(result.effects, {
 *   applyPatch: (patch) => updateMyState(patch),
 *   emitEvent: (event, payload) => eventBus.emit(event, payload),
 *   log: (level, message) => console[level](message)
 * });
 *
 * // Server confirms
 * const confirmed = manager.confirm(sessionId, result.operationId, serverData);
 * runEffects(confirmed.effects, config);
 * ```
 */

// Core Effect System
export type { Effect, EffectResult, StatePatch } from "./effects.js";
export { patchState, scheduleTimeout, cancelTimeout, emitEvent, log } from "./effects.js";
export type { EffectRunnerConfig } from "./effect-runner.js";
export { runEffects, runEffect } from "./effect-runner.js";

// Effect Helpers (internal - for extending)
export {
	effectsForApply,
	effectsForConfirm,
	effectsForRollback,
} from "./effect-helpers.js";

// V2 Manager (Pure Functional)
export { OptimisticManagerV2, optimisticManagerV2 } from "./manager-v2.js";

// Operations (for custom operations)
export { applyOperation, applyInverse, applyPendingOperations } from "./operations.js";

// Types
export type {
	Message,
	SessionStatus,
	FileAttachment,
	QueuedMessage,
	Operation,
	ServerEvent,
	PendingOperation,
	SessionState,
} from "./types.js";
