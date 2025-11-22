/**
 * Zen Signal Adapter for Optimistic Updates
 *
 * Bridges the pure functional Effect System with Zen signals.
 * This adapter:
 * - Applies state patches to zen signals
 * - Emits events to event bus
 * - Logs messages
 *
 * Usage:
 * ```ts
 * const result = optimisticManagerV2.apply(sessionId, operation);
 * runOptimisticEffects(result.effects);
 * ```
 */

import { eventBus } from "../../signals/event-bus.js";
import { currentSession, setCurrentSession } from "../../signals/domain/session/index.js";
import type { Effect, StatePatch } from "./effects.js";
import type { EffectRunnerConfig } from "./effect-runner.js";
import { runEffects } from "./effect-runner.js";

/**
 * Apply state patch to zen signals
 */
function applyPatchToZenSignals(patch: StatePatch): void {
	switch (patch.path) {
		case "currentSession.status": {
			// Update status in current session
			const session = currentSession.value;
			if (session) {
				setCurrentSession({
					...session,
					status: patch.value,
				});
			}
			break;
		}

		case "currentSession.messages": {
			// Update messages in current session
			const session = currentSession.value;
			if (session) {
				setCurrentSession({
					...session,
					messages: patch.value,
				});
			}
			break;
		}

		case "queuedMessages": {
			// Update queued messages
			// NOTE: Queue is managed separately via queue signals
			// This patch would be handled by queue signal updates
			break;
		}

		default: {
			console.warn("[ZenAdapter] Unknown patch path:", patch.path);
		}
	}
}

/**
 * Effect runner config for zen signals
 */
const zenEffectRunnerConfig: EffectRunnerConfig = {
	applyPatch: applyPatchToZenSignals,
	emitEvent: (event, payload) => {
		eventBus.emit(event, payload);
	},
	log: (level, message, data) => {
		const prefix = "[Optimistic]";
		switch (level) {
			case "info":
				console.log(prefix, message, data);
				break;
			case "warn":
				console.warn(prefix, message, data);
				break;
			case "error":
				console.error(prefix, message, data);
				break;
		}
	},
};

/**
 * Run optimistic effects on zen signals
 *
 * This is the main entry point for executing effects.
 * Call this after any manager operation.
 *
 * @example
 * ```ts
 * const result = optimisticManagerV2.apply(sessionId, operation);
 * runOptimisticEffects(result.effects);
 * ```
 */
export function runOptimisticEffects(effects: Effect[]): void {
	runEffects(effects, zenEffectRunnerConfig);
}
