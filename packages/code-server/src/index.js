/**
 * @sylphx/code-server
 * Embeddable tRPC server for multi-session AI streaming
 */
export { closeAppContext, createAppContext, initializeAppContext, } from "./context.js";
// ============================================================================
// CodeServer Class (for embedding)
// ============================================================================
export { CodeServer } from "./server.js";
// ============================================================================
// Lens Server (new Three-Layer Architecture)
// ============================================================================
export { createLensServer } from "./lens/index.js";
// ============================================================================
// Ask Queue Service
// ============================================================================
export { enqueueAsk, registerAskObserver } from "./services/ask-queue.service.js";
export { createContext } from "./trpc/context.js";
// ============================================================================
// tRPC Router & Context (for in-process use)
// ============================================================================
export { appRouter } from "./trpc/routers/index.js";
// ============================================================================
// Lens API (for type inference)
// ============================================================================
export { api } from "@sylphx/code-api";
// ============================================================================
// Version
// ============================================================================
export const version = "0.1.0";
//# sourceMappingURL=index.js.map