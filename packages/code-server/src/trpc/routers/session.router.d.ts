/**
 * Session Router (Lens-powered)
 *
 * Clean replacement using Lens API.
 *
 * Before: 700+ lines of manual CRUD + event handling (session.router.old.ts)
 * After: ~200 lines delegating to Lens (this file)
 *
 * Architecture:
 * - tRPC procedures → Lens API calls
 * - Field updates → automatic field-level events
 * - Type-safe with Zod validation
 * - All business logic in Lens Extended API
 *
 * Migration:
 * - ✅ Drop-in replacement (API compatible)
 * - ✅ 71% code reduction
 * - ✅ Unified field-level subscriptions
 * - ✅ Zero manual event handling
 */
export declare function createSessionRouter(): import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Get recent sessions metadata (cursor-based pagination)
     */
    getRecent: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            cursor?: number | undefined;
        };
        output: any;
        meta: object;
    }>;
    /**
     * Get session by ID with full data
     */
    getById: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sessionId: string;
        };
        output: {
            modelStatus: "unknown" | "available" | "unavailable";
            id: string;
            title?: string;
            modelId: string;
            agentId: string;
            enabledRuleIds: string[];
            enabledToolIds?: string[];
            enabledMcpServerIds?: string[];
            messages: import("@sylphx/code-core").SessionMessage[];
            todos: import("@sylphx/code-core").Todo[];
            nextTodoId: number;
            flags?: Record<string, boolean>;
            baseContextTokens?: number;
            totalTokens?: number;
            status?: import("@sylphx/code-core").SessionStatus;
            created: number;
            updated: number;
            provider?: import("@sylphx/code-core").ProviderId;
            model?: string;
        } | null;
        meta: object;
    }>;
    /**
     * Get session count
     */
    getCount: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: any;
        meta: object;
    }>;
    /**
     * Get last session (for headless mode)
     */
    getLast: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: any;
        meta: object;
    }>;
    /**
     * Search sessions by title (metadata only, cursor-based pagination)
     */
    search: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            query: string;
            limit?: number | undefined;
            cursor?: number | undefined;
        };
        output: any;
        meta: object;
    }>;
    /**
     * Create new session
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            provider: string;
            model: string;
            agentId?: string | undefined;
            enabledRuleIds?: string[] | undefined;
        };
        output: {
            id: `${string}-${string}-${string}-${string}-${string}`;
            title: string;
            agentId: string;
            provider: string | undefined;
            model: string | undefined;
            enabledRuleIds: never[];
            nextTodoId: number;
            createdAt: number;
            updatedAt: number;
        };
        meta: object;
    }>;
    /**
     * Update session title
     */
    updateTitle: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            title: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update session model
     */
    updateModel: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            model: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update session provider
     */
    updateProvider: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            provider: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update enabled rules
     */
    updateRules: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            enabledRuleIds: string[];
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update session agent
     */
    updateAgent: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            agentId: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Delete session
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Compact session (remove intermediate tool results)
     */
    compact: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Get context info (tokens, costs)
     */
    getContextInfo: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sessionId: string;
        };
        output: {
            totalTokens: number;
            baseContextTokens: number;
        };
        meta: object;
    }>;
    /**
     * Get total tokens across all sessions
     */
    getTotalTokens: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: any;
        meta: object;
    }>;
}>>;
/**
 * Export router instance
 *
 * Drop-in replacement for old session router (see session.router.old.ts).
 * All tRPC procedures preserved, now powered by Lens.
 */
export declare const sessionRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Get recent sessions metadata (cursor-based pagination)
     */
    getRecent: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            cursor?: number | undefined;
        };
        output: any;
        meta: object;
    }>;
    /**
     * Get session by ID with full data
     */
    getById: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sessionId: string;
        };
        output: {
            modelStatus: "unknown" | "available" | "unavailable";
            id: string;
            title?: string;
            modelId: string;
            agentId: string;
            enabledRuleIds: string[];
            enabledToolIds?: string[];
            enabledMcpServerIds?: string[];
            messages: import("@sylphx/code-core").SessionMessage[];
            todos: import("@sylphx/code-core").Todo[];
            nextTodoId: number;
            flags?: Record<string, boolean>;
            baseContextTokens?: number;
            totalTokens?: number;
            status?: import("@sylphx/code-core").SessionStatus;
            created: number;
            updated: number;
            provider?: import("@sylphx/code-core").ProviderId;
            model?: string;
        } | null;
        meta: object;
    }>;
    /**
     * Get session count
     */
    getCount: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: any;
        meta: object;
    }>;
    /**
     * Get last session (for headless mode)
     */
    getLast: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: any;
        meta: object;
    }>;
    /**
     * Search sessions by title (metadata only, cursor-based pagination)
     */
    search: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            query: string;
            limit?: number | undefined;
            cursor?: number | undefined;
        };
        output: any;
        meta: object;
    }>;
    /**
     * Create new session
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            provider: string;
            model: string;
            agentId?: string | undefined;
            enabledRuleIds?: string[] | undefined;
        };
        output: {
            id: `${string}-${string}-${string}-${string}-${string}`;
            title: string;
            agentId: string;
            provider: string | undefined;
            model: string | undefined;
            enabledRuleIds: never[];
            nextTodoId: number;
            createdAt: number;
            updatedAt: number;
        };
        meta: object;
    }>;
    /**
     * Update session title
     */
    updateTitle: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            title: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update session model
     */
    updateModel: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            model: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update session provider
     */
    updateProvider: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            provider: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update enabled rules
     */
    updateRules: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            enabledRuleIds: string[];
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update session agent
     */
    updateAgent: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            agentId: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Delete session
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Compact session (remove intermediate tool results)
     */
    compact: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Get context info (tokens, costs)
     */
    getContextInfo: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sessionId: string;
        };
        output: {
            totalTokens: number;
            baseContextTokens: number;
        };
        meta: object;
    }>;
    /**
     * Get total tokens across all sessions
     */
    getTotalTokens: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: any;
        meta: object;
    }>;
}>>;
//# sourceMappingURL=session.router.d.ts.map