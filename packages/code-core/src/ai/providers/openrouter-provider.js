/**
 * OpenRouter Provider
 * Uses OpenAI-compatible API
 */
import { getModelMetadata } from "../../utils/models-dev.js";
import { retryNetwork } from "../../utils/retry.js";
import { TTLCacheManager } from "../../utils/ttl-cache.js";
import { hasRequiredFields } from "./base-provider.js";
/**
 * Lazy load OpenRouter SDK to reduce initial bundle size
 * SDK is only loaded when provider is actually used
 */
let openrouterModule = null;
async function getOpenRouterSdk() {
    if (!openrouterModule) {
        openrouterModule = await import("@openrouter/ai-sdk-provider");
    }
    return openrouterModule;
}
export class OpenRouterProvider {
    id = "openrouter";
    name = "OpenRouter";
    description = "Access multiple AI providers";
    /**
     * Shared TTL cache for models list (1 hour)
     * Shared across all instances to avoid duplicate API calls
     */
    static modelsCache = new TTLCacheManager(60 * 60 * 1000, // 1 hour TTL
    "OpenRouter.models");
    /**
     * Cache for model capabilities from OpenRouter API
     * Maps modelId -> capabilities parsed from API response
     */
    modelCapabilitiesCache = new Map();
    /**
     * Parse capabilities from OpenRouter API response
     * Uses ONLY actual API data - no hardcoded model name patterns
     * Returns Set of capability strings
     */
    parseCapabilitiesFromAPI(model) {
        const supportedParams = model.supported_parameters || [];
        const inputModalities = model.architecture?.input_modalities || [];
        const outputModalities = model.architecture?.output_modalities || [];
        const capabilities = new Set();
        // API explicitly tells us if model supports tools
        if (supportedParams.includes("tools")) {
            capabilities.add("tools");
        }
        // API tells us if model accepts image input
        if (inputModalities.includes("image")) {
            capabilities.add("image-input");
        }
        // NOTE: OpenRouter's API reports file input support, but OpenRouter doesn't properly
        // forward file attachments from AI SDK to the underlying models. The file data gets lost.
        // We intentionally DON'T add 'file-input' here so the message builder falls back to
        // XML text format (<file>...</file>) which works correctly.
        // Reference: File attachments sent via AI SDK FilePart format are silently dropped by OpenRouter
        // if (inputModalities.includes('file')) {
        //   capabilities.add('file-input');
        // }
        // API tells us if model can generate images
        if (outputModalities.includes("image")) {
            capabilities.add("image-output");
        }
        // API tells us if model supports structured outputs
        if (supportedParams.includes("structured_outputs") ||
            supportedParams.includes("response_format")) {
            capabilities.add("structured-output");
        }
        // API doesn't provide reasoning info yet
        // Models with extended thinking should set this via supported_parameters if OpenRouter adds it
        return capabilities;
    }
    /**
     * Default capabilities when API data is not available
     * Returns empty Set - user must call fetchModels first
     */
    getDefaultCapabilities() {
        return new Set();
    }
    getConfigSchema() {
        return [
            {
                key: "apiKey",
                label: "API Key",
                type: "string",
                required: true,
                secret: true,
                description: "Get your API key from https://openrouter.ai",
                placeholder: "sk-or-...",
            },
        ];
    }
    isConfigured(config) {
        return hasRequiredFields(this.getConfigSchema(), config);
    }
    getModelCapabilities(modelId) {
        // Use cached capabilities from API if available (accurate)
        const cached = this.modelCapabilitiesCache.get(modelId);
        if (cached) {
            return cached;
        }
        // Return conservative defaults if cache miss
        // User must call fetchModels to populate cache with real API data
        return this.getDefaultCapabilities();
    }
    async fetchModels(config) {
        const apiKey = config.apiKey;
        // Generate cache key based on API key (or 'public' for keyless access)
        const cacheKey = apiKey ? `models:${apiKey.toString().slice(0, 10)}` : "models:public";
        // Check TTL cache first
        const cached = OpenRouterProvider.modelsCache.get(cacheKey);
        if (cached) {
            // Fresh data from cache - no API call needed
            return cached;
        }
        // Cache miss or expired - fetch from API
        return retryNetwork(async () => {
            const response = await fetch("https://openrouter.ai/api/v1/models", {
                headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
                signal: AbortSignal.timeout(10000), // 10s timeout
            });
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
            const data = (await response.json());
            const models = data.data.map((model) => {
                // Parse capabilities from API response (use actual data, not guessing)
                const capabilities = this.parseCapabilitiesFromAPI(model);
                // Store in cache for getModelCapabilities to use
                this.modelCapabilitiesCache.set(model.id, capabilities);
                return {
                    id: model.id,
                    name: model.name || model.id,
                    capabilities,
                };
            });
            // Store in TTL cache (1 hour)
            OpenRouterProvider.modelsCache.set(cacheKey, models);
            return models;
        }, 2);
    }
    async getModelDetails(modelId, config) {
        const apiKey = config?.apiKey;
        // Try fetching from OpenRouter API
        try {
            const response = await fetch("https://openrouter.ai/api/v1/models", {
                headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
            });
            if (response.ok) {
                const data = (await response.json());
                const model = data.data.find((m) => m.id === modelId);
                if (model) {
                    return {
                        contextLength: model.context_length,
                        maxOutput: model.top_provider?.max_completion_tokens,
                        inputPrice: parseFloat(model.pricing?.prompt || "0"),
                        outputPrice: parseFloat(model.pricing?.completion || "0"),
                    };
                }
            }
        }
        catch {
            // Fall through to models.dev
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
    async createClient(config, modelId) {
        const { createOpenRouter } = await getOpenRouterSdk();
        const apiKey = config.apiKey;
        if (!apiKey) {
            throw new Error("OpenRouter API key is required. Please configure it using /provider command.");
        }
        // Get capabilities to determine features like image generation
        const capabilities = this.getModelCapabilities(modelId);
        const supportsImageGeneration = capabilities.has("image-output");
        // Use official OpenRouter provider (factory pattern)
        // 1. Create provider instance with API key
        const openrouter = createOpenRouter({ apiKey });
        // 2. Create model with optional extraBody for image generation
        const model = openrouter(modelId, supportsImageGeneration
            ? {
                extraBody: {
                    modalities: ["image", "text"],
                    image_config: {
                        aspect_ratio: "16:9",
                    },
                },
            }
            : undefined);
        return model;
    }
}
//# sourceMappingURL=openrouter-provider.js.map