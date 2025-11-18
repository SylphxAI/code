/**
 * React Bridge for Zen Signals
 * Provides React hooks to consume Zen signals with automatic reactivity
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { subscribe } from "@sylphx/zen";

// zen@3.47.0 has a different type system
// Signals have a .value property (getter/setter)
type ZenSignal<T> = {
	value: T;
};

/**
 * React hook to subscribe to a Zen signal
 * Uses React 18+ useSyncExternalStore for optimal performance
 * @param signal Zen signal node
 * @returns Current value from the signal
 */
export function useZen<T>(signal: ZenSignal<T>): T {
	return useSyncExternalStore(
		(callback) => {
			// Subscribe to signal changes
			const unsubscribe = subscribe(signal, callback);
			return unsubscribe;
		},
		// Get current value
		() => signal.value,
		// Server snapshot (for SSR)
		() => signal.value,
	);
}

/**
 * Alias for useZen for backwards compatibility
 * @deprecated Use useZen instead
 */
export const useSignal = useZen;
