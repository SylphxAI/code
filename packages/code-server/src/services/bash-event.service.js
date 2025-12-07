/**
 * Bash Event Service
 * Bridges BashManagerV2 events to AppEventStream for multi-client sync
 *
 * Architecture:
 * - Listens to bash:event from BashManagerV2
 * - Publishes to channel "bash:{bashId}"
 * - Stores in database for restorable streaming
 * - Clients subscribe via trpc.events.subscribe({ channel: "bash:xxx" })
 */
/**
 * Initialize bash event bridge
 * Call this once on server startup
 */
export function initializeBashEventBridge(appContext) {
    const { bashManagerV2, eventStream } = appContext;
    // Listen to all bash events
    bashManagerV2.on("bash:event", (event) => {
        const channel = `bash:${event.bashId}`;
        // Publish to individual bash channel (persisted + real-time)
        eventStream.publish(channel, event).catch((err) => {
            console.error("[BashEventBridge] Failed to publish event:", err);
        });
        // Also publish to global channel for discovery (only "started" events)
        if (event.type === "started") {
            eventStream.publish("bash:all", event).catch((err) => {
                console.error("[BashEventBridge] Failed to publish to bash:all:", err);
            });
        }
    });
    // Listen to active-queued events
    bashManagerV2.on("active-queued", (data) => {
        const channel = `bash:${data.bashId}`;
        eventStream
            .publish(channel, {
            type: "queued",
            bashId: data.bashId,
            queuePosition: data.queuePosition,
            timestamp: Date.now(),
        })
            .catch((err) => {
            console.error("[BashEventBridge] Failed to publish queued event:", err);
        });
    });
}
//# sourceMappingURL=bash-event.service.js.map