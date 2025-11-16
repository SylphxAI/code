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

export { eventBus, type AppEvents } from "@sylphx/code-core";
