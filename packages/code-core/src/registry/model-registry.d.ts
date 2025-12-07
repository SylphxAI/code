/**
 * Model Registry
 *
 * Centralized registry of all supported AI providers and models.
 * This is the single source of truth for model metadata.
 */
import type { Model, Provider } from "../types/model.types.js";
/**
 * All supported providers
 */
export declare const PROVIDERS: {
    readonly openai: {
        readonly id: "openai";
        readonly name: "OpenAI";
        readonly status: "active";
        readonly apiKeyRequired: true;
        readonly modelIds: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini"];
        readonly description: "OpenAI models including GPT-4 and O1";
        readonly website: "https://openai.com";
    };
    readonly anthropic: {
        readonly id: "anthropic";
        readonly name: "Anthropic";
        readonly status: "active";
        readonly apiKeyRequired: true;
        readonly modelIds: ["claude-sonnet-4", "claude-sonnet-3.5", "claude-opus-3.5", "claude-haiku-3.5"];
        readonly description: "Anthropic Claude models";
        readonly website: "https://anthropic.com";
    };
    readonly openrouter: {
        readonly id: "openrouter";
        readonly name: "OpenRouter";
        readonly status: "active";
        readonly apiKeyRequired: true;
        readonly modelIds: ["openrouter/anthropic/claude-sonnet-4.5", "openrouter/anthropic/claude-sonnet-3.5", "openrouter/openai/gpt-4o", "openrouter/google/gemini-2.0-flash-exp"];
        readonly description: "Unified API for multiple AI providers";
        readonly website: "https://openrouter.ai";
    };
};
/**
 * All supported models
 */
