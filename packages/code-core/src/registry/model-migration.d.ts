/**
 * Model Migration Utilities
 *
 * Helpers to migrate from old provider+model format to new normalized modelId
 */
import type { ProviderId } from "../config/ai-config.js";
/**
 * Migrate legacy provider+model to normalized modelId
 *
 * @param provider - Old provider ID
 * @param model - Old model name
 * @returns Normalized modelId, or null if unable to migrate
 *
 * @example
 * migrateToModelId('openrouter', 'anthropic/claude-sonnet-4.5')
 * // Returns: 'openrouter/anthropic/claude-sonnet-4.5'
 *
 * migrateToModelId('anthropic', 'claude-sonnet-4')
 * // Returns: 'claude-sonnet-4'
 */
export declare function migrateToModelId(provider: ProviderId | string, model: string): string | null;
/**
 * Get default modelId for a provider
 *
 * @param provider - Provider ID
 * @returns Default modelId for the provider
 */
export declare function getDefaultModelIdForProvider(provider: ProviderId | string): string | null;
/**
 * Extract provider ID from modelId
 *
 * @param modelId - Normalized model ID
 * @returns Provider ID
 *
 * @example
 * getProviderIdFromModelId('claude-sonnet-4') // Returns: 'anthropic'
 * getProviderIdFromModelId('openrouter/anthropic/claude-sonnet-3.5') // Returns: 'openrouter'
 */
export declare function getProviderIdFromModelId(modelId: string): string | null;
/**
 * Migrate session data from old format to new format
 *
 * @param session - Session with old provider+model format
 * @returns Session with new modelId format
 */
export declare function migrateSessionModel<T extends {
    provider?: string;
    model?: string;
    modelId?: string;
}>(session: T): T & {
    modelId: string;
};
//# sourceMappingURL=model-migration.d.ts.map