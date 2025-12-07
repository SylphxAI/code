/**
 * Provider Validator
 * Validates provider configuration and credentials
 */
import { getProvider } from "@sylphx/code-core";
/**
 * Validate provider configuration for a session
 * Returns error if provider is not configured or credentials are invalid
 */
export function validateProvider(aiConfig, session) {
    const provider = session.provider;
    const providerConfig = aiConfig?.providers?.[provider];
    if (!providerConfig) {
        return {
            type: "not-configured",
            message: "[ERROR] Provider not configured\n\nPlease configure your provider using the /provider command.",
        };
    }
    const providerInstance = getProvider(provider);
    const isConfigured = providerInstance.isConfigured(providerConfig);
    if (!isConfigured) {
        return {
            type: "invalid-credentials",
            message: `[ERROR] ${providerInstance.name} is not properly configured\n\nPlease check your settings with the /provider command.`,
        };
    }
    return null;
}
//# sourceMappingURL=provider-validator.js.map