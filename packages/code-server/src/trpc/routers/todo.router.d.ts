/**
 * Todo Router
 * Efficient todo management per session
 * SECURITY: Protected mutations (OWASP API2) + Rate limiting (OWASP API4)
 */
export declare const todoRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Update todos for session
     * Atomically replaces all todos
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            todos: {
                id: number;
                content: string;
                activeForm: string;
                status: "completed" | "pending" | "in_progress";
                ordering: number;
            }[];
            nextTodoId: number;
        };
        output: void;
        meta: object;
    }>;
}>>;
//# sourceMappingURL=todo.router.d.ts.map