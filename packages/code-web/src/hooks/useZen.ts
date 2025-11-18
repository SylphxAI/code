/**
 * Preact Bridge for Zen Signals
 * Provides Preact hooks to consume Zen signals with automatic reactivity
 */

import { subscribe } from "@sylphx/zen";
import { useEffect, useState } from "preact/hooks";

// zen@3.47.0 signal type
type ZenSignal<T> = {
	value: T;
};

/**
 * Preact hook to subscribe to a Zen signal
 * Uses manual subscription since Preact's useSyncExternalStore is in preact/compat
 * @param signal Zen signal node
 * @returns Current value from the signal
 */
export function useZen<T>(signal: ZenSignal<T>): T {
	const [value, setValue] = useState<T>(signal.value);

	useEffect(() => {
		// Subscribe to signal changes
		const unsubscribe = subscribe(signal, () => {
			setValue(signal.value);
		});

		// Sync initial value in case it changed before effect ran
		setValue(signal.value);

		return unsubscribe;
	}, [signal]);

	return value;
}
