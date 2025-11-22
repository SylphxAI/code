/**
 * Effect Runner
 *
 * Executes effects returned by OptimisticManager.
 * Framework agnostic - can run effects on any state system.
 */

import type { Effect, StatePatch } from "./effects.js";

/**
 * Effect Runner Configuration
 */
export interface EffectRunnerConfig {
	/** Apply state patch (e.g., update zen signal, React state, etc.) */
	applyPatch: (patch: StatePatch) => void;
	/** Emit event (e.g., to event bus) */
	emitEvent?: (event: string, payload: any) => void;
	/** Log message */
	log?: (level: "info" | "warn" | "error", message: string, data?: any) => void;
}

/**
 * Active timeouts for cleanup
 */
const activeTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * Run effects
 */
export function runEffects(effects: Effect[], config: EffectRunnerConfig): void {
	for (const effect of effects) {
		runEffect(effect, config);
	}
}

/**
 * Run single effect
 */
export function runEffect(effect: Effect, config: EffectRunnerConfig): void {
	switch (effect.type) {
		case "PATCH_STATE": {
			for (const patch of effect.patches) {
				config.applyPatch(patch);
			}
			break;
		}

		case "SCHEDULE_TIMEOUT": {
			// Cancel existing timeout with same ID
			const existing = activeTimeouts.get(effect.timeoutId);
			if (existing) {
				clearTimeout(existing);
			}

			// Schedule new timeout
			const timeout = setTimeout(() => {
				activeTimeouts.delete(effect.timeoutId);
				const timeoutEffects = effect.onTimeout();
				runEffects(timeoutEffects, config);
			}, effect.ms);

			activeTimeouts.set(effect.timeoutId, timeout);
			break;
		}

		case "CANCEL_TIMEOUT": {
			const timeout = activeTimeouts.get(effect.timeoutId);
			if (timeout) {
				clearTimeout(timeout);
				activeTimeouts.delete(effect.timeoutId);
			}
			break;
		}

		case "EMIT_EVENT": {
			config.emitEvent?.(effect.event, effect.payload);
			break;
		}

		case "LOG": {
			config.log?.(effect.level, effect.message, effect.data);
			break;
		}

		default: {
			const exhaustive: never = effect;
			console.warn("[EffectRunner] Unknown effect type:", exhaustive);
		}
	}
}

/**
 * Cleanup all active timeouts (for testing/teardown)
 */
export function cleanupTimeouts(): void {
	for (const [id, timeout] of activeTimeouts.entries()) {
		clearTimeout(timeout);
	}
	activeTimeouts.clear();
}
