/**
 * Claude Code Provider
 * Uses Claude Code CLI with OAuth authentication
 * Supports Vercel AI SDK tools (executed by framework, not CLI)
 */
import type { LanguageModelV2 } from "@ai-sdk/provider";
import type { AIProvider, ConfigField, ModelInfo, ProviderConfig, ProviderModelDetails } from "./base-provider.js";
export declare class ClaudeCodeProvider implements AIProvider {
    readonly id: "claude-code";
    readonly name = "Claude Code";
    readonly description = "Claude Code local models";
    getConfigSchema(): ConfigField[];
    isConfigured(_config: ProviderConfig): boolean;
    fetchModels(_config: ProviderConfig): Promise<ModelInfo[]>;
    getModelCapabilities(_modelId: string): import("./base-provider.js").ModelCapabilities;
    getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null>;
    createClient(_config: ProviderConfig, modelId: string): LanguageModelV2;
}
//# sourceMappingURL=claude-code-provider.d.ts.map