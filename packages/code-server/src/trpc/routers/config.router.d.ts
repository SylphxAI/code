/**
 * Config Router
 * Backend-only configuration management (file system access)
 * REACTIVE: Emits events for all state changes
 * SECURITY: Protected mutations (OWASP API2) + Rate limiting (OWASP API4)
 */
export declare const configRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Load AI config from file system
     * Backend reads files, UI stays clean
     *
     * SECURITY: Removes sensitive fields (API keys) before returning to client
     * - API keys REMOVED entirely (not masked)
     * - Client never sees keys (zero-knowledge)
     * - Server merges keys from disk during save operations
     * - Non-sensitive fields (provider, model) returned as-is
     */
    load: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            cwd?: string | undefined;
        };
        output: {
            success: true;
            config: any;
        };
        meta: object;
    }>;
    /**
     * Update default provider
     * REACTIVE: Emits config:default-provider-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateDefaultProvider: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            provider: string;
            cwd?: string | undefined;
        };
        output: {
            success: false;
            error: string;
        } | {
            success: true;
            error?: undefined;
        };
        meta: object;
    }>;
    /**
     * Update default model
     * REACTIVE: Emits config:default-model-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateDefaultModel: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            model: string;
            cwd?: string | undefined;
        };
        output: {
            success: false;
            error: string;
        } | {
            success: true;
            error?: undefined;
        };
        meta: object;
    }>;
    /**
     * Update provider configuration
     * REACTIVE: Emits config:provider-updated or config:provider-added event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     *
     * ZERO-KNOWLEDGE: Client never sends secrets
     * - Client only sends non-secret fields (model, etc)
     * - Server auto-merges ALL secret fields from disk
     * - To update secrets, use dedicated setProviderSecret mutation
     */
    updateProviderConfig: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            providerId: string;
            config: Record<any, unknown>;
            cwd?: string | undefined;
        };
        output: {
            success: false;
            error: string;
        } | {
            success: true;
            error?: undefined;
        };
        meta: object;
    }>;
    /**
     * Set a provider secret field (API key, token, etc)
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     *
     * Dedicated endpoint for updating secrets
     * - Client can set new secret without seeing existing value
     * - Follows GitHub/Vercel pattern: blind update
     * - Only way to update secret fields
     */
    setProviderSecret: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            providerId: string;
            fieldName: string;
            value: string;
            cwd?: string | undefined;
        };
        output: {
            success: false;
            error: string;
        } | {
            success: true;
            error?: undefined;
        };
        meta: object;
    }>;
    /**
     * Remove provider configuration
     * REACTIVE: Emits config:provider-removed event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    removeProvider: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            providerId: string;
            cwd?: string | undefined;
        };
        output: {
            success: false;
            error: string;
        } | {
            success: true;
            error?: undefined;
        };
        meta: object;
    }>;
    /**
     * Save AI config to file system
     * Backend writes files, UI stays clean
     * REACTIVE: Emits config-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     *
     * ZERO-KNOWLEDGE: Client never sends secrets
     * - Client only sends non-secret fields
     * - Server auto-merges ALL secret fields from disk
     * - To update secrets, use dedicated setProviderSecret mutation
     */
    save: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            config: {
                defaultProvider?: string | undefined;
                defaultEnabledRuleIds?: string[] | undefined;
                defaultAgentId?: string | undefined;
                providers?: Record<string, {
                    [x: string]: unknown;
                    defaultModel?: string | undefined;
                }> | undefined;
            };
            cwd?: string | undefined;
        };
        output: {
            success: true;
            error?: undefined;
        } | {
            success: false;
            error: string;
        };
        meta: object;
    }>;
    /**
     * Get config file paths
     * Useful for debugging
     */
    getPaths: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            cwd?: string | undefined;
        };
        output: {
            global: string;
            project: string;
            local: string;
            legacy: string;
        };
        meta: object;
    }>;
    /**
     * Get all available providers
     * Returns provider metadata (id, name, description, isConfigured)
     * SECURITY: No sensitive data exposed
     */
    getProviders: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            cwd?: string | undefined;
        } | undefined;
        output: Record<string, {
            id: string;
            name: string;
            description: string;
            isConfigured: boolean;
        }>;
        meta: object;
    }>;
    /**
     * Get provider config schema
     * Returns the configuration fields required for a provider
     * SECURITY: No sensitive data - just schema definition
     */
    getProviderSchema: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            providerId: string;
        };
        output: {
            success: true;
            schema: import("../../../../code-core/src/ai/providers/base-provider.js").ConfigField[];
            error?: undefined;
        } | {
            success: false;
            error: string;
            schema?: undefined;
        };
        meta: object;
    }>;
    /**
     * Get tokenizer info for a model
     * Returns tokenizer name and status
     */
    getTokenizerInfo: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            model: string;
        };
        output: {
            modelName: string;
            tokenizerName: string;
            loaded: boolean;
            failed: boolean;
        } | null;
        meta: object;
    }>;
    /**
     * Count tokens for text
     * Uses model-specific tokenizer
     */
    countTokens: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            text: string;
            model?: string | undefined;
        };
        output: {
            count: number;
        };
        meta: object;
    }>;
    /**
     * Count tokens for file
     * Reads file from disk and counts tokens using model-specific tokenizer
     * ARCHITECTURE: Server reads file, client should never read files directly
     */
    countFileTokens: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            filePath: string;
            model?: string | undefined;
        };
        output: {
            success: true;
            count: number;
            error?: undefined;
        } | {
            success: false;
            error: string;
            count?: undefined;
        };
        meta: object;
    }>;
    /**
     * Scan project files
     * Returns filtered file list
     */
    scanProjectFiles: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            cwd?: string | undefined;
            query?: string | undefined;
        };
        output: {
            files: import("@sylphx/code-core").FileInfo[];
        };
        meta: object;
    }>;
    /**
     * Update enabled rules
     * SERVER DECIDES: If sessionId provided → session table, else → global config
     * MULTI-CLIENT SYNC: Changes propagate to all clients via event stream
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     *
     * Pure UI Client: Client doesn't decide where to persist, server does
     */
    updateRules: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            ruleIds: string[];
            sessionId?: string | undefined;
            cwd?: string | undefined;
        };
        output: {
            success: true;
            scope: "session";
            error?: undefined;
        } | {
            success: false;
            error: string;
            scope?: undefined;
        } | {
            success: true;
            scope: "global";
            error?: undefined;
        };
        meta: object;
    }>;
    /**
     * Get model details (context length, pricing, capabilities, etc.)
     * SECURITY: No API keys needed - uses hardcoded metadata
     */
    getModelDetails: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            providerId: string;
            modelId: string;
            cwd?: string | undefined;
        };
        output: {
            success: true;
            details: {
                capabilities: import("../../../../code-core/src/ai/providers/base-provider.js").ModelCapabilities;
                contextLength?: number;
                maxOutput?: number;
                inputPrice?: number;
                outputPrice?: number;
                supportedFeatures?: string[];
            };
            error?: undefined;
        } | {
            success: false;
            error: string;
            details?: undefined;
        };
        meta: object;
    }>;
    /**
     * Fetch available models for a provider
     * SECURITY: Requires provider config (API keys if needed)
     */
    /**
     * Fetch models from provider API
     * SERVER-SIDE: Loads config with API keys, calls provider API
     * ARCHITECTURE: Client = Pure UI, Server = Business logic + File access
     */
    fetchModels: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            providerId: string;
            cwd?: string | undefined;
        };
        output: {
            success: false;
            error: string;
            models?: undefined;
        } | {
            success: true;
            models: {
                id: string;
                name: string;
            }[];
            error?: undefined;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=config.router.d.ts.map