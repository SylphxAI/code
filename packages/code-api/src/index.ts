/**
 * @sylphx/code-api
 *
 * Type-safe API definitions using Lens framework
 * Replaces tRPC for in-process and remote communication
 */

export { api } from "./api.js";
export type { API } from "./api.js";

// Re-export schemas for client use
export * from "./schemas/index.js";
