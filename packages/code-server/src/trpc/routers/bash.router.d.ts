/**
 * Bash Router
 * tRPC API for bash process management
 *
 * Endpoints:
 * - execute: Execute bash command (active/background)
 * - list: List all bash processes
 * - get: Get bash process info
 * - kill: Kill bash process
 * - demote: Convert active → background (Ctrl+B)
 * - promote: Convert background → active (wait for slot)
 * - subscribe: Subscribe to bash output stream (via events router)
 */
export declare const bashRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Execute bash command
     *
     * Usage:
     * ```ts
     * // Active bash (blocks if slot occupied)
     * const bashId = await trpc.bash.execute.mutate({
     *   command: 'npm run dev',
     *   mode: 'active',
     *   timeout: 120000
     * })
     *
     * // Background bash (spawns immediately)
     * const bashId = await trpc.bash.execute.mutate({
     *   command: 'bun run build',
     *   mode: 'background'
     * })
     * ```
     */
    execute: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            command: string;
            mode?: "active" | "background" | undefined;
            cwd?: string | undefined;
            timeout?: number | undefined;
        };
        output: {
            bashId: string;
            command: string;
            mode: "active" | "background";
        };
        meta: object;
    }>;
    /**
     * List all bash processes
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            command: string;
            mode: import("@sylphx/code-core").BashMode;
            status: import("@sylphx/code-core").BashStatus;
            isActive: boolean;
            duration: number;
            exitCode: number | null;
            cwd: string;
        }[];
        meta: object;
    }>;
    /**
     * Get bash process info
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            bashId: string;
        };
        output: {
            id: string;
            command: string;
            mode: import("@sylphx/code-core").BashMode;
            status: import("@sylphx/code-core").BashStatus;
            isActive: boolean;
            startTime: number;
            endTime: number | null;
            exitCode: number | null;
            cwd: string;
            duration: number;
            stdout: string;
            stderr: string;
        };
        meta: object;
    }>;
    /**
     * Kill bash process
     */
    kill: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            bashId: string;
        };
        output: {
            success: boolean;
            bashId: string;
        };
        meta: object;
    }>;
    /**
     * Demote active bash → background (Ctrl+B)
     */
    demote: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            bashId: string;
        };
        output: {
            success: boolean;
            bashId: string;
            mode: string;
        };
        meta: object;
    }>;
    /**
     * Promote background bash → active (waits for slot)
     */
    promote: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            bashId: string;
        };
        output: {
            success: boolean;
            bashId: string;
            mode: string;
        };
        meta: object;
    }>;
    /**
     * Get active bash info
     */
    getActive: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            command: string;
            mode: import("@sylphx/code-core").BashMode;
            status: import("@sylphx/code-core").BashStatus;
            startTime: number;
            cwd: string;
            duration: number;
        } | null;
        meta: object;
    }>;
    /**
     * Get active queue length
     */
    getActiveQueueLength: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            count: number;
        };
        meta: object;
    }>;
}>>;
export type BashRouter = typeof bashRouter;
//# sourceMappingURL=bash.router.d.ts.map