/**
 * Credential Manager
 *
 * Handles loading and saving credentials to/from filesystem.
 * Credentials are stored in separate files from general configuration.
 *
 * File locations:
 * - Global: ~/.sylphx-code/credentials.json (user-wide API keys)
 * - Project: ./.sylphx-code/credentials.local.json (project-specific, gitignored)
 *
 * SECURITY: Plaintext storage with restrictive permissions (0600).
 * See GitHub issue #1 for encryption implementation roadmap.
 */
import { type Result } from "../ai/result.js";
import { updateCredential } from "../registry/credential-registry.js";
import type { CreateCredentialInput, ProviderCredential } from "../types/credential.types.js";
/**
 * Get all credential file paths
 */
export declare function getCredentialPaths(cwd?: string): {
    global: string;
    project: string;
};
/**
 * Load all credentials from filesystem
 * Merges global and project credentials into registry
 */
export declare function loadCredentials(cwd?: string): Promise<Result<void, Error>>;
/**
 * Save credentials to filesystem
 * Separates global and project credentials
 */
export declare function saveCredentials(cwd?: string): Promise<Result<void, Error>>;
/**
 * Add a new credential
 * Automatically saves to filesystem
 */
export declare function addCredential(input: CreateCredentialInput, cwd?: string): Promise<Result<ProviderCredential, Error>>;
/**
 * Remove a credential
 * Automatically saves to filesystem
 */
export declare function removeCredential(credentialId: string, cwd?: string): Promise<Result<boolean, Error>>;
/**
 * Update a credential
 * Automatically saves to filesystem
 */
export declare function modifyCredential(credentialId: string, updates: Parameters<typeof updateCredential>[1], cwd?: string): Promise<Result<ProviderCredential | null, Error>>;
/**
 * Check if credentials exist
 */
export declare function credentialsExist(cwd?: string): Promise<boolean>;
/**
 * Migrate API keys from provider config to credentials
 * Used during transition from old config structure
 */
export declare function migrateProviderConfigToCredentials(providerConfigs: Record<string, {
    apiKey?: string;
    [key: string]: unknown;
}>, cwd?: string): Promise<Result<number, Error>>;
//# sourceMappingURL=credential-manager.d.ts.map