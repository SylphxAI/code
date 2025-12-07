/**
 * Anthropic Provider
 */
import { getModelMetadata } from "../../utils/models-dev.js";
import { getProviderConsoleUrl, MODEL_REGISTRY } from "../models/model-registry.js";
import { hasRequiredFields } from "./base-provider.js";
/**
 * Lazy load Anthropic SDK to reduce initial bundle size
 * SDK is only loaded when provider is actually used
 */
let anthropicModule = null;
async function getAnthropicSdk() {
    if (!anthropicModule) {
        anthropicModule = await import("@ai-sdk/anthropic");
    }
    return anthropicModule;
}
export class AnthropicProvider {
    id = "anthropic";
    name = "Anthropic";
    description = "Claude models by Anthropic";
    getConfigSchema() {
        const consoleUrl = getProviderConsoleUrl("anthropic") || "https://console.anthropic.com";
        return [
            {
                key: "apiKey",
                label: "API Key",
                type: "string",
                required: true,
                secret: true,
                description: `Get your API key from ${consoleUrl}`,
                placeholder: "sk-ant-...",
            },
        ];
    }
    isConfigured(config) {
        return hasRequiredFields(this.getConfigSchema(), config);
    }
    async fetchModels(_config) {
        return MODEL_REGISTRY.anthropic.models;
    }
    async getModelDetails(modelId, _config) {
        // Try provider knowledge first
        const staticDetails = MODEL_REGISTRY.anthropic.details[modelId];
        if (staticDetails) {
            return staticDetails;
        }
        // Fall back to models.dev
        const metadata = await getModelMetadata(modelId);
        if (metadata) {
            return {
                contextLength: metadata.contextLength,
                maxOutput: metadata.maxOutput,
                inputPrice: metadata.inputPrice,
                outputPrice: metadata.outputPrice,
            };
        }
        return null;
    }
    getModelCapabilities(modelId) {
        const modelIdLower = modelId.toLowerCase();
        const capabilities = new Set();
        // All Claude models support tools
        capabilities.add("tools");
        // Claude 3+ models support vision
        if (modelIdLower.includes("claude-3") ||
            modelIdLower.includes("claude-sonnet") ||
            modelIdLower.includes("claude-opus") ||
            modelIdLower.includes("claude-haiku")) {
            capabilities.add("image-input");
        }
        // Extended thinking models (Claude with extended thinking)
        if (modelIdLower.includes("extended") || modelIdLower.includes("thinking")) {
            capabilities.add("reasoning");
        }
        // Claude 3+ supports structured output
        if (modelIdLower.includes("claude-3") ||
            modelIdLower.includes("claude-sonnet") ||
            modelIdLower.includes("claude-opus") ||
            modelIdLower.includes("claude-haiku")) {
            capabilities.add("structured-output");
        }
        return capabilities;
    }
    async createClient(config, modelId) {
        const { anthropic } = await getAnthropicSdk();
        return anthropic(modelId, { apiKey: config.apiKey });
    }
}
//# sourceMappingURL=anthropic-provider.js.map