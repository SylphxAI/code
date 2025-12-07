/**
 * Centralized Model Registry
 * Single source of truth for AI model metadata across all providers
 *
 * Benefits:
 * - One place to update model info (context length, max output)
 * - Consistent model metadata across the application
 * - Easy to add new models
 * - Type-safe access
 *
 * Usage:
 * ```ts
 * import { MODEL_REGISTRY } from './models/model-registry';
 * const models = MODEL_REGISTRY.anthropic.models;
 * const details = MODEL_REGISTRY.anthropic.details['claude-3-5-sonnet-20241022'];
 * ```
 */
/**
 * Anthropic (Claude) Models
 */
const ANTHROPIC = {
    models: [
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (Latest)" },
        { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
        { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
        { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
        { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
    ],
    details: {
        "claude-3-5-sonnet-20241022": {
            contextLength: 200000,
            maxOutput: 8192,
        },
        "claude-3-5-haiku-20241022": {
            contextLength: 200000,
            maxOutput: 8192,
        },
        "claude-3-opus-20240229": {
            contextLength: 200000,
            maxOutput: 4096,
        },
        "claude-3-sonnet-20240229": {
            contextLength: 200000,
            maxOutput: 4096,
        },
        "claude-3-haiku-20240307": {
            contextLength: 200000,
            maxOutput: 4096,
        },
    },
    consoleUrl: "https://console.anthropic.com",
    docsUrl: "https://docs.anthropic.com",
};
/**
 * OpenAI (GPT) Models
 */
const OPENAI = {
    models: [
        { id: "gpt-4o", name: "GPT-4o" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini" },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
        { id: "gpt-4", name: "GPT-4" },
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    ],
    details: {
        "gpt-4o": {
            contextLength: 128000,
            maxOutput: 16384,
        },
        "gpt-4o-mini": {
            contextLength: 128000,
            maxOutput: 16384,
        },
        "gpt-4-turbo": {
            contextLength: 128000,
            maxOutput: 4096,
        },
        "gpt-4": {
            contextLength: 8192,
            maxOutput: 8192,
        },
        "gpt-3.5-turbo": {
            contextLength: 16384,
            maxOutput: 4096,
        },
    },
    consoleUrl: "https://platform.openai.com",
    docsUrl: "https://platform.openai.com/docs",
};
/**
 * Google (Gemini) Models
 */
const GOOGLE = {
    models: [
        { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Experimental)" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    ],
    details: {
        "gemini-2.0-flash-exp": {
            contextLength: 1000000,
            maxOutput: 8192,
        },
        "gemini-1.5-pro": {
            contextLength: 2000000,
            maxOutput: 8192,
        },
        "gemini-1.5-flash": {
            contextLength: 1000000,
            maxOutput: 8192,
        },
    },
    consoleUrl: "https://aistudio.google.com",
    docsUrl: "https://ai.google.dev/docs",
};
/**
 * Centralized Model Registry
 * Maps provider ID to their model catalog
 */
export const MODEL_REGISTRY = {
    anthropic: ANTHROPIC,
    openai: OPENAI,
    google: GOOGLE,
};
/**
 * Helper: Get models for a provider
 */
export function getProviderModels(providerId) {
    return MODEL_REGISTRY[providerId].models;
}
/**
 * Helper: Get model details
 */
export function getModelDetails(providerId, modelId) {
    return MODEL_REGISTRY[providerId].details[modelId] || null;
}
/**
 * Helper: Get provider console URL
 */
export function getProviderConsoleUrl(providerId) {
    return MODEL_REGISTRY[providerId].consoleUrl;
}
/**
 * Helper: Get provider docs URL
 */
export function getProviderDocsUrl(providerId) {
    return MODEL_REGISTRY[providerId].docsUrl;
}
//# sourceMappingURL=model-registry.js.map