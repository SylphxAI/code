/**
 * Bash Domain Signals
 * Manages bash process state
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

// Core signal
export const backgroundBashCount = zen<number>(0);

// React hook
export function useBackgroundBashCount(): number {
	return useZen(backgroundBashCount);
}

// Actions
export function setBackgroundBashCount(count: number): void {
	backgroundBashCount.value = count;
}

export function updateBackgroundBashCount(delta: number): void {
	backgroundBashCount.value = backgroundBashCount.value + delta;
}

// Getter for non-React code
export function getBackgroundBashCount(): number {
	return backgroundBashCount.value;
}
