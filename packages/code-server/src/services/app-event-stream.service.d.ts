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
import { Observable } from "rxjs";
import type { EventCursor, EventPersistence, StoredEvent } from "./event-persistence.service.js";
/**
 * App Event Stream
 * Provides pub/sub with history and pattern matching
 */
export declare class AppEventStream {
    private persistence;
    private options;
    private subjects;
    private activeChannels;
    private masterSubject;
    private sequenceCounters;
    private cleanupInterval?;
    constructor(persistence?: EventPersistence | undefined, options?: {
        bufferSize?: number;
        bufferTime?: number;
        cleanupInterval?: number;
    });
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
    publish<T = any>(channel: string, event: {
        type?: string;
        [key: string]: any;
    }): Promise<{
        id: string;
        cursor: EventCursor;
    }>;
    /**
     * Subscribe to channel with optional cursor replay
     *
     * @param channel - Exact channel (e.g., 'session:abc123', 'session-events')
     * @param fromCursor - Start reading AFTER this cursor (undefined = only new events)
     * @returns Observable of events
     */
    subscribe(channel: string, fromCursor?: EventCursor): Observable<StoredEvent>;
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
    subscribeWithHistory(channel: string, lastN?: number): Observable<StoredEvent>;
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
    subscribePattern(pattern: RegExp): Observable<StoredEvent>;
    /**
     * Get channel info (XINFO equivalent)
     */
    info(channel: string): Promise<{
        inMemoryCount: number;
        persistedCount?: number;
        firstId?: string | null;
        lastId?: string | null;
    }>;
    /**
     * Cleanup old events from memory and persistence
     */
    cleanup(): Promise<void>;
    /**
     * Cleanup channel (keep last N events)
     */
    cleanupChannel(channel: string, keep: number): Promise<void>;
    /**
     * Destroy stream (cleanup resources)
     */
    destroy(): void;
    /**
     * Generate cursor-based ID (similar to Redis Stream IDs)
     * Format: evt_<timestamp>_<sequence>
     */
    private generateId;
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
    private getOrCreateSubject;
}
/**
 * Global singleton instance
 * Initialized by server with persistence
 */
export declare let appEventStream: AppEventStream;
/**
 * Initialize global event stream
 * Called by server on startup
 */
export declare function initializeEventStream(persistence?: EventPersistence): AppEventStream;
//# sourceMappingURL=app-event-stream.service.d.ts.map