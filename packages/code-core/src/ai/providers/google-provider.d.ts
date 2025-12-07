/**
 * Google Provider
 * Supports both AI Studio (apiKey) and Vertex AI (projectId + location)
 */
import type { LanguageModelV1 } from "ai";
import type { AIProvider, ConfigField, ModelCapabilities, ModelInfo, ProviderConfig, ProviderModelDetails } from "./base-provider.js";
export declare class GoogleProvider implements AIProvider {
    readonly id: "google";
    readonly name = "Google";
    readonly description = "Gemini models by Google";
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    fetchModels(_config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    getModelCapabilities(modelId: string): ModelCapabilities;
    createClient(config: ProviderConfig, modelId: string): Promise<LanguageModelV1>;
}
//# sourceMappingURL=google-provider.d.ts.map