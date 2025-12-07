/**
 * Credential Registry
 *
 * Centralized registry for provider credentials (API keys).
 * Manages credential storage, retrieval, and validation.
 *
 * SECURITY: Credentials stored in plaintext with restrictive file permissions (0600).
 * See GitHub issue #1 for encryption implementation roadmap.
 */
import type { CreateCredentialInput, CredentialScope, MaskedCredential, ProviderCredential, UpdateCredentialInput } from "../types/credential.types.js";
/**
 * Mask API key for display
 * Shows first 3-4 and last 4 characters
 */
export declare function maskApiKey(apiKey: string): string;
/**
 * Get all credentials
 */
export declare function getAllCredentials(): ProviderCredential[];
/**
 * Get credential by ID
 */
export declare function getCredential(credentialId: string): ProviderCredential | undefined;
/**
 * Get credentials for a specific provider
 */
export declare function getCredentialsByProvider(providerId: string): ProviderCredential[];
/**
 * Get default credential for a provider
 */
export declare function getDefaultCredential(providerId: string): ProviderCredential | undefined;
/**
 * Get active credentials (not expired or revoked)
 */
export declare function getActiveCredentials(): ProviderCredential[];
/**
 * Get credentials by scope
 */
export declare function getCredentialsByScope(scope: CredentialScope): ProviderCredential[];
/**
 * Create a new credential
 */
export declare function createCredential(input: CreateCredentialInput): ProviderCredential;
/**
 * Update a credential
 */
export declare function updateCredential(credentialId: string, updates: UpdateCredentialInput): ProviderCredential | null;
/**
 * Delete a credential
 */
export declare function deleteCredential(credentialId: string): boolean;
/**
 * Mark credential as used (updates lastUsedAt)
 */
export declare function markCredentialUsed(credentialId: string): void;
/**
 * Revoke a credential
 */
export declare function revokeCredential(credentialId: string): boolean;
/**
 * Get credential with masked API key
 */
export declare function getMaskedCredential(credentialId: string): MaskedCredential | undefined;
/**
 * Get all credentials with masked API keys
 */
export declare function getAllMaskedCredentials(): MaskedCredential[];
/**
 * Register a credential in the registry
 * Used when loading from storage
 */
export declare function registerCredential(credential: ProviderCredential): void;
/**
 * Clear all credentials from registry
 * Useful for testing or reset
 */
export declare function clearCredentialRegistry(): void;
/**
 * Get credential statistics
 */
export declare function getCredentialStats(): {
    total: number;
    active: number;
    expired: number;
    revoked: number;
    byProvider: Record<string, number>;
    byScope: {
        global: number;
        project: number;
    };
};
/**
 * Check if a provider has any active credentials
 */
export declare function hasActiveCredential(providerId: string): boolean;
/**
 * Auto-expire credentials
 * Should be called periodically to update expired credentials
 */
export declare function autoExpireCredentials(): number;
//# sourceMappingURL=credential-registry.d.ts.map