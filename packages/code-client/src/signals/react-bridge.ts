/**
 * React Bridge for SolidJS Signals
 * Provides React hooks to consume SolidJS Accessors
 */

import { useEffect, useState } from "react";
import type { Accessor } from "solid-js";

// Use setImmediate for Node.js, requestAnimationFrame for browser
const scheduleCheck = typeof requestAnimationFrame !== "undefined"
	? requestAnimationFrame
	: setImmediate;

/**
 * React hook to subscribe to a SolidJS Accessor
 * @param accessor SolidJS signal getter function
 * @returns Current value from the signal
 */
export function useSignal<T>(accessor: Accessor<T>): T {
	const [value, setValue] = useState<T>(accessor);

	useEffect(() => {
		// SolidJS signals don't have built-in subscription mechanism
		// We poll for changes using scheduleCheck (requestAnimationFrame in browser, setImmediate in Node.js)
		let isActive = true;
		let lastValue = accessor();

		const check = () => {
			if (!isActive) return;
			const currentValue = accessor();
			if (currentValue !== lastValue) {
				lastValue = currentValue;
				setValue(currentValue);
			}
			scheduleCheck(check);
		};

		check();

		return () => {
			isActive = false;
		};
	}, [accessor]);

	return value;
}
