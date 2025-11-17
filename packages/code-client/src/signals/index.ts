/**
 * Framework-Agnostic Signals Public API
 * Main entry point for all signal functionality
 *
 * NOTE: This internal barrel file is kept for backwards compatibility.
 * External packages should import from the main package index which uses explicit exports.
 */

// Framework-agnostic core (replaces @sylphx/zen)
export * from "./core.js";

// Cross-domain computed signals
export * from "./computed/index.js";
export * from "./domain/ai/index.js";
export * from "./domain/queue/index.js";
export * from "./domain/session/index.js";
export * from "./domain/settings/index.js";
// Domain signals
export * from "./domain/ui/index.js";
// Effects and side effects
export * from "./effects/index.js";
// Event system
export * from "./events/index.js";

// Persistence: DISABLED - Client should not persist any state
// All state comes from server via tRPC
// export * from './persistence';

// DEPRECATED: Legacy zen re-export for backwards compatibility during migration
// TODO: Remove once all domain signals use ./core.ts
import { zen } from "@sylphx/zen";
export { zen };

// Note: useStore is exported by individual domain modules that need it
