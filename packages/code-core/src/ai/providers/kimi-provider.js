/**
 * Kimi Provider
 * Uses OpenAI-compatible API
 */
import { hasRequiredFields } from "./base-provider.js";
/**
 * Lazy load OpenAI-compatible SDK to reduce initial bundle size
 * SDK is only loaded when provider is actually used
 */
let openaiCompatibleModule = null;
async function getOpenAICompatibleSdk() {
    if (!openaiCompatibleModule) {
        openaiCompatibleModule = await import("@ai-sdk/openai-compatible");
    }
    return openaiCompatibleModule;
}
export class KimiProvider {
    id = "kimi";
    name = "Kimi";
    description = "Moonshot AI Kimi platform";
    getConfigSchema() {
        return [
            {
                key: "apiKey",
                label: "API Key",
                type: "string",
                required: true,
                secret: true,
                description: "Get your API key from https://platform.moonshot.cn",
                placeholder: "sk-...",
            },
        ];
    }
    isConfigured(config) {
        return hasRequiredFields(this.getConfigSchema(), config);
    }
    async fetchModels(config) {
        const apiKey = config.apiKey;
        if (!apiKey) {
            throw new Error("API key is required to fetch Kimi models");
        }
        const response = await fetch("https://api.kimi.com/coding/v1/models", {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            throw new Error(`Kimi API returned ${response.status}: ${response.statusText}`);
        }
        const data = (await response.json());
        if (!data.data || data.data.length === 0) {
            throw new Error("No models returned from Kimi API");
        }
        return data.data.map((model) => ({
            id: model.id,
            name: model.id,
        }));
    }
    async getModelDetails(_modelId, _config) {
        // Kimi API doesn't provide detailed model specs via API
        // Return null to indicate no details available
        return null;
    }
    getModelCapabilities(_modelId) {
        // Return empty set - no assumptions about capabilities
        // Let the API/model determine what it supports at runtime
        return new Set();
    }
    async createClient(config, modelId) {
        const { createOpenAICompatible } = await getOpenAICompatibleSdk();
        const apiKey = config.apiKey;
        const kimi = createOpenAICompatible({
            baseURL: "https://api.kimi.com/coding/v1",
            apiKey,
            name: "kimi",
        });
        return kimi(modelId);
    }
}
//# sourceMappingURL=kimi-provider.js.map