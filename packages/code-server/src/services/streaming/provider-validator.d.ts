/**
 * Provider Validator
 * Validates provider configuration and credentials
 */
import type { AIConfig, Session } from "@sylphx/code-core";
export interface ProviderValidationError {
    type: "not-configured" | "invalid-credentials";
    message: string;
}
/**
 * Validate provider configuration for a session
 * Returns error if provider is not configured or credentials are invalid
 */
export declare function validateProvider(aiConfig: AIConfig, session: Session): ProviderValidationError | null;
//# sourceMappingURL=provider-validator.d.ts.map