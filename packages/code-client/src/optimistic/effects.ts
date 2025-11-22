/**
 * Effect System for Optimistic Updates
 *
 * Pure functional effects that describe state changes without executing them.
 * This enables:
 * - Testability (mock effect runner)
 * - Composability (combine/filter/transform effects)
 * - Framework agnostic (works with any state system)
 * - Time-travel debugging (record and replay effects)
 * - Multi-client sync (serialize effects)
 */

import type { Operation } from "./types.js";

/**
 * State Patch - describes a state change
 */
export interface StatePatch {
	/** Path to the property (e.g., 'currentSession.status') */
	path: string;
	/** New value to set */
	value: any;
	/** Previous value (for rollback) */
	previousValue?: any;
}

/**
 * Effect Types
 * Each effect describes a side effect to be executed
 */
export type Effect =
	// Update state via patches
	| {
			type: "PATCH_STATE";
			patches: StatePatch[];
	  }
	// Schedule a timeout that returns effects when triggered
	| {
			type: "SCHEDULE_TIMEOUT";
			timeoutId: string;
			ms: number;
			onTimeout: () => Effect[];
	  }
	// Cancel a scheduled timeout
	| {
			type: "CANCEL_TIMEOUT";
			timeoutId: string;
	  }
	// Emit an event
	| {
			type: "EMIT_EVENT";
			event: string;
			payload: any;
	  }
	// Log a message (for debugging)
	| {
			type: "LOG";
			level: "info" | "warn" | "error";
			message: string;
			data?: any;
	  };

/**
 * Effect Result - return value from manager operations
 */
export interface EffectResult {
	/** Effects to execute */
	effects: Effect[];
	/** Operation ID for tracking */
	operationId?: string;
}

/**
 * Helper to create state patch effect
 */
export function patchState(patches: StatePatch[]): Effect {
	return { type: "PATCH_STATE", patches };
}

/**
 * Helper to create timeout effect
 */
export function scheduleTimeout(
	timeoutId: string,
	ms: number,
	onTimeout: () => Effect[],
): Effect {
	return { type: "SCHEDULE_TIMEOUT", timeoutId, ms, onTimeout };
}

/**
 * Helper to create cancel timeout effect
 */
export function cancelTimeout(timeoutId: string): Effect {
	return { type: "CANCEL_TIMEOUT", timeoutId };
}

/**
 * Helper to create event effect
 */
export function emitEvent(event: string, payload: any): Effect {
	return { type: "EMIT_EVENT", event, payload };
}

/**
 * Helper to create log effect
 */
export function log(level: "info" | "warn" | "error", message: string, data?: any): Effect {
	return { type: "LOG", level, message, data };
}

/**
 * Combine multiple effect results
 */
export function combineEffects(...results: EffectResult[]): Effect[] {
	return results.flatMap((r) => r.effects);
}
