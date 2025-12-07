/**
 * Event Persistence Service
 * Stores events in database with cursor-based replay support
 * Similar to Redis Streams (XADD/XREAD/XREVRANGE)
 */
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
/**
 * Event cursor for position-based reading
 * Similar to Redis Stream IDs (timestamp-sequence)
 */
export interface EventCursor {
    timestamp: number;
    sequence: number;
}
/**
 * Stored event with cursor
 */
export interface StoredEvent<T = any> {
    id: string;
    cursor: EventCursor;
    channel: string;
    type: string;
    timestamp: number;
    payload: T;
}
/**
 * Event Persistence using Drizzle ORM
 * Database-agnostic (works with SQLite and PostgreSQL)
 */
export declare class EventPersistence {
    private db;
    constructor(db: BetterSQLite3Database);
    /**
     * Save event to database (XADD equivalent)
     * Retries on SQLITE_BUSY errors with exponential backoff
     */
    save(_channel: string, event: StoredEvent): Promise<void>;
    /**
     * Read events from cursor (XREAD equivalent)
     *
     * @param channel - Channel to read from
     * @param cursor - Start reading AFTER this cursor (undefined = from beginning)
     * @param limit - Max events to return
     */
    readFrom(channel: string, cursor?: EventCursor, limit?: number): Promise<StoredEvent[]>;
    /**
     * Read latest N events (XREVRANGE equivalent)
     *
     * @param channel - Channel to read from
     * @param limit - Number of events to return
     */
    readLatest(channel: string, limit: number): Promise<StoredEvent[]>;
    /**
     * Read events in range (XRANGE equivalent)
     *
     * @param channel - Channel to read from
     * @param start - Start cursor (inclusive)
     * @param end - End cursor (inclusive)
     * @param limit - Max events to return
     */
    readRange(channel: string, start: EventCursor, end: EventCursor, limit?: number): Promise<StoredEvent[]>;
    /**
     * Get event count for channel
     */
    count(channel: string): Promise<number>;
    /**
     * Cleanup old events (XTRIM equivalent)
     *
     * @param beforeTimestamp - Delete events before this timestamp
     */
    cleanup(beforeTimestamp: number): Promise<number>;
    /**
     * Cleanup events by channel (keep last N)
     *
     * @param channel - Channel to cleanup
     * @param keep - Number of events to keep
     */
    cleanupChannel(channel: string, keep: number): Promise<number>;
    /**
     * Get info about channel (XINFO equivalent)
     */
    info(channel: string): Promise<{
        length: number;
        firstId: string | null;
        lastId: string | null;
        firstTimestamp: number | null;
        lastTimestamp: number | null;
    }>;
    /**
     * Convert database rows to StoredEvents
     */
    private rowsToEvents;
}
//# sourceMappingURL=event-persistence.service.d.ts.map