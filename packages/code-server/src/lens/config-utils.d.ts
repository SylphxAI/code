/**
 * Config Utilities for Lens
 *
 * Sanitization and helper functions for AI config.
 */
import type { AIConfig } from "@sylphx/code-core";
/**
 * Sanitize AI config by REMOVING sensitive fields
 * Client should NEVER see secret fields (not even masked)
 */
export declare function sanitizeAIConfig(config: AIConfig): AIConfig;
/**
 * Merge config preserving secrets from disk
 */
export declare function mergeConfigWithSecrets(incomingConfig: AIConfig, currentConfig: AIConfig): AIConfig;
//# sourceMappingURL=config-utils.d.ts.map