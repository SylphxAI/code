/**
 * Event Publisher Utilities
 * Centralizes event publishing logic for multi-channel scenarios
 */
import type { EventStream } from "./event-stream.service.js";
/**
 * Publish session title update (model-level event)
 * Emits session-updated with partial session containing title
 * Frontend subscriptions will merge this with existing session state
 *
 * Publishes to both channels:
 * - session:${sessionId} - for clients viewing that specific session
 * - session-events - for global sidebar sync across all clients
 */
export declare function publishTitleUpdate(eventStream: EventStream, sessionId: string, title: string): Promise<void>;
/**
 * Publish session creation to global channel
 */
export declare function publishSessionCreated(eventStream: EventStream, sessionId: string, provider: string, model: string): Promise<void>;
/**
 * Publish session deletion to global channel
 */
export declare function publishSessionDeleted(eventStream: EventStream, sessionId: string): Promise<void>;
/**
 * Publish session model update to global channel
 */
export declare function publishModelUpdate(eventStream: EventStream, sessionId: string, model: string): Promise<void>;
/**
 * Publish session provider update to global channel
 */
export declare function publishProviderUpdate(eventStream: EventStream, sessionId: string, provider: string, model: string): Promise<void>;
//# sourceMappingURL=event-publisher.d.ts.map