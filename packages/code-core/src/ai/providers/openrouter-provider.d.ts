/**
 * OpenRouter Provider
 * Uses OpenAI-compatible API
 */
import type { LanguageModelV1 } from "ai";
import type { AIProvider, ConfigField, ModelCapabilities, ModelInfo, ProviderConfig, ProviderModelDetails } from "./base-provider.js";
export declare class OpenRouterProvider implements AIProvider {
    readonly id: "openrouter";
    readonly name = "OpenRouter";
    readonly description = "Access multiple AI providers";
    /**
     * Shared TTL cache for models list (1 hour)
     * Shared across all instances to avoid duplicate API calls
     */
    private static modelsCache;
    /**
     * Cache for model capabilities from OpenRouter API
     * Maps modelId -> capabilities parsed from API response
     */
    private modelCapabilitiesCache;
    /**
     * Parse capabilities from OpenRouter API response
     * Uses ONLY actual API data - no hardcoded model name patterns
     * Returns Set of capability strings
     */
    private parseCapabilitiesFromAPI;
    /**
     * Default capabilities when API data is not available
     * Returns empty Set - user must call fetchModels first
     */
    private getDefaultCapabilities;
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    getModelCapabilities(modelId: string): ModelCapabilities;
    fetchModels(config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    createClient(config: ProviderConfig, modelId: string): Promise<LanguageModelV1>;
}
//# sourceMappingURL=openrouter-provider.d.ts.map