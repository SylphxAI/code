/**
 * MCP Event Emitter
 * Emits MCP status change events to client via eventBus
 *
 * ARCHITECTURE: Business logic stays in core, client is pure UI
 * - Core (this file): Calculates status and emits events
 * - Client: Listens to events and updates UI
 */
/**
 * Calculate and emit current MCP status
 */
export declare function emitMCPStatus(): Promise<void>;
//# sourceMappingURL=mcp-event-emitter.d.ts.map