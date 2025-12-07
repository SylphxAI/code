/**
 * OpenAI Provider
 */
import type { LanguageModelV1 } from "ai";
import type { AIProvider, ConfigField, ModelCapabilities, ModelInfo, ProviderConfig, ProviderModelDetails } from "./base-provider.js";
export declare class OpenAIProvider implements AIProvider {
    readonly id: "openai";
    readonly name = "OpenAI";
    readonly description = "GPT models by OpenAI";
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    fetchModels(config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    getModelCapabilities(modelId: string): ModelCapabilities;
    createClient(config: ProviderConfig, modelId: string): Promise<LanguageModelV1>;
}
//# sourceMappingURL=openai-provider.d.ts.map