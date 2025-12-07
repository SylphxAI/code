/**
 * App Event Stream Service
 * In-memory event stream with optional persistence
 * Similar to Redis Streams with pub/sub
 *
 * Features:
 * - Channel-based routing (session-events, session:{id}, config:*, app:*)
 * - Exact channel subscriptions
 * - Pattern-based subscriptions (session:*:field:*, session:123:field:*)
 * - Cursor-based replay from database
 * - Auto-cleanup of old events
 * - In-memory + optional persistence
 */
import { Observable, ReplaySubject } from "rxjs";
import { filter } from "rxjs/operators";
/**
 * Compare two event cursors
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareCursors(a, b) {
    if (a.timestamp !== b.timestamp) {
        return a.timestamp < b.timestamp ? -1 : 1;
    }
    if (a.sequence !== b.sequence) {
        return a.sequence < b.sequence ? -1 : 1;
    }
    return 0;
}
/**
 * App Event Stream
 * Provides pub/sub with history and pattern matching
 */
export class AppEventStream {
    persistence;
    options;
    // Per-channel subjects (in-memory buffers)
    subjects = new Map();
    // Track all channels that have been published to (for pattern matching)
    activeChannels = new Set();
    // Pattern subscription master subject (emits all events from all channels)
    masterSubject = new ReplaySubject(100, 5 * 60 * 1000);
    // Sequence counters per timestamp
    sequenceCounters = new Map();
    // Cleanup interval
    cleanupInterval;
    constructor(persistence = undefined, options = {}) {
        this.persistence = persistence;
        this.options = options;
        const { bufferSize = 100, bufferTime = 5 * 60 * 1000, // 5 minutes
        cleanupInterval = 60 * 1000, // 60 seconds
         } = options;
        // Start cleanup interval
        if (cleanupInterval > 0) {
            this.cleanupInterval = setInterval(() => {
                this.cleanup().catch((err) => {
                    console.error("[AppEventStream] Cleanup error:", err);
                });
            }, cleanupInterval);
        }
    }
    /**
     * Publish event to channel (XADD equivalent)
     *
     * Two modes:
     * 1. Event mode: { type: "event-type", ...payload } - For streaming events
     * 2. Entity mode: { id: "...", ...fields } - For Lens entities (session:${id})
     *
     * Entity mode (session:${id} channel):
     * - No persistence needed (entity is already in database)
     * - Type derived as "entity-update"
     * - Used by Lens for model-level subscriptions
     *
     * @param channel - Channel to publish to (e.g., 'session:abc', 'config:ai')
     * @param event - Event payload (with type) or entity (without type)
     * @returns Event ID and cursor
     */
    async publish(channel, event) {
        // Generate cursor-based ID
        const { id, cursor } = this.generateId();
        // Determine if this is an entity channel (session:${id})
        // Entity channels publish model data directly, not events
        const isEntityChannel = /^session:[^:]+$/.test(channel) && !channel.includes("-stream");
        // Derive type: explicit type, or "entity-update" for entity channels
        const eventType = event.type || (isEntityChannel ? "entity-update" : "unknown");
        // Create stored event
        const storedEvent = {
            id,
            cursor,
            channel,
            type: eventType,
            timestamp: cursor.timestamp,
            payload: event,
        };
        // 1. Track channel for pattern matching
        this.activeChannels.add(channel);
        // 2. Publish to channel-specific subject (exact subscriptions)
        const subject = this.getOrCreateSubject(channel);
        subject.next(storedEvent);
        // 3. Publish to master subject (pattern subscriptions)
        this.masterSubject.next(storedEvent);
        // 4. Persist to database (async, non-blocking)
        // Skip persistence for entity channels - entity itself is already persisted in DB
        // Only streaming events need replay capability
        if (this.persistence && !isEntityChannel) {
            this.persistence.save(channel, storedEvent).catch((err) => {
                console.error("[AppEventStream] Persistence error:", err);
            });
        }
        return { id, cursor };
    }
    /**
     * Subscribe to channel with optional cursor replay
     *
     * @param channel - Exact channel (e.g., 'session:abc123', 'session-events')
     * @param fromCursor - Start reading AFTER this cursor (undefined = only new events)
     * @returns Observable of events
     */
    subscribe(channel, fromCursor) {
        return new Observable((observer) => {
            const subject = this.getOrCreateSubject(channel);
            // If no persistence or no cursor, just subscribe to live stream
            if (!this.persistence || !fromCursor) {
                const subscription = subject.subscribe(observer);
                return () => subscription.unsubscribe();
            }
            // Track events received from ReplaySubject while persistence is loading
            const bufferedEvents = [];
            let persistenceComplete = false;
            let lastReplayedCursor = null;
            // 1. Subscribe to in-memory stream FIRST (to not miss any events)
            const subscription = subject.subscribe({
                next: (event) => {
                    if (!persistenceComplete) {
                        // Buffer events while persistence is loading
                        bufferedEvents.push(event);
                    }
                    else {
                        // Persistence done - only emit if event is AFTER last replayed cursor
                        if (!lastReplayedCursor || compareCursors(event.cursor, lastReplayedCursor) > 0) {
                            observer.next(event);
                        }
                    }
                },
                error: (err) => observer.error(err),
                complete: () => observer.complete(),
            });
            // 2. Replay from persistence (async)
            this.persistence
                .readFrom(channel, fromCursor, 100)
                .then((events) => {
                // Emit all historical events
                events.forEach((event) => observer.next(event));
                // Track last replayed cursor
                if (events.length > 0) {
                    lastReplayedCursor = events[events.length - 1].cursor;
                }
                // Mark persistence as complete
                persistenceComplete = true;
                // Emit buffered events that are AFTER last replayed cursor
                bufferedEvents.forEach((event) => {
                    if (!lastReplayedCursor || compareCursors(event.cursor, lastReplayedCursor) > 0) {
                        observer.next(event);
                    }
                });
                // Clear buffer
                bufferedEvents.length = 0;
            })
                .catch((err) => {
                console.error("[AppEventStream] Replay error:", err);
                // Mark as complete anyway to let buffered events flow through
                persistenceComplete = true;
                bufferedEvents.forEach((event) => observer.next(event));
                bufferedEvents.length = 0;
            });
            // Cleanup
            return () => subscription.unsubscribe();
        });
    }
    /**
     * Subscribe to latest N events + new events
     *
     * Replay Behavior:
     * - If persistence configured: Fetches last N from database, emits async
     * - If no persistence: Only new events (no replay)
     * - ReplaySubject buffer: Automatically replays last 10 in-memory events
     *
     * Event Ordering:
     * - Replay events (from DB): Oldest to newest, emitted first
     * - Buffer events (from ReplaySubject): Last 10 in-memory events
     * - New events: Real-time as published
     *
     * IMPORTANT - Deduplication:
     * ReplaySubject has bufferSize=10, which means:
     * 1. Recent events (last 10) replayed from in-memory buffer automatically
     * 2. Historical events (lastN) replayed from database if requested
     * 3. If lastN <= 10, you may receive duplicate events
     * 4. Client should deduplicate by event ID if needed
     *
     * Example Timeline:
     * ```
     * Events published: e1, e2, e3, ..., e20
     * ReplaySubject buffer (size 10): e11, e12, ..., e20
     * Database: e1, e2, ..., e20
     *
     * Client subscribes with replayLast=15:
     * - DB replay: e6, e7, e8, e9, e10 (15 events, but only e1-e10 exist before buffer)
     * - Buffer replay: e11, e12, ..., e20 (automatic from ReplaySubject)
     * - Result: Client receives e6-e20 (no duplicates because DB stops at e10)
     *
     * Client subscribes with replayLast=50:
     * - DB replay: e1, e2, ..., e20 (all 20 events)
     * - Buffer replay: e11, e12, ..., e20 (automatic from ReplaySubject)
     * - Result: Client receives e1-e20, with e11-e20 DUPLICATED
     * - Solution: Deduplicate by event.id on client side
     * ```
     *
     * @param channel - Channel to subscribe to
     * @param lastN - Number of latest events to replay from database (0 = no DB replay)
     */
    subscribeWithHistory(channel, lastN = 0) {
        return new Observable((observer) => {
            // 1. Replay latest N from persistence (database)
            // This emits asynchronously, before ReplaySubject buffer events
            if (this.persistence && lastN > 0) {
                this.persistence
                    .readLatest(channel, lastN)
                    .then((events) => {
                    // Emit events in order (oldest to newest)
                    events.forEach((event) => observer.next(event));
                })
                    .catch((err) => {
                    console.error("[AppEventStream] History replay error:", err);
                    // Non-fatal: Continue with live subscription even if replay fails
                });
            }
            // 2. Subscribe to new events + ReplaySubject buffer
            // ReplaySubject automatically replays last 10 in-memory events
            const subject = this.getOrCreateSubject(channel);
            const subscription = subject.subscribe(observer);
            // Cleanup function
            return () => subscription.unsubscribe();
        });
    }
    /**
     * Subscribe to channel pattern (NEW for Lens integration)
     *
     * Enables pattern-based subscriptions for field-level updates.
     *
     * Examples:
     * - /^session:.*:field:.*$/ - All field updates for all sessions
     * - /^session:123:field:.*$/ - All field updates for session 123
     * - /^session:.*:field:title$/ - Title updates for all sessions
     *
     * Architecture:
     * - Uses masterSubject which receives ALL events from ALL channels
     * - Filters events by pattern matching on channel name
     * - Efficient: No need to subscribe to each channel individually
     * - Real-time: Automatically receives events from new channels
     *
     * @param pattern - RegExp pattern to match channel names
     * @returns Observable of matching events
     */
    subscribePattern(pattern) {
        return this.masterSubject.pipe(filter((event) => pattern.test(event.channel)));
    }
    /**
     * Get channel info (XINFO equivalent)
     */
    async info(channel) {
        const subject = this.subjects.get(channel);
        const inMemoryCount = subject?.observers.length ?? 0;
        let persistedInfo;
        if (this.persistence) {
            persistedInfo = await this.persistence.info(channel);
        }
        return {
            inMemoryCount,
            persistedCount: persistedInfo?.length,
            firstId: persistedInfo?.firstId ?? undefined,
            lastId: persistedInfo?.lastId ?? undefined,
        };
    }
    /**
     * Cleanup old events from memory and persistence
     */
    async cleanup() {
        const now = Date.now();
        const cutoff = now - (this.options.bufferTime ?? 5 * 60 * 1000);
        // Cleanup persistence
        if (this.persistence) {
            await this.persistence.cleanup(cutoff);
        }
        // Cleanup sequence counters
        for (const [timestamp] of this.sequenceCounters) {
            if (timestamp < cutoff) {
                this.sequenceCounters.delete(timestamp);
            }
        }
        // Note: ReplaySubject auto-cleanup based on windowTime
    }
    /**
     * Cleanup channel (keep last N events)
     */
    async cleanupChannel(channel, keep) {
        if (this.persistence) {
            await this.persistence.cleanupChannel(channel, keep);
        }
    }
    /**
     * Destroy stream (cleanup resources)
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        // Complete all channel-specific subjects
        for (const subject of this.subjects.values()) {
            subject.complete();
        }
        // Complete master subject
        this.masterSubject.complete();
        this.subjects.clear();
        this.activeChannels.clear();
    }
    // ========== Private Methods ==========
    /**
     * Generate cursor-based ID (similar to Redis Stream IDs)
     * Format: evt_<timestamp>_<sequence>
     */
    generateId() {
        const timestamp = Date.now();
        // Get or increment sequence for this timestamp
        const sequence = this.sequenceCounters.get(timestamp) ?? 0;
        this.sequenceCounters.set(timestamp, sequence + 1);
        return {
            id: `evt_${timestamp}_${sequence}`,
            cursor: { timestamp, sequence },
        };
    }
    /**
     * Get or create ReplaySubject for channel
     *
     * IMPORTANT: Buffer size balances memory usage vs event loss prevention
     *
     * Buffer Size Considerations:
     * - Too small (10): UC2 fails - compact auto-response loses early events
     * - Too large (100): Tests fail - session reuse receives old session events
     * - Current (50): Balances both use cases
     *
     * Use Cases:
     * 1. Normal streaming: Client subscribes immediately, buffer not critical
     * 2. Compact auto-response: Server starts streaming before client subscribes
     *    - Need large buffer to prevent event loss
     *    - 50 events ~= 2-3 seconds of fast streaming
     * 3. Session reuse: Client subscribes to existing session
     *    - Don't want to replay old session's events
     *    - 50 events is acceptable overlap
     *
     * Architecture:
     * - ReplaySubject buffer: In-memory, fast, limited size (50)
     * - Persistence layer: Database, slower, unlimited size
     * - Client uses replayLast parameter to control DB replay
     */
    getOrCreateSubject(channel) {
        if (!this.subjects.has(channel)) {
            // Balance between UC2 (compact) and test reliability
            // 50 events ~= 2-3 seconds of fast streaming (tool calls, reasoning, text)
            const bufferSize = 50;
            const bufferTime = this.options.bufferTime ?? 5 * 60 * 1000;
            this.subjects.set(channel, new ReplaySubject(bufferSize, bufferTime));
        }
        return this.subjects.get(channel);
    }
}
/**
 * Global singleton instance
 * Initialized by server with persistence
 */
export let appEventStream;
/**
 * Initialize global event stream
 * Called by server on startup
 */
export function initializeEventStream(persistence) {
    appEventStream = new AppEventStream(persistence, {
        bufferSize: 100,
        bufferTime: 5 * 60 * 1000, // 5 minutes
        cleanupInterval: 60 * 1000, // 60 seconds
    });
    return appEventStream;
}
//# sourceMappingURL=app-event-stream.service.js.map