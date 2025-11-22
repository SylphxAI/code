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
// LensServer Class (Lens framework)
// ============================================================================
export { LensServer, type LensServerConfig } from "./lens-server.js";
// ============================================================================
// Ask Queue Service
// ============================================================================
export { enqueueAsk, registerAskObserver } from "./services/ask-queue.service.js";
// ============================================================================
// Streaming Service
// ============================================================================
export type { StreamEvent } from "./services/streaming.service.js";
export { type Context, createContext } from "./trpc/context.js";
// ============================================================================
// tRPC Router & Context (for in-process use)
// ============================================================================
export { type AppRouter, appRouter } from "./trpc/routers/index.js";
// ============================================================================
// Lens API (for type inference)
// ============================================================================
export { api, type API } from "@sylphx/code-api";

// ============================================================================
// Version
// ============================================================================
export const version = "0.1.0";
