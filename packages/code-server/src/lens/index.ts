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

// Server factory
export { createLensServer, type AppRouter } from "./server.js";

// Context types (no composables - use ctx directly in resolvers)
export type { LensContext, LensDB, LensEventStream } from "./context.js";

// Entities (for type inference)
export {
	Session,
	Message,
	Step,
	Part,
	StepUsage,
	Todo,
} from "./entities.js";

// Relations (not yet supported by lens-server)
// export { relations } from "./relations.js";

// Operations (for direct access if needed)
export * as queries from "./queries.js";
export * as mutations from "./mutations.js";

// Entity resolvers factory (creates resolvers with db closure)
export { createResolvers } from "./resolvers.js";

// Backward compatibility layer for tRPC routers
// @deprecated Use createLensServer directly for new code
export { initializeLensAPI, type LensAPI } from "./compat.js";
