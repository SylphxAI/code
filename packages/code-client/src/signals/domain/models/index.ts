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

// Model details type
export interface ModelDetails {
	contextLength: number | null;
	capabilities: ModelCapabilities | null;
	tokenizerInfo: {
		modelName: string;
		tokenizerName: string;
		loaded: boolean;
		failed: boolean;
	} | null;
}

// Core signals - store models per provider
export const modelsByProvider = zen<Record<string, ModelInfo[]>>({});
export const modelsLoading = zen<boolean>(false);
export const modelsError = zen<string | null>(null);

// Model details cache - keyed by `${providerId}:${modelId}`
export const modelDetailsCache = zen<Record<string, ModelDetails>>({});
export const modelDetailsLoading = zen<boolean>(false);
export const modelDetailsError = zen<string | null>(null);

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

export function useModelDetailsCache(): Record<string, ModelDetails> {
	return useZen(modelDetailsCache);
}

export function useModelDetailsLoading(): boolean {
	return useZen(modelDetailsLoading);
}

export function useModelDetailsError(): string | null {
	return useZen(modelDetailsError);
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

export function setModelDetails(providerId: string, modelId: string, details: ModelDetails): void {
	const key = `${providerId}:${modelId}`;
	modelDetailsCache.value = {
		...modelDetailsCache.value,
		[key]: details,
	};
}

export function setModelDetailsLoading(loading: boolean): void {
	modelDetailsLoading.value = loading;
}

export function setModelDetailsError(error: string | null): void {
	modelDetailsError.value = error;
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

export function getModelDetails(providerId: string, modelId: string): ModelDetails | null {
	const key = `${providerId}:${modelId}`;
	return modelDetailsCache.value[key] || null;
}

export function getModelDetailsLoading(): boolean {
	return modelDetailsLoading.value;
}

export function getModelDetailsError(): string | null {
	return modelDetailsError.value;
}
