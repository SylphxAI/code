/**
 * Anthropic Provider
 */
import type { LanguageModelV1 } from "ai";
import type { AIProvider, ConfigField, ModelCapabilities, ModelInfo, ProviderConfig, ProviderModelDetails } from "./base-provider.js";
export declare class AnthropicProvider implements AIProvider {
    readonly id: "anthropic";
    readonly name = "Anthropic";
    readonly description = "Claude models by Anthropic";
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    fetchModels(_config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    getModelCapabilities(modelId: string): ModelCapabilities;
    createClient(config: ProviderConfig, modelId: string): Promise<LanguageModelV1>;
}
//# sourceMappingURL=anthropic-provider.d.ts.map