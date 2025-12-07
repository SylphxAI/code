/**
 * Google Provider
 * Supports both AI Studio (apiKey) and Vertex AI (projectId + location)
 */
import { getModelMetadata } from "../../utils/models-dev.js";
import { getProviderConsoleUrl, MODEL_REGISTRY } from "../models/model-registry.js";
/**
 * Lazy load Google SDK to reduce initial bundle size
 * SDK is only loaded when provider is actually used
 */
let googleModule = null;
async function getGoogleSdk() {
    if (!googleModule) {
        googleModule = await import("@ai-sdk/google");
    }
    return googleModule;
}
export class GoogleProvider {
    id = "google";
    name = "Google";
    description = "Gemini models by Google";
    getConfigSchema() {
        return [
            {
                key: "apiKey",
                label: "API Key (AI Studio)",
                type: "string",
                required: false,
                secret: true,
                description: `Get your API key from ${getProviderConsoleUrl("google") || "https://aistudio.google.com"}`,
                placeholder: "AIza...",
            },
            {
                key: "projectId",
                label: "Project ID (Vertex AI)",
                type: "string",
                required: false,
                description: "Google Cloud project ID for Vertex AI",
                placeholder: "my-project-123",
            },
            {
                key: "location",
                label: "Location (Vertex AI)",
                type: "string",
                required: false,
                description: "Vertex AI location (default: us-central1)",
                placeholder: "us-central1",
            },
        ];
    }
    isConfigured(config) {
        // Either AI Studio (apiKey) OR Vertex AI (projectId + location)
        const hasAIStudio = !!config.apiKey;
        const hasVertexAI = !!config.projectId && !!config.location;
        return hasAIStudio || hasVertexAI;
    }
    async fetchModels(_config) {
        return MODEL_REGISTRY.google.models;
    }
    async getModelDetails(modelId, _config) {
        // Try provider knowledge first
        const staticDetails = MODEL_REGISTRY.google.details[modelId];
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
        // Most Gemini models support tools
        if (modelIdLower.includes("gemini")) {
            capabilities.add("tools");
        }
        // Gemini Pro and Flash models support vision
        if (modelIdLower.includes("gemini") &&
            (modelIdLower.includes("pro") ||
                modelIdLower.includes("flash") ||
                modelIdLower.includes("vision"))) {
            capabilities.add("image-input");
        }
        // Gemini thinking/reasoning models
        if (modelIdLower.includes("thinking") || modelIdLower.includes("reasoning")) {
            capabilities.add("reasoning");
        }
        // Gemini 1.5+ and 2.0+ support structured output
        if (modelIdLower.includes("gemini-1.5") || modelIdLower.includes("gemini-2")) {
            capabilities.add("structured-output");
        }
        return capabilities;
    }
    async createClient(config, modelId) {
        const { google } = await getGoogleSdk();
        const apiKey = config.apiKey;
        const projectId = config.projectId;
        const location = config.location || "us-central1";
        if (apiKey) {
            // AI Studio mode
            return google(modelId, { apiKey });
        }
        else if (projectId) {
            // Vertex AI mode
            return google(modelId, {
                vertexai: { projectId, location },
            });
        }
        else {
            throw new Error("Google provider requires either apiKey or projectId");
        }
    }
}
//# sourceMappingURL=google-provider.js.map