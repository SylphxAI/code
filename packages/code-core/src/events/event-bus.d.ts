/**
 * Event Bus - Lightweight pub/sub for decoupling components
 *
 * Architecture:
 * - Core domain logic can emit events without depending on UI
 * - Client/UI layers subscribe to events
 * - Prevents circular dependencies between layers
 *
 * Benefits:
 * - No circular dependencies
 * - Clear data flow (core → client)
 * - Easy to trace event sources and listeners
 */
type EventCallback<T = unknown> = (data: T) => void;
type Unsubscribe = () => void;
/**
 * Event Types
 */
export interface AppEvents {
    "session:created": {
        sessionId: string;
        enabledRuleIds: string[];
    };
    "session:changed": {
        sessionId: string | null;
    };
    "session:rulesUpdated": {
        sessionId: string;
        enabledRuleIds: string[];
    };
    "session:loaded": {
        sessionId: string;
        enabledRuleIds: string[];
    };
    "streaming:started": {
        sessionId: string;
        messageId: string;
    };
    "streaming:completed": {
        sessionId: string;
        messageId: string;
    };
    "settings:agentChanged": {
        agentId: string;
    };
    "settings:rulesChanged": {
        ruleIds: string[];
    };
    "mcp:statusChanged": {
        total: number;
        connected: number;
        failed: number;
        toolCount: number;
    };
    "config:loaded": {
        config: unknown;
    };
    "provider:selected": {
        providerId: string;
    };
    "model:selected": {
        providerId: string;
        modelId: string;
    };
    "config:error": {
        error: string;
    };
    "navigation:changed": {
        from: string;
        to: string;
    };
    "loading:started": {
        context: string;
    };
    "loading:finished": {
        context: string;
    };
    "error:shown": {
        error: string;
    };
    "error:cleared": Record<string, never>;
}
declare class EventBus {
    private listeners;
    /**
     * Subscribe to an event
     */
    on<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): Unsubscribe;
    /**
     * Emit an event
     */
    emit<K extends keyof AppEvents>(event: K, data: AppEvents[K]): void;
    /**
     * Remove all listeners (useful for cleanup in tests)
     */
    clear(): void;
    /**
     * Get listener count for an event (useful for debugging)
     */
    listenerCount(event: keyof AppEvents): number;
}
export declare const eventBus: EventBus;
export {};
//# sourceMappingURL=event-bus.d.ts.map