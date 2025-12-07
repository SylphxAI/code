/**
 * Event Publisher Utilities
 * Centralizes event publishing logic for multi-channel scenarios
 */
/**
 * Publish session title update (model-level event)
 * Emits session-updated with partial session containing title
 * Frontend subscriptions will merge this with existing session state
 *
 * Publishes to both channels:
 * - session:${sessionId} - for clients viewing that specific session
 * - session-events - for global sidebar sync across all clients
 */
export async function publishTitleUpdate(eventStream, sessionId, title) {
    const sessionUpdate = {
        id: sessionId,
        title,
        updatedAt: Date.now(),
    };
    await Promise.all([
        // Session-specific channel - Lens format (entity directly)
        eventStream.publish(`session:${sessionId}`, sessionUpdate),
        // Global channel (sidebar sync for all clients)
        eventStream.publish("session-events", {
            type: "session-updated",
            sessionId,
            session: sessionUpdate,
        }),
    ]);
}
/**
 * Publish session creation to global channel
 */
export async function publishSessionCreated(eventStream, sessionId, provider, model) {
    await eventStream.publish("session-events", {
        type: "session-created",
        sessionId,
        provider,
        model,
    });
}
/**
 * Publish session deletion to global channel
 */
export async function publishSessionDeleted(eventStream, sessionId) {
    await eventStream.publish("session-events", {
        type: "session-deleted",
        sessionId,
    });
}
/**
 * Publish session model update to global channel
 */
export async function publishModelUpdate(eventStream, sessionId, model) {
    await eventStream.publish("session-events", {
        type: "session-model-updated",
        sessionId,
        model,
    });
}
/**
 * Publish session provider update to global channel
 */
export async function publishProviderUpdate(eventStream, sessionId, provider, model) {
    await eventStream.publish("session-events", {
        type: "session-provider-updated",
        sessionId,
        provider,
        model,
    });
}
//# sourceMappingURL=event-publisher.js.map