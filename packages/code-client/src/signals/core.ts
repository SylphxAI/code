/**
 * Framework-Agnostic Signals
 * Minimal signal implementation with no framework dependencies
 *
 * ARCHITECTURE:
 * - @sylphx/zen has advanced features (computed, batched, map, karma, etc.)
 * - This implementation extracts only what we need: zen(), get(), set(), subscribe()
 * - Compatible with both React (via hooks) and SolidJS (future GUI)
 * - Zero framework coupling in code-client
 */

// ============================================================================
// Types
// ============================================================================

export type Listener<T> = (value: T, oldValue?: T) => void;
export type Unsubscribe = () => void;

export interface Signal<T> {
	_kind: "signal";
	_value: T;
	_listeners?: Listener<T>[];
}

// ============================================================================
// Core Signal Functions
// ============================================================================

/**
 * Creates a writable signal
 *
 * @example
 * ```ts
 * const $count = signal(0);
 * subscribe($count, (value) => console.log(value));
 * set($count, 1);
 * ```
 */
export function signal<T>(initialValue: T): Signal<T> {
	return {
		_kind: "signal",
		_value: initialValue,
		_listeners: undefined,
	};
}

/**
 * Gets the current value of a signal
 *
 * @example
 * ```ts
 * const $count = signal(0);
 * get($count); // 0
 * ```
 */
export function get<T>(store: Signal<T>): T {
	return store._value;
}

/**
 * Sets a new value for a signal and notifies listeners
 *
 * @example
 * ```ts
 * const $count = signal(0);
 * set($count, 1);
 * ```
 */
export function set<T>(store: Signal<T>, value: T): void {
	const oldValue = store._value;

	// Only update if value changed (Object.is equality)
	if (Object.is(oldValue, value)) {
		return;
	}

	store._value = value;

	// Notify listeners
	if (store._listeners && store._listeners.length > 0) {
		for (const listener of store._listeners) {
			listener(value, oldValue);
		}
	}
}

/**
 * Subscribes to signal changes
 *
 * @example
 * ```ts
 * const $count = signal(0);
 * const unsubscribe = subscribe($count, (value) => {
 *   console.log("Count:", value);
 * });
 *
 * set($count, 1); // Logs: Count: 1
 * unsubscribe(); // Stop listening
 * ```
 */
export function subscribe<T>(
	store: Signal<T>,
	listener: Listener<T>,
): Unsubscribe {
	// Initialize listeners array if needed
	if (!store._listeners) {
		store._listeners = [];
	}

	// Add listener
	store._listeners.push(listener);

	// Return unsubscribe function
	return () => {
		if (!store._listeners) return;

		const index = store._listeners.indexOf(listener);
		if (index !== -1) {
			store._listeners.splice(index, 1);
		}
	};
}

/**
 * Creates a computed signal that derives its value from other signals
 *
 * ASSUMPTION: For now, use @sylphx/zen's computed() until we need custom implementation
 * ALTERNATIVE: Implement custom computed() if we need to remove @sylphx/zen dependency entirely
 */
export { computed } from "@sylphx/zen";
