/**
 * System Message Helpers
 * Creates system role messages for dynamic LLM hints
 *
 * Architecture:
 * - System messages are stored as 'system' role in database
 * - Converted to 'user' role when building model messages (attention decay prevention)
 * - Wrapped in <system_message> tags for LLM recognition
 * - Triggered by various conditions (context usage, resources, todos)
 *
 * Use Cases:
 * 1. Context usage warnings (80%, 90% thresholds)
 * 2. Session start todo hints
 * 3. System resource warnings (CPU, Memory > 80%)
 */
/**
 * System message types
 */
export type SystemMessageType = "context-warning-80" | "context-warning-90" | "session-start-todos" | "resource-warning-cpu" | "resource-warning-memory";
/**
 * System message content builders
 */
export declare const SystemMessages: {
    /**
     * Context usage warning at 80%
     * Triggered once when context usage exceeds 80%
     */
    contextWarning80(): string;
    /**
     * Context usage critical at 90%
     * Triggered once when context usage exceeds 90%
     */
    contextWarning90(): string;
    /**
     * Session start with existing todos
     * Triggered at first user message in new session
     */
    sessionStartWithTodos(todos: Array<{
        content: string;
        status: string;
    }>): string;
    /**
     * Session start without todos (reminder)
     * Triggered at first user message in new session with no todos
     */
    sessionStartNoTodos(): string;
    /**
     * CPU usage warning
     * Triggered when CPU usage exceeds 80%
     */
    resourceWarningCPU(usage: string): string;
    /**
     * Memory usage warning
     * Triggered when memory usage exceeds 80%
     */
    resourceWarningMemory(usage: string): string;
};
/**
 * Helper to create system message content
 * Wraps content in <system_message> tags
 *
 * @deprecated Use SystemMessages builders instead
 */
export declare function createSystemMessage(type: string, content: string): string;
/**
 * Parse system message to extract type
 * Used for deduplication (ensure each type only appears once)
 */
export declare function parseSystemMessageType(content: string): string | null;
/**
 * Check if message is a system message
 */
export declare function isSystemMessage(content: string): boolean;
//# sourceMappingURL=index.d.ts.map