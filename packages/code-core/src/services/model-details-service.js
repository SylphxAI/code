/**
 * Model Details Service
 * Fetches and enriches model details with fallback to models.dev
 *
 * ARCHITECTURE: Fallback enrichment pattern
 * - Priority: provider API > models.dev API
 * - When provider returns incomplete data, fetch from models.dev to fill gaps
 * - Cached for 15 minutes to reduce API calls
 */
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
let cache = null;
/**
 * Fetch models.dev API data with caching
 */
async function fetchModelsDevData() {
    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
        return cache.data;
    }
    try {
        const response = await fetch("https://models.dev/api.json", {
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            console.error(`[ModelDetailsService] models.dev API returned ${response.status}`);
            return null;
        }
        const data = (await response.json());
        // Update cache
        cache = {
            data,
            timestamp: Date.now(),
        };
        return data;
    }
    catch (error) {
        console.error("[ModelDetailsService] Failed to fetch models.dev data:", error);
        return null;
    }
}
/**
 * Find model in models.dev data
 * Searches across all providers for matching model ID
 */
function findModelInModelsDevData(data, modelId) {
    // Search across all providers
    for (const provider of Object.values(data)) {
        if (provider.models?.[modelId]) {
            return provider.models[modelId];
        }
    }
    return null;
}
/**
 * Extract capabilities from models.dev model data
 */
function extractCapabilitiesFromModelsDevModel(model) {
    const capabilities = new Set();
    // Tool calling
    if (model.tool_call) {
        capabilities.add("tools");
    }
    // Image input (vision)
    if (model.input?.includes("image")) {
        capabilities.add("image-input");
    }
    // File input (attachments)
    if (model.attachment) {
        capabilities.add("file-input");
    }
    // Image output
    if (model.output?.includes("image")) {
        capabilities.add("image-output");
    }
    // Reasoning/thinking
    if (model.reasoning) {
        capabilities.add("reasoning");
    }
    return capabilities;
}
/**
 * Enrich model details with models.dev data
 *
 * ARCHITECTURE: Fill missing fields only
 * - If provider already has a field, keep provider's value (more authoritative)
 * - If provider missing field, use models.dev value
 * - Priority: provider > models.dev
 */
export async function enrichModelDetails(modelId, providerDetails) {
    // Fetch models.dev data
    const modelsDevData = await fetchModelsDevData();
    if (!modelsDevData) {
        // Fallback unavailable, return provider details as-is
        return providerDetails;
    }
    // Find model in models.dev
    const modelsDevModel = findModelInModelsDevData(modelsDevData, modelId);
    if (!modelsDevModel) {
        // Model not found in models.dev, return provider details as-is
        return providerDetails;
    }
    // Start with provider details or empty object
    const enriched = providerDetails || {
        contextLength: null,
        maxOutput: null,
        inputPrice: 0,
        outputPrice: 0,
    };
    // Fill missing fields from models.dev
    if (enriched.contextLength === null && modelsDevModel.limit?.context) {
        enriched.contextLength = modelsDevModel.limit.context;
    }
    if (enriched.maxOutput === null && modelsDevModel.limit?.output) {
        enriched.maxOutput = modelsDevModel.limit.output;
    }
    if (enriched.inputPrice === 0 && modelsDevModel.cost?.input) {
        enriched.inputPrice = modelsDevModel.cost.input;
    }
    if (enriched.outputPrice === 0 && modelsDevModel.cost?.output) {
        enriched.outputPrice = modelsDevModel.cost.output;
    }
    return enriched;
}
/**
 * Enrich capabilities with models.dev data
 *
 * ARCHITECTURE: Additive enrichment
 * - Provider capabilities are the base truth
 * - Add additional capabilities from models.dev that provider doesn't know about
 * - Never remove capabilities that provider reported
 */
export function enrichCapabilities(modelId, providerCapabilities, modelsDevData) {
    if (!modelsDevData) {
        return providerCapabilities;
    }
    // Find model in models.dev
    const modelsDevModel = findModelInModelsDevData(modelsDevData, modelId);
    if (!modelsDevModel) {
        return providerCapabilities;
    }
    // Extract capabilities from models.dev
    const modelsDevCapabilities = extractCapabilitiesFromModelsDevModel(modelsDevModel);
    // Merge: provider + models.dev
    const enriched = new Set(providerCapabilities);
    for (const cap of modelsDevCapabilities) {
        enriched.add(cap);
    }
    return enriched;
}
//# sourceMappingURL=model-details-service.js.map