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
	// Session events
	"session:created": { sessionId: string; enabledRuleIds: string[] };
	"session:changed": { sessionId: string | null };
	"session:rulesUpdated": { sessionId: string; enabledRuleIds: string[] };
	"session:loaded": { sessionId: string; enabledRuleIds: string[] }; // Server fetch complete

	// Streaming events
	"streaming:started": { sessionId: string; messageId: string };
	"streaming:completed": { sessionId: string; messageId: string };

	// Settings events
	"settings:agentChanged": { agentId: string };
	"settings:rulesChanged": { ruleIds: string[] };

	// MCP events
	"mcp:statusChanged": {
		total: number;
		connected: number;
		failed: number;
		toolCount: number;
	};

	// AI events
	"config:loaded": { config: unknown };
	"provider:selected": { providerId: string };
	"model:selected": { providerId: string; modelId: string };
	"config:error": { error: string };

	// UI events
	"navigation:changed": { from: string; to: string };
	"loading:started": { context: string };
	"loading:finished": { context: string };
	"error:shown": { error: string };
	"error:cleared": Record<string, never>;
}

class EventBus {
	private listeners = new Map<keyof AppEvents, Set<EventCallback>>();

	/**
	 * Subscribe to an event
	 */
	on<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): Unsubscribe {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}

		const callbacks = this.listeners.get(event)!;
		callbacks.add(callback as EventCallback);

		// Return unsubscribe function
		return () => {
			callbacks.delete(callback as EventCallback);
			if (callbacks.size === 0) {
				this.listeners.delete(event);
			}
		};
	}

	/**
	 * Emit an event
	 */
	emit<K extends keyof AppEvents>(event: K, data: AppEvents[K]): void {
		const callbacks = this.listeners.get(event);
		if (!callbacks) return;

		// Call all listeners
		for (const callback of callbacks) {
			try {
				callback(data);
			} catch (error) {
				console.error(`[EventBus] Error in ${event} listener:`, error);
			}
		}
	}

	/**
	 * Remove all listeners (useful for cleanup in tests)
	 */
	clear(): void {
		this.listeners.clear();
	}

	/**
	 * Get listener count for an event (useful for debugging)
	 */
	listenerCount(event: keyof AppEvents): number {
		return this.listeners.get(event)?.size || 0;
	}
}

// Singleton instance
export const eventBus = new EventBus();
