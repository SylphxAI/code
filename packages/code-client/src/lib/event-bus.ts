/**
 * Event Bus - Re-exported from @sylphx/code-core
 *
 * Pure UI Client Architecture:
 * - Core emits domain events (session changes, streaming, MCP status)
 * - Client subscribes to events for UI updates
 * - Prevents circular dependencies (core doesn't depend on client)
 *
 * Benefits:
 * - No circular dependencies
 * - Clear data flow (core → client)
 * - Easy to trace event sources and listeners
 */

export { type AppEvents, eventBus } from "@sylphx/code-core";
