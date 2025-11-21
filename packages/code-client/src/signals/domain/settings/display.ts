/**
 * Display Settings Domain Signals
 * Manages UI display preferences
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

// Display preference signals
export const hideMessageTitles = zen<boolean>(true); // default: hide
export const hideMessageUsage = zen<boolean>(true); // default: hide

// React hooks
export function useHideMessageTitles(): boolean {
	return useZen(hideMessageTitles);
}

export function useHideMessageUsage(): boolean {
	return useZen(hideMessageUsage);
}

// Actions
export function setHideMessageTitles(hide: boolean): void {
	hideMessageTitles.value = hide;
}

export function setHideMessageUsage(hide: boolean): void {
	hideMessageUsage.value = hide;
}

// Getters for non-React code
export function getHideMessageTitles(): boolean {
	return hideMessageTitles.value;
}

export function getHideMessageUsage(): boolean {
	return hideMessageUsage.value;
}
