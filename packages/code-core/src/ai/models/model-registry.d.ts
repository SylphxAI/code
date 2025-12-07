/**
 * Centralized Model Registry
 * Single source of truth for AI model metadata across all providers
 *
 * Benefits:
 * - One place to update model info (context length, max output)
 * - Consistent model metadata across the application
 * - Easy to add new models
 * - Type-safe access
 *
 * Usage:
 * ```ts
 * import { MODEL_REGISTRY } from './models/model-registry';
 * const models = MODEL_REGISTRY.anthropic.models;
 * const details = MODEL_REGISTRY.anthropic.details['claude-3-5-sonnet-20241022'];
 * ```
 */
import type { ModelInfo, ProviderModelDetails } from "../providers/base-provider.js";
/**
 * Provider model registry entry
 */
export interface ProviderModelRegistry {
    models: ModelInfo[];
    details: Record<string, ProviderModelDetails>;
    consoleUrl?: string;
    docsUrl?: string;
}
/**
 * Centralized Model Registry
 * Maps provider ID to their model catalog
 */
export declare const MODEL_REGISTRY: {
    readonly anthropic: ProviderModelRegistry;
    readonly openai: ProviderModelRegistry;
    readonly google: ProviderModelRegistry;
};
/**
 * Provider IDs with static model registries
 * (excludes providers that fetch models dynamically like OpenRouter, Kimi)
 */
export type StaticProviderID = keyof typeof MODEL_REGISTRY;
/**
 * Helper: Get models for a provider
 */
export declare function getProviderModels(providerId: StaticProviderID): ModelInfo[];
/**
 * Helper: Get model details
 */
export declare function getModelDetails(providerId: StaticProviderID, modelId: string): ProviderModelDetails | null;
/**
 * Helper: Get provider console URL
 */
export declare function getProviderConsoleUrl(providerId: StaticProviderID): string | undefined;
/**
 * Helper: Get provider docs URL
 */
export declare function getProviderDocsUrl(providerId: StaticProviderID): string | undefined;
//# sourceMappingURL=model-registry.d.ts.map