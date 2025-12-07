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
class EventBus {
    listeners = new Map();
    /**
     * Subscribe to an event
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        const callbacks = this.listeners.get(event);
        callbacks.add(callback);
        // Return unsubscribe function
        return () => {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.listeners.delete(event);
            }
        };
    }
    /**
     * Emit an event
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (!callbacks)
            return;
        // Call all listeners
        for (const callback of callbacks) {
            try {
                callback(data);
            }
            catch (error) {
                console.error(`[EventBus] Error in ${event} listener:`, error);
            }
        }
    }
    /**
     * Remove all listeners (useful for cleanup in tests)
     */
    clear() {
        this.listeners.clear();
    }
    /**
     * Get listener count for an event (useful for debugging)
     */
    listenerCount(event) {
        return this.listeners.get(event)?.size || 0;
    }
}
// Singleton instance
export const eventBus = new EventBus();
//# sourceMappingURL=event-bus.js.map