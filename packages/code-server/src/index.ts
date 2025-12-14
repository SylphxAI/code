/**
 * @sylphx/code-server
 * Embeddable tRPC server for multi-session AI streaming
 */

export {
	type AppContext,
	closeAppContext,
	createAppContext,
	initializeAppContext,
} from "./context.js";
// ============================================================================
// CodeServer Class (for embedding)
// ============================================================================
export { CodeServer, type ServerConfig } from "./server.js";
// ============================================================================
// Lens Server (Three-Layer Architecture)
// ============================================================================
export {
	createLensServer,
	appRouter,
	type AppRouter,
} from "./lens/index.js";

// Note: Entity types are automatically inferred from AppRouter.
// No explicit exports needed - TypeScript-first approach.

// ============================================================================
// Ask Queue Service
// ============================================================================
export { enqueueAsk, initializeAskQueue, answerAsk } from "./services/ask-queue.service.js";

// ============================================================================
// Streaming Service
// ============================================================================
export type { StreamEvent } from "./services/streaming.service.js";

// ============================================================================
// Lens API (for type inference)
// ============================================================================
export { api, type API } from "@sylphx/code-api";

// ============================================================================
// Version
// ============================================================================
export const version = "0.1.0";
