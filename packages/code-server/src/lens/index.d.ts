/**
 * Lens API for Sylphx Code
 *
 * New Three-Layer Architecture:
 * 1. Operations (queries/mutations) - Entry points, free-form
 * 2. Entity Resolvers - Nested data, N+1 batching
 * 3. Schema (entities/relations) - Pure types
 *
 * Key Features:
 * - Streaming native (async generators)
 * - Auto-optimistic from naming convention
 * - Type-safe field selection
 * - N+1 batching with DataLoader
 *
 * Usage:
 * ```typescript
 * // Server
 * const server = createLensServer(appContext)
 * server.listen(3000)
 *
 * // Client
 * const client = createClient<AppRouter>({
 *   links: [websocketLink({ url: 'ws://localhost:3000' })]
 * })
 *
 * // Query with field selection
 * const session = await client.queries.getSession({ id })
 *   .select({ title: true, messages: { steps: true } })
 *
 * // Streaming mutation
 * client.mutations.sendMessage({ sessionId, content }).subscribe(result => {
 *   console.log(result.assistantMessage) // Updates in real-time!
 * })
 * ```
 */
export { createLensServer, type AppRouter } from "./server.js";
export type { LensContext, LensDB, LensEventStream } from "./context.js";
export { Session, Message, Step, Part, StepUsage, Todo, } from "./entities.js";
export * as queries from "./queries.js";
export * as mutations from "./mutations.js";
export { createResolvers } from "./resolvers.js";
export { initializeLensAPI, type LensAPI } from "./compat.js";
//# sourceMappingURL=index.d.ts.map