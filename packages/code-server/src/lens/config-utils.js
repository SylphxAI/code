/**
 * Config Utilities for Lens
 *
 * Sanitization and helper functions for AI config.
 */
import { getProvider } from "@sylphx/code-core";
/**
 * Sanitize AI config by REMOVING sensitive fields
 * Client should NEVER see secret fields (not even masked)
 */
export function sanitizeAIConfig(config) {
    if (!config.providers) {
        return config;
    }
    const sanitizedProviders = {};
    for (const [providerId, providerConfig] of Object.entries(config.providers)) {
        const sanitizedProvider = {};
        // Get provider schema to know which fields are secret
        let secretFields;
        try {
            const provider = getProvider(providerId);
            const configSchema = provider.getConfigSchema();
            secretFields = new Set(configSchema.filter((field) => field.secret === true).map((field) => field.key));
        }
        catch (_error) {
            // Fallback: if provider not found, remove nothing
            secretFields = new Set();
        }
        for (const [fieldName, fieldValue] of Object.entries(providerConfig)) {
            if (!secretFields.has(fieldName)) {
                sanitizedProvider[fieldName] = fieldValue;
            }
        }
        sanitizedProviders[providerId] = sanitizedProvider;
    }
    return {
        ...config,
        providers: sanitizedProviders,
    };
}
/**
 * Merge config preserving secrets from disk
 */
export function mergeConfigWithSecrets(incomingConfig, currentConfig) {
    const mergedConfig = { ...incomingConfig };
    if (incomingConfig.providers && currentConfig.providers) {
        const mergedProviders = {};
        for (const [providerId, incomingProviderConfig] of Object.entries(incomingConfig.providers)) {
            const currentProviderConfig = currentConfig.providers[providerId] || {};
            const mergedProviderConfig = { ...incomingProviderConfig };
            // Get provider schema to identify secret fields
            try {
                const provider = getProvider(providerId);
                const configSchema = provider.getConfigSchema();
                const secretFields = new Set(configSchema.filter((field) => field.secret === true).map((field) => field.key));
                // Preserve ALL secrets from disk
                for (const fieldName of secretFields) {
                    const currentValue = currentProviderConfig[fieldName];
                    if (currentValue !== undefined) {
                        mergedProviderConfig[fieldName] = currentValue;
                    }
                }
            }
            catch (_error) {
                // Provider not found - just use incoming config
            }
            mergedProviders[providerId] = mergedProviderConfig;
        }
        mergedConfig.providers = mergedProviders;
    }
    return mergedConfig;
}
//# sourceMappingURL=config-utils.js.map