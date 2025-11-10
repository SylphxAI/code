/**
 * App Event Stream Service
 * In-memory event stream with optional persistence
 * Similar to Redis Streams with pub/sub
 *
 * Features:
 * - Channel-based routing (session-events, session:{id}, config:*, app:*)
 * - Exact channel subscriptions
 * - Cursor-based replay from database
 * - Auto-cleanup of old events
 * - In-memory + optional persistence
 */

import { ReplaySubject, Observable } from 'rxjs'
import type { EventPersistence, EventCursor, StoredEvent } from './event-persistence.service.js'

/**
 * App Event Stream
 * Provides pub/sub with history and pattern matching
 */
export class AppEventStream {
  // Per-channel subjects (in-memory buffers)
  private subjects = new Map<string, ReplaySubject<StoredEvent>>()

  // Sequence counters per timestamp
  private sequenceCounters = new Map<number, number>()

  // Event counter for unique IDs
  private eventCounter = 0

  // Cleanup interval
  private cleanupInterval?: NodeJS.Timeout

  constructor(
    private persistence?: EventPersistence,
    private options: {
      bufferSize?: number      // Number of events to keep in memory (default: 100)
      bufferTime?: number      // Time to keep events in memory in ms (default: 5 min)
      cleanupInterval?: number // Cleanup interval in ms (default: 60 sec)
    } = {}
  ) {
    const {
      bufferSize = 100,
      bufferTime = 5 * 60 * 1000,  // 5 minutes
      cleanupInterval = 60 * 1000,  // 60 seconds
    } = options

    // Start cleanup interval
    if (cleanupInterval > 0) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup().catch(err => {
          console.error('[AppEventStream] Cleanup error:', err)
        })
      }, cleanupInterval)
    }
  }

  /**
   * Publish event to channel (XADD equivalent)
   *
   * @param channel - Channel to publish to (e.g., 'session:abc', 'config:ai')
   * @param event - Event payload
   * @returns Event ID and cursor
   */
  async publish<T = any>(
    channel: string,
    event: { type: string; [key: string]: any }
  ): Promise<{ id: string; cursor: EventCursor }> {
    // Generate cursor-based ID
    const { id, cursor } = this.generateId()

    // Create stored event
    const storedEvent: StoredEvent<T> = {
      id,
      cursor,
      channel,
      type: event.type,
      timestamp: cursor.timestamp,
      payload: event,
    }

    // 1. Publish to in-memory stream (instant, non-blocking)
    const subject = this.getOrCreateSubject(channel)
    subject.next(storedEvent)

    // 2. Persist to database (async, non-blocking)
    if (this.persistence) {
      this.persistence.save(channel, storedEvent).catch(err => {
        console.error('[AppEventStream] Persistence error:', err)
      })
    }

    return { id, cursor }
  }

  /**
   * Subscribe to channel with optional cursor replay
   *
   * @param channel - Exact channel (e.g., 'session:abc123', 'session-events')
   * @param fromCursor - Start reading AFTER this cursor (undefined = only new events)
   * @returns Observable of events
   */
  subscribe(
    channel: string,
    fromCursor?: EventCursor
  ): Observable<StoredEvent> {
    return new Observable((observer) => {
      // 1. Replay from persistence if cursor provided
      if (this.persistence && fromCursor) {
        this.persistence.readFrom(channel, fromCursor, 100)
          .then(events => {
            events.forEach(event => observer.next(event))
          })
          .catch(err => {
            console.error('[AppEventStream] Replay error:', err)
          })
      }

      // 2. Subscribe to in-memory stream
      const subject = this.getOrCreateSubject(channel)
      const subscription = subject.subscribe(observer)

      // Cleanup
      return () => subscription.unsubscribe()
    })
  }

  /**
   * Subscribe to latest N events + new events
   *
   * @param channel - Channel to subscribe to
   * @param lastN - Number of latest events to replay (default: 0)
   */
  subscribeWithHistory(channel: string, lastN: number = 0): Observable<StoredEvent> {
    return new Observable((observer) => {
      // 1. Replay latest N from persistence
      if (this.persistence && lastN > 0) {
        this.persistence.readLatest(channel, lastN)
          .then(events => {
            events.forEach(event => observer.next(event))
          })
          .catch(err => {
            console.error('[AppEventStream] History replay error:', err)
          })
      }

      // 2. Subscribe to new events
      const subject = this.getOrCreateSubject(channel)
      const subscription = subject.subscribe(observer)

      return () => subscription.unsubscribe()
    })
  }

  /**
   * Get channel info (XINFO equivalent)
   */
  async info(channel: string): Promise<{
    inMemoryCount: number
    persistedCount?: number
    firstId?: string | null
    lastId?: string | null
  }> {
    const subject = this.subjects.get(channel)
    const inMemoryCount = subject?.observers.length ?? 0

    let persistedInfo
    if (this.persistence) {
      persistedInfo = await this.persistence.info(channel)
    }

    return {
      inMemoryCount,
      persistedCount: persistedInfo?.length,
      firstId: persistedInfo?.firstId ?? undefined,
      lastId: persistedInfo?.lastId ?? undefined,
    }
  }

  /**
   * Cleanup old events from memory and persistence
   */
  async cleanup(): Promise<void> {
    const now = Date.now()
    const cutoff = now - (this.options.bufferTime ?? 5 * 60 * 1000)

    // Cleanup persistence
    if (this.persistence) {
      await this.persistence.cleanup(cutoff)
    }

    // Cleanup sequence counters
    for (const [timestamp] of this.sequenceCounters) {
      if (timestamp < cutoff) {
        this.sequenceCounters.delete(timestamp)
      }
    }

    // Note: ReplaySubject auto-cleanup based on windowTime
  }

  /**
   * Cleanup channel (keep last N events)
   */
  async cleanupChannel(channel: string, keep: number): Promise<void> {
    if (this.persistence) {
      await this.persistence.cleanupChannel(channel, keep)
    }
  }

  /**
   * Destroy stream (cleanup resources)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    // Complete all subjects
    for (const subject of this.subjects.values()) {
      subject.complete()
    }

    this.subjects.clear()
  }

  // ========== Private Methods ==========

  /**
   * Generate cursor-based ID (similar to Redis Stream IDs)
   * Format: evt_<timestamp>_<sequence>
   */
  private generateId(): { id: string; cursor: EventCursor } {
    const timestamp = Date.now()

    // Get or increment sequence for this timestamp
    const sequence = this.sequenceCounters.get(timestamp) ?? 0
    this.sequenceCounters.set(timestamp, sequence + 1)

    return {
      id: `evt_${timestamp}_${sequence}`,
      cursor: { timestamp, sequence },
    }
  }

  /**
   * Get or create ReplaySubject for channel
   *
   * IMPORTANT: Uses small bufferSize (10) to handle immediate race conditions.
   * - Prevents lost events when client subscribes right after mutation
   * - Small enough to avoid massive auto-replay in tests
   * - Persistence layer handles larger replay via subscribeWithHistory()
   */
  private getOrCreateSubject(channel: string): ReplaySubject<StoredEvent> {
    if (!this.subjects.has(channel)) {
      // Small buffer to handle race conditions (mutation → subscribe delay)
      // Persistence handles larger replay (50+ events)
      const bufferSize = 10
      const bufferTime = this.options.bufferTime ?? 5 * 60 * 1000

      this.subjects.set(
        channel,
        new ReplaySubject<StoredEvent>(bufferSize, bufferTime)
      )
    }

    return this.subjects.get(channel)!
  }

}

/**
 * Global singleton instance
 * Initialized by server with persistence
 */
export let appEventStream: AppEventStream

/**
 * Initialize global event stream
 * Called by server on startup
 */
export function initializeEventStream(persistence?: EventPersistence): AppEventStream {
  appEventStream = new AppEventStream(persistence, {
    bufferSize: 100,
    bufferTime: 5 * 60 * 1000,  // 5 minutes
    cleanupInterval: 60 * 1000,  // 60 seconds
  })

  return appEventStream
}
