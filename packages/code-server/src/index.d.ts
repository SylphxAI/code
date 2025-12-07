/**
 * @sylphx/code-server
 * Embeddable tRPC server for multi-session AI streaming
 */
export { type AppContext, closeAppContext, createAppContext, initializeAppContext, } from "./context.js";
export { CodeServer, type ServerConfig } from "./server.js";
export { createLensServer, type AppRouter as LensRouter } from "./lens/index.js";
export { enqueueAsk, registerAskObserver } from "./services/ask-queue.service.js";
export type { StreamEvent } from "./services/streaming.service.js";
export { type Context, createContext } from "./trpc/context.js";
export { type AppRouter, appRouter } from "./trpc/routers/index.js";
export { api, type API } from "@sylphx/code-api";
export declare const version = "0.1.0";
//# sourceMappingURL=index.d.ts.map