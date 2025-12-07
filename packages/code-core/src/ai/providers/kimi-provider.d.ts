/**
 * Kimi Provider
 * Uses OpenAI-compatible API
 */
import type { LanguageModelV1 } from "ai";
import type { AIProvider, ConfigField, ModelCapabilities, ModelInfo, ProviderConfig, ProviderModelDetails } from "./base-provider.js";
export declare class KimiProvider implements AIProvider {
    readonly id: "kimi";
    readonly name = "Kimi";
    readonly description = "Moonshot AI Kimi platform";
    getConfigSchema(): ConfigField[];
    isConfigured(config: ProviderConfig): boolean;
    fetchModels(config: ProviderConfig): Promise<ModelInfo[]>;
    getModelDetails(_modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    getModelCapabilities(_modelId: string): ModelCapabilities;
    createClient(config: ProviderConfig, modelId: string): Promise<LanguageModelV1>;
}
//# sourceMappingURL=kimi-provider.d.ts.map