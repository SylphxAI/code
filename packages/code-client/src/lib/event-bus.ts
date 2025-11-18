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

import { eventBus as eventBusImport } from "@sylphx/code-core";
export type { AppEvents } from "@sylphx/code-core";

// Re-export with proper type annotation to fix TypeScript inference
export const eventBus = eventBusImport as {
	on<K extends string>(event: K, callback: (data: any) => void): () => void;
	emit<K extends string>(event: K, data: any): void;
	clear(): void;
	listenerCount(event: string): number;
};
