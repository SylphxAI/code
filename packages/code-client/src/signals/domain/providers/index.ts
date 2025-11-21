/**
 * Providers Domain Signals
 * Manages available AI providers data
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

// Provider type
export interface Provider {
	id: string;
	name: string;
}

// Core signals
export const providers = zen<Record<string, Provider>>({});
export const providersLoading = zen<boolean>(true);
export const providersError = zen<string | null>(null);

// React hooks
export function useProviders(): Record<string, Provider> {
	return useZen(providers);
}

export function useProvidersLoading(): boolean {
	return useZen(providersLoading);
}

export function useProvidersError(): string | null {
	return useZen(providersError);
}

// Actions
export function setProviders(value: Record<string, Provider>): void {
	providers.value = value;
}

export function setProvidersLoading(loading: boolean): void {
	providersLoading.value = loading;
}

export function setProvidersError(error: string | null): void {
	providersError.value = error;
}

// Getters for non-React code
export function getProviders(): Record<string, Provider> {
	return providers.value;
}

export function getProvidersLoading(): boolean {
	return providersLoading.value;
}

export function getProvidersError(): string | null {
	return providersError.value;
}
