/**
 * Lens Compatibility Layer
 *
 * Provides backward-compatible API for existing tRPC routers.
 * Will be removed after full migration to new Lens architecture.
 *
 * OLD API:
 * ```typescript
 * const lensAPI = initializeLensAPI(ctx.appContext)
 * await lensAPI.Session.get.query({ id })
 * await lensAPI.Session.create.mutate({ title: "..." })
 * ```
 *
 * This layer wraps the new Lens server to provide the old interface.
 */
import type { AppContext } from "../context.js";
/**
 * Initialize Lens API with backward-compatible interface
 *
 * @deprecated Use createLensServer directly for new code
 */
export declare function initializeLensAPI(appContext: AppContext): {
    Session: {
        get: {
            query: (input: {
                id: string;
            }) => Promise<import("@sylphx/code-core").Session | null>;
            subscribe: () => never;
        };
        list: {
            query: (input?: {
                limit?: number;
                offset?: number;
                orderBy?: any;
            }) => Promise<any>;
            subscribe: () => never;
        };
        create: {
            mutate: (input: {
                title?: string;
                agentId?: string;
                provider?: string;
                model?: string;
            }) => Promise<{
                id: `${string}-${string}-${string}-${string}-${string}`;
                title: string;
                agentId: string;
                provider: string | undefined;
                model: string | undefined;
                enabledRuleIds: never[];
                nextTodoId: number;
                createdAt: number;
                updatedAt: number;
            }>;
        };
        update: {
            mutate: (input: {
                id: string;
                [key: string]: any;
            }) => Promise<{
                id: string;
            }>;
        };
        delete: {
            mutate: (input: {
                id: string;
            }) => Promise<{
                id: string;
            }>;
        };
        getLast: () => Promise<any>;
        search: (query: string, limit?: number) => Promise<any>;
        getCount: () => Promise<any>;
        updateTitle: (sessionId: string, title: string) => Promise<void>;
        updateModel: (sessionId: string, model: string) => Promise<void>;
        updateProvider: (sessionId: string, provider: string) => Promise<void>;
        updateRules: (sessionId: string, enabledRuleIds: string[]) => Promise<void>;
        updateAgent: (sessionId: string, agentId: string) => Promise<void>;
        compact: (sessionId: string) => Promise<{
            success: boolean;
        }>;
        getContextInfo: (sessionId: string) => Promise<{
            totalTokens: number;
            baseContextTokens: number;
        }>;
        getTotalTokens: () => Promise<any>;
    };
    ctx: {
        db: {
            session: import("@sylphx/code-core").SessionRepository;
            message: import("@sylphx/code-core").MessageRepository;
        };
        eventStream: import("../services/app-event-stream.service.js").AppEventStream;
    };
};
export type LensAPI = ReturnType<typeof initializeLensAPI>;
//# sourceMappingURL=compat.d.ts.map