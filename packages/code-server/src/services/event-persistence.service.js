/**
 * Event Persistence Service
 * Stores events in database with cursor-based replay support
 * Similar to Redis Streams (XADD/XREAD/XREVRANGE)
 */
import { events } from "@sylphx/code-core";
import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";
/**
 * Retry helper for handling SQLITE_BUSY errors
 * Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms
 */
async function retryOnBusy(operation, maxRetries = 5) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            // Check for SQLITE_BUSY in error or nested cause
            const isBusy = error.message?.includes("SQLITE_BUSY") ||
                error.code === "SQLITE_BUSY" ||
                error.cause?.code === "SQLITE_BUSY" ||
                error.cause?.message?.includes("SQLITE_BUSY");
            if (isBusy) {
                const delay = 50 * 2 ** attempt;
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
            }
            // Other errors: throw immediately
            throw error;
        }
    }
    // Max retries exceeded
    throw lastError;
}
/**
 * Event Persistence using Drizzle ORM
 * Database-agnostic (works with SQLite and PostgreSQL)
 */
export class EventPersistence {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Save event to database (XADD equivalent)
     * Retries on SQLITE_BUSY errors with exponential backoff
     */
    async save(_channel, event) {
        await retryOnBusy(async () => {
            await this.db.insert(events).values({
                id: event.id,
                channel: event.channel,
                type: event.type,
                timestamp: event.cursor.timestamp,
                sequence: event.cursor.sequence,
                payload: event.payload,
                createdAt: Date.now(),
            });
        });
    }
    /**
     * Read events from cursor (XREAD equivalent)
     *
     * @param channel - Channel to read from
     * @param cursor - Start reading AFTER this cursor (undefined = from beginning)
     * @param limit - Max events to return
     */
    async readFrom(channel, cursor, limit = 100) {
        let query = this.db.select().from(events).where(eq(events.channel, channel));
        if (cursor) {
            // Read events AFTER cursor
            // WHERE channel = ? AND (timestamp > ? OR (timestamp = ? AND sequence > ?))
            query = query.where(and(eq(events.channel, channel), or(gt(events.timestamp, cursor.timestamp), and(eq(events.timestamp, cursor.timestamp), gt(events.sequence, cursor.sequence)))));
        }
        const rows = await query.orderBy(asc(events.timestamp), asc(events.sequence)).limit(limit);
        return this.rowsToEvents(rows);
    }
    /**
     * Read latest N events (XREVRANGE equivalent)
     *
     * @param channel - Channel to read from
     * @param limit - Number of events to return
     */
    async readLatest(channel, limit) {
        const rows = await this.db
            .select()
            .from(events)
            .where(eq(events.channel, channel))
            .orderBy(desc(events.timestamp), desc(events.sequence))
            .limit(limit);
        // Reverse to get chronological order
        return this.rowsToEvents(rows.reverse());
    }
    /**
     * Read events in range (XRANGE equivalent)
     *
     * @param channel - Channel to read from
     * @param start - Start cursor (inclusive)
     * @param end - End cursor (inclusive)
     * @param limit - Max events to return
     */
    async readRange(channel, start, end, limit = 100) {
        const rows = await this.db
            .select()
            .from(events)
            .where(and(eq(events.channel, channel), 
        // timestamp >= start.timestamp
        or(gt(events.timestamp, start.timestamp), and(eq(events.timestamp, start.timestamp), gt(events.sequence, start.sequence - 1))), 
        // timestamp <= end.timestamp
        or(lt(events.timestamp, end.timestamp), and(eq(events.timestamp, end.timestamp), lt(events.sequence, end.sequence + 1)))))
            .orderBy(asc(events.timestamp), asc(events.sequence))
            .limit(limit);
        return this.rowsToEvents(rows);
    }
    /**
     * Get event count for channel
     */
    async count(channel) {
        const result = await this.db
            .select({ count: events.id })
            .from(events)
            .where(eq(events.channel, channel));
        return result.length;
    }
    /**
     * Cleanup old events (XTRIM equivalent)
     *
     * @param beforeTimestamp - Delete events before this timestamp
     */
    async cleanup(beforeTimestamp) {
        const result = await this.db.delete(events).where(lt(events.timestamp, beforeTimestamp));
        return result.changes;
    }
    /**
     * Cleanup events by channel (keep last N)
     *
     * @param channel - Channel to cleanup
     * @param keep - Number of events to keep
     */
    async cleanupChannel(channel, keep) {
        // Get the timestamp of the Nth newest event
        const rows = await this.db
            .select()
            .from(events)
            .where(eq(events.channel, channel))
            .orderBy(desc(events.timestamp), desc(events.sequence))
            .limit(keep + 1)
            .offset(keep);
        if (rows.length === 0) {
            return 0;
        }
        const cutoffEvent = rows[0];
        // Delete events older than cutoff
        const result = await this.db
            .delete(events)
            .where(and(eq(events.channel, channel), or(lt(events.timestamp, cutoffEvent.timestamp), and(eq(events.timestamp, cutoffEvent.timestamp), lt(events.sequence, cutoffEvent.sequence)))));
        return result.changes;
    }
    /**
     * Get info about channel (XINFO equivalent)
     */
    async info(channel) {
        const allRows = await this.db
            .select()
            .from(events)
            .where(eq(events.channel, channel))
            .orderBy(asc(events.timestamp), asc(events.sequence));
        if (allRows.length === 0) {
            return {
                length: 0,
                firstId: null,
                lastId: null,
                firstTimestamp: null,
                lastTimestamp: null,
            };
        }
        const first = allRows[0];
        const last = allRows[allRows.length - 1];
        return {
            length: allRows.length,
            firstId: first.id,
            lastId: last.id,
            firstTimestamp: first.timestamp,
            lastTimestamp: last.timestamp,
        };
    }
    /**
     * Convert database rows to StoredEvents
     */
    rowsToEvents(rows) {
        return rows.map((row) => ({
            id: row.id,
            cursor: {
                timestamp: row.timestamp,
                sequence: row.sequence,
            },
            channel: row.channel,
            type: row.type,
            timestamp: row.timestamp,
            payload: row.payload,
        }));
    }
}
//# sourceMappingURL=event-persistence.service.js.map