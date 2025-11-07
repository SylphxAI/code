/**
 * App Event Stream Service
 * In-memory event stream with optional persistence
 * Similar to Redis Streams with pub/sub pattern matching
 *
 * Features:
 * - Channel-based routing (session:*, config:*, app:*)
 * - Pattern matching subscriptions
 * - Cursor-based replay from database
 * - Auto-cleanup of old events
 * - In-memory + optional persistence
 */

import { ReplaySubject, merge, Observable } from 'rxjs'
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
   * Subscribe to channel with pattern matching and optional cursor replay
   *
   * @param pattern - Channel pattern ('session:*', 'config:*', '*', etc.)
   * @param fromCursor - Start reading AFTER this cursor (undefined = only new events)
   * @returns Observable of events
   */
  subscribe(
    pattern: string,
    fromCursor?: EventCursor
  ): Observable<StoredEvent> {
    return new Observable((observer) => {
      // 1. Replay from persistence if cursor provided
      if (this.persistence && fromCursor) {
        this.replayFromPersistence(pattern, fromCursor, observer)
          .catch(err => {
            console.error('[AppEventStream] Replay error:', err)
          })
      }

      // 2. Subscribe to in-memory streams
      const matchingSubjects = this.getMatchingSubjects(pattern)

      if (matchingSubjects.length === 0) {
        // Create empty subject for future events on this pattern
        // This ensures late subscribers can still receive new events
        const placeholder = this.getOrCreateSubject(pattern)
        matchingSubjects.push(placeholder)
      }

      const subscription = merge(...matchingSubjects).subscribe(observer)

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
   */
  private getOrCreateSubject(channel: string): ReplaySubject<StoredEvent> {
    if (!this.subjects.has(channel)) {
      const bufferSize = this.options.bufferSize ?? 100
      const bufferTime = this.options.bufferTime ?? 5 * 60 * 1000

      this.subjects.set(
        channel,
        new ReplaySubject<StoredEvent>(bufferSize, bufferTime)
      )
    }

    return this.subjects.get(channel)!
  }

  /**
   * Get all subjects matching pattern
   */
  private getMatchingSubjects(pattern: string): ReplaySubject<StoredEvent>[] {
    return Array.from(this.subjects.entries())
      .filter(([channel]) => this.matchPattern(channel, pattern))
      .map(([_, subject]) => subject)
  }

  /**
   * Pattern matching (supports wildcards)
   * Examples:
   *   'session:*' matches 'session:abc', 'session:xyz'
   *   '*' matches everything
   *   'session:abc' matches only 'session:abc'
   */
  private matchPattern(channel: string, pattern: string): boolean {
    if (pattern === '*') return true
    if (!pattern.includes('*')) return channel === pattern

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return regex.test(channel)
  }

  /**
   * Replay events from persistence
   */
  private async replayFromPersistence(
    pattern: string,
    fromCursor: EventCursor,
    observer: any
  ): Promise<void> {
    if (!this.persistence) return

    // Get all channels matching pattern
    // Note: This is a limitation - we can't efficiently query by pattern in SQL
    // So we get all channels and filter
    // For production, consider storing pattern subscriptions or using better indexing
    const channels = Array.from(this.subjects.keys()).filter(ch =>
      this.matchPattern(ch, pattern)
    )

    // If no existing channels, we can't replay
    // Events will be delivered as they arrive
    if (channels.length === 0) return

    // Read events from each matching channel
    for (const channel of channels) {
      const events = await this.persistence.readFrom(channel, fromCursor, 100)
      events.forEach(event => observer.next(event))
    }
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
