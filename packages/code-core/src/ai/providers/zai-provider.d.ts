/**
 * Z.ai Provider
 * Uses OpenAI-compatible API
 */
import type { LanguageModelV1 } from "ai";
import type { AIProvider, ConfigField, ModelCapabilities, ModelInfo, ProviderConfig, ProviderModelDetails } from "./base-provider.js";
export declare class ZaiProvider implements AIProvider {
    readonly id: "zai";
    readonly name = "Z.ai";
    readonly description = "ZAI AI platform";
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    fetchModels(config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(modelId: string, config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    getModelCapabilities(modelId: string): ModelCapabilities;
    createClient(config: ProviderConfig, modelId: string): Promise<LanguageModelV1>;
}
//# sourceMappingURL=zai-provider.d.ts.map