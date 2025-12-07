/**
 * Lens Server Setup
 *
 * Creates and configures the Lens server with:
 * - All entities
 * - All relations
 * - All queries and mutations
 * - Entity resolvers
 * - Context factory (database, event stream)
 *
 * Exports AppRouter type for client type inference.
 */
import type { AppContext } from "../context.js";
/**
 * Create Lens server instance
 *
 * @param appContext - Application context with database and event stream
 * @returns Configured Lens server
 */
export declare function createLensServer(appContext: AppContext): any;
/**
 * Export router type for client type inference
 *
 * Usage on client:
 * ```typescript
 * import type { AppRouter } from '@code/server/lens/server'
 *
 * const client = createClient<AppRouter>({
 *   links: [websocketLink({ url: 'ws://...' })]
 * })
 * ```
 */
export type AppRouter = ReturnType<typeof createLensServer>["_types"];
export type { LensContext, LensDB, LensEventStream } from "./context.js";
export * from "./entities.js";
//# sourceMappingURL=server.d.ts.map