export declare const MODELS: {
    readonly "gpt-4o": {
        readonly id: "gpt-4o";
        readonly name: "GPT-4o";
        readonly providerId: "openai";
        readonly status: "active";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: true;
            readonly file: true;
            readonly tools: true;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: true;
            readonly file: false;
            readonly tools: true;
        };
        readonly reasoning: "no";
        readonly maxContext: 128000;
        readonly pricing: {
            readonly inputPer1M: 2.5;
            readonly outputPer1M: 10;
            readonly cachedInputPer1M: 1.25;
        };
        readonly description: "OpenAI flagship multimodal model";
    };
    readonly "gpt-4o-mini": {
        readonly id: "gpt-4o-mini";
        readonly name: "GPT-4o Mini";
        readonly providerId: "openai";
        readonly status: "active";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: true;
            readonly file: true;
            readonly tools: true;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: true;
            readonly file: false;
            readonly tools: true;
        };
        readonly reasoning: "no";
        readonly maxContext: 128000;
        readonly pricing: {
            readonly inputPer1M: 0.15;
            readonly outputPer1M: 0.6;
            readonly cachedInputPer1M: 0.075;
        };
        readonly description: "Affordable small model for fast tasks";
    };
    readonly o1: {
        readonly id: "o1";
        readonly name: "O1";
        readonly providerId: "openai";
        readonly status: "active";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: false;
            readonly file: true;
            readonly tools: false;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: false;
            readonly file: false;
            readonly tools: false;
        };
        readonly reasoning: "yes";
        readonly maxContext: 200000;
        readonly pricing: {
            readonly inputPer1M: 15;
            readonly outputPer1M: 60;
            readonly cachedInputPer1M: 7.5;
        };
        readonly description: "Advanced reasoning model";
    };
    readonly "o1-mini": {
        readonly id: "o1-mini";
        readonly name: "O1 Mini";
        readonly providerId: "openai";
        readonly status: "active";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: false;
            readonly file: true;
            readonly tools: false;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: false;
            readonly file: false;
            readonly tools: false;
        };
        readonly reasoning: "yes";
        readonly maxContext: 128000;
        readonly pricing: {
            readonly inputPer1M: 3;
            readonly outputPer1M: 12;
            readonly cachedInputPer1M: 1.5;
        };
        readonly description: "Faster reasoning model";
    };
    readonly "claude-sonnet-4": {
        readonly id: "claude-sonnet-4";
        readonly name: "Claude Sonnet 4";
        readonly providerId: "anthropic";
        readonly status: "active";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: false;
            readonly file: true;
            readonly tools: true;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: false;
            readonly file: false;
            readonly tools: true;
        };
        readonly reasoning: "auto";
        readonly maxContext: 200000;
        readonly pricing: {
            readonly inputPer1M: 3;
            readonly outputPer1M: 15;
            readonly cachedInputPer1M: 0.3;
        };
        readonly description: "Latest Claude model with extended thinking";
    };
    readonly "claude-sonnet-3.5": {
        readonly id: "claude-sonnet-3.5";
        readonly name: "Claude Sonnet 3.5";
        readonly providerId: "anthropic";
        readonly status: "active";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: false;
            readonly file: true;
            readonly tools: true;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: false;
            readonly file: false;
            readonly tools: true;
        };
        readonly reasoning: "auto";
        readonly maxContext: 200000;
        readonly pricing: {
            readonly inputPer1M: 3;
            readonly outputPer1M: 15;
            readonly cachedInputPer1M: 0.3;
        };
        readonly description: "Balanced performance and speed";
    };
    readonly "claude-opus-3.5": {
        readonly id: "claude-opus-3.5";
        readonly name: "Claude Opus 3.5";
        readonly providerId: "anthropic";
        readonly status: "beta";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: false;
            readonly file: true;
            readonly tools: true;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: false;
            readonly file: false;
            readonly tools: true;
        };
        readonly reasoning: "auto";
        readonly maxContext: 200000;
        readonly pricing: {
            readonly inputPer1M: 15;
            readonly outputPer1M: 75;
            readonly cachedInputPer1M: 1.5;
        };
        readonly description: "Most capable Claude model";
    };
    readonly "claude-haiku-3.5": {
        readonly id: "claude-haiku-3.5";
        readonly name: "Claude Haiku 3.5";
        readonly providerId: "anthropic";
        readonly status: "active";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: false;
            readonly file: true;
            readonly tools: true;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: false;
            readonly file: false;
            readonly tools: true;
        };
        readonly reasoning: "no";
        readonly maxContext: 200000;
        readonly pricing: {
            readonly inputPer1M: 0.8;
            readonly outputPer1M: 4;
            readonly cachedInputPer1M: 0.08;
        };
        readonly description: "Fastest Claude model";
    };
    readonly "openrouter/anthropic/claude-sonnet-4.5": {
        readonly id: "openrouter/anthropic/claude-sonnet-4.5";
        readonly name: "Claude Sonnet 4.5 (OpenRouter)";
        readonly providerId: "openrouter";
        readonly status: "active";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: false;
            readonly file: true;
            readonly tools: true;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: false;
            readonly file: false;
            readonly tools: true;
        };
        readonly reasoning: "auto";
        readonly maxContext: 200000;
        readonly pricing: {
            readonly inputPer1M: 3;
            readonly outputPer1M: 15;
        };
    };
    readonly "openrouter/anthropic/claude-sonnet-3.5": {
        readonly id: "openrouter/anthropic/claude-sonnet-3.5";
        readonly name: "Claude Sonnet 3.5 (OpenRouter)";
        readonly providerId: "openrouter";
        readonly status: "active";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: false;
            readonly file: true;
            readonly tools: true;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: false;
            readonly file: false;
            readonly tools: true;
        };
        readonly reasoning: "auto";
        readonly maxContext: 200000;
        readonly pricing: {
            readonly inputPer1M: 3;
            readonly outputPer1M: 15;
        };
    };
    readonly "openrouter/openai/gpt-4o": {
        readonly id: "openrouter/openai/gpt-4o";
        readonly name: "GPT-4o (OpenRouter)";
        readonly providerId: "openrouter";
        readonly status: "active";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: false;
            readonly file: true;
            readonly tools: true;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: false;
            readonly video: false;
            readonly audio: false;
            readonly file: false;
            readonly tools: true;
        };
        readonly reasoning: "no";
        readonly maxContext: 128000;
        readonly pricing: {
            readonly inputPer1M: 2.5;
            readonly outputPer1M: 10;
        };
    };
    readonly "openrouter/google/gemini-2.0-flash-exp": {
        readonly id: "openrouter/google/gemini-2.0-flash-exp";
        readonly name: "Gemini 2.0 Flash (OpenRouter)";
        readonly providerId: "openrouter";
        readonly status: "beta";
        readonly inputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: true;
            readonly audio: true;
            readonly file: true;
            readonly tools: true;
        };
        readonly outputCapabilities: {
            readonly text: true;
            readonly image: true;
            readonly video: false;
            readonly audio: true;
            readonly file: false;
            readonly tools: true;
        };
        readonly reasoning: "no";
        readonly maxContext: 1000000;
        readonly pricing: {
            readonly inputPer1M: 0;
            readonly outputPer1M: 0;
        };
        readonly description: "Free experimental multimodal model";
    };
};
/**
 * Get all providers
 */
export declare function getAllProviders(): Provider[];
/**
 * Get provider entity by ID
 * Returns Provider metadata from registry
 */
export declare function getProviderEntity(providerId: string): Provider | undefined;
/**
 * @deprecated Use getProviderEntity instead
 * Kept for backward compatibility
 */
export declare function getProvider(providerId: string): Provider | undefined;
/**
 * Get all models
 */
export declare function getAllModels(): Model[];
/**
 * Get model by ID
 */
export declare function getModel(modelId: string): Model | undefined;
/**
 * Get all models for a provider
 */
export declare function getModelsByProvider(providerId: string): Model[];
/**
 * Get model with its provider information
 */
export declare function getModelWithProvider(modelId: string): (Model & {
    provider: Provider;
}) | undefined;
/**
 * Check if model supports a specific input capability
 */
export declare function modelSupportsInput(modelId: string, capability: keyof Model["inputCapabilities"]): boolean;
/**
 * Check if model supports a specific output capability
 */
export declare function modelSupportsOutput(modelId: string, capability: keyof Model["outputCapabilities"]): boolean;
//# sourceMappingURL=model-registry.d.ts.map