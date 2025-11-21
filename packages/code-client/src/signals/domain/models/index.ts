/**
 * Models Domain Signals
 * Manages available models data per provider
 */

import type { ModelCapabilities } from "@sylphx/code-core";
import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

// Model type
export interface ModelInfo {
	id: string;
	name: string;
	contextLength?: number;
	capabilities?: ModelCapabilities;
}

// Core signals - store models per provider
export const modelsByProvider = zen<Record<string, ModelInfo[]>>({});
export const modelsLoading = zen<boolean>(false);
export const modelsError = zen<string | null>(null);

// React hooks
export function useModelsByProvider(): Record<string, ModelInfo[]> {
	return useZen(modelsByProvider);
}

export function useModelsLoading(): boolean {
	return useZen(modelsLoading);
}

export function useModelsError(): string | null {
	return useZen(modelsError);
}

// Actions
export function setModelsForProvider(providerId: string, models: ModelInfo[]): void {
	modelsByProvider.value = {
		...modelsByProvider.value,
		[providerId]: models,
	};
}

export function setModelsLoading(loading: boolean): void {
	modelsLoading.value = loading;
}

export function setModelsError(error: string | null): void {
	modelsError.value = error;
}

export function clearModelsForProvider(providerId: string): void {
	const { [providerId]: _, ...rest } = modelsByProvider.value;
	modelsByProvider.value = rest;
}

// Getters for non-React code
export function getModelsByProvider(): Record<string, ModelInfo[]> {
	return modelsByProvider.value;
}

export function getModelsForProvider(providerId: string): ModelInfo[] {
	return modelsByProvider.value[providerId] || [];
}

export function getModelsLoading(): boolean {
	return modelsLoading.value;
}

export function getModelsError(): string | null {
	return modelsError.value;
}
