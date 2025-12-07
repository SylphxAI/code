/**
 * Model Details Service
 * Fetches and enriches model details with fallback to models.dev
 *
 * ARCHITECTURE: Fallback enrichment pattern
 * - Priority: provider API > models.dev API
 * - When provider returns incomplete data, fetch from models.dev to fill gaps
 * - Cached for 15 minutes to reduce API calls
 */
import type { ModelCapabilities, ProviderModelDetails } from "../ai/providers/base-provider.js";
/**
 * models.dev API response structure
 */
interface ModelsDevResponse {
    [providerId: string]: {
        id: string;
        env: string[];
        npm: string;
        api: string;
        name: string;
        doc: string;
        models: {
            [modelId: string]: {
                id: string;
                name: string;
                release_date?: string;
                last_updated?: string;
                knowledge?: string;
                status?: string;
                attachment?: boolean;
                reasoning?: boolean;
                tool_call?: boolean;
                temperature?: boolean;
                open_weights?: boolean;
                input?: string[];
                output?: string[];
                cost?: {
                    input?: number;
                    output?: number;
                    reasoning?: number;
                    cache_creation?: number;
                    cache_read?: number;
                };
                limit?: {
                    context?: number;
                    output?: number;
                };
            };
        };
    };
}
/**
 * Enrich model details with models.dev data
 *
 * ARCHITECTURE: Fill missing fields only
 * - If provider already has a field, keep provider's value (more authoritative)
 * - If provider missing field, use models.dev value
 * - Priority: provider > models.dev
 */
export declare function enrichModelDetails(modelId: string, providerDetails: ProviderModelDetails | null): Promise<ProviderModelDetails | null>;
/**
 * Enrich capabilities with models.dev data
 *
 * ARCHITECTURE: Additive enrichment
 * - Provider capabilities are the base truth
 * - Add additional capabilities from models.dev that provider doesn't know about
 * - Never remove capabilities that provider reported
 */
export declare function enrichCapabilities(modelId: string, providerCapabilities: ModelCapabilities, modelsDevData: ModelsDevResponse | null): ModelCapabilities;
export {};
//# sourceMappingURL=model-details-service.d.ts.map