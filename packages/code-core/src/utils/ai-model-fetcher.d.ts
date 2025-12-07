/**
 * AI Model Fetcher
 * Dynamically fetch available models from providers using provider registry
 */
import type { ModelInfo, ProviderConfig } from "../ai/providers/base-provider.js";
import { type ProviderId } from "../ai/providers/index.js";
export type { ModelInfo } from "../ai/providers/base-provider.js";
/**
 * Fetch models for a provider using provider registry
 */
export declare function fetchModels(provider: ProviderId, config?: ProviderConfig): Promise<ModelInfo[]>;
//# sourceMappingURL=ai-model-fetcher.d.ts.map