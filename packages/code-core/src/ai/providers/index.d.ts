/**
 * Provider Registry
 * Central registry for all AI providers
 */
import { AnthropicProvider } from "./anthropic-provider.js";
import type { AIProvider } from "./base-provider.js";
import { ClaudeCodeProvider } from "./claude-code-provider.js";
import { GoogleProvider } from "./google-provider.js";
import { KimiProvider } from "./kimi-provider.js";
import { OpenAIProvider } from "./openai-provider.js";
import { OpenRouterProvider } from "./openrouter-provider.js";
import { ZaiProvider } from "./zai-provider.js";
/**
 * Registry of all available providers
 * SINGLE SOURCE OF TRUTH: Add new providers here only
 */
export declare const PROVIDER_REGISTRY: {
    anthropic: AnthropicProvider;
    openai: OpenAIProvider;
    google: GoogleProvider;
    openrouter: OpenRouterProvider;
    "claude-code": ClaudeCodeProvider;
    zai: ZaiProvider;
    kimi: KimiProvider;
};
/**
 * Provider IDs - derived from PROVIDER_REGISTRY
 * This is the ONLY place provider IDs are defined
 */
export type ProviderId = keyof typeof PROVIDER_REGISTRY;
/**
 * Get provider instance by ID
 */
export declare function getProvider(id: ProviderId): AIProvider;
/**
 * Get all provider IDs
 */
export declare function getAllProviderIds(): ProviderId[];
/**
 * Get provider metadata (id, name, description) for all providers
 * Used by UI components
 */
export declare function getAllProviders(): Record<ProviderId, {
    id: ProviderId;
    name: string;
    description: string;
}>;
export type { AIProvider, ConfigField, ProviderConfig, ProviderModelDetails, } from "./base-provider.js";
//# sourceMappingURL=index.d.ts.map