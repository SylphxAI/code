/**
 * Provider Validator
 * Validates provider configuration and credentials
 */

import type { AIConfig, Session } from "@sylphx/code-core";
import { getProvider } from "@sylphx/code-core";

export interface ProviderValidationError {
	type: "not-configured" | "invalid-credentials";
	message: string;
}

/**
 * Validate provider configuration for a session
 * Returns error if provider is not configured or credentials are invalid
 */
export function validateProvider(
	aiConfig: AIConfig,
	session: Session,
): ProviderValidationError | null {
	const provider = session.provider;
	const providerConfig = aiConfig?.providers?.[provider];

	if (!providerConfig) {
		return {
			type: "not-configured",
			message:
				"[ERROR] Provider not configured\\n\\nPlease configure your provider using the /provider command.",
		};
	}

	const providerInstance = getProvider(provider);
	if (!providerInstance.isConfigured(providerConfig)) {
		return {
			type: "invalid-credentials",
			message: `[ERROR] ${providerInstance.name} is not properly configured\\n\\nPlease check your settings with the /provider command.`,
		};
	}

	return null;
}
