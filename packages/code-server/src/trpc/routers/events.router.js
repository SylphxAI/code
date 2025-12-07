/**
 * Events Router
 * Generic event stream subscriptions with cursor-based replay
 *
 * Architecture:
 * - Channel-based routing (session-events, session:{id}, config:*, app:*)
 * - Exact channel matching subscriptions
 * - Cursor-based replay from database
 * - Real-time push via observables
 *
 * Similar to: Redis Streams XREAD
 */
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import { publicProcedure, router } from "../trpc.js";
/**
 * Event cursor schema for position-based reading
 */
const EventCursorSchema = z.object({
    timestamp: z.number(),
    sequence: z.number(),
});
/**
 * Stored event schema (returned to client)
 */
const _StoredEventSchema = z.object({
    id: z.string(),
    cursor: EventCursorSchema,
    channel: z.string(),
    type: z.string(),
    timestamp: z.number(),
    payload: z.any(),
});
export const eventsRouter = router({
    /**
     * Subscribe to events by channel
     *
     * Channel examples:
     * - 'session:abc123' - Specific session
     * - 'session-events' - All session CRUD events
     * - 'config:ai' - AI config changes
     *
     * Cursor-based replay:
     * - If fromCursor provided, replays events AFTER that cursor from database
     * - Then continues with real-time events
     *
     * Usage:
     * ```ts
     * trpc.events.subscribe.subscribe(
     *   { channel: 'session:abc123', fromCursor: { timestamp: 123, sequence: 0 } },
     *   { onData: (event) => handleEvent(event) }
     * )
     * ```
     */
    subscribe: publicProcedure
        .input(z.object({
        channel: z.string(), // Exact channel (e.g., 'session:abc123', 'session-events')
        fromCursor: EventCursorSchema.optional(), // Resume from cursor (undefined = only new events)
    }))
        .subscription(({ ctx, input }) => {
        return observable((emit) => {
            // Subscribe to event stream with exact channel
            const subscription = ctx.appContext.eventStream
                .subscribe(input.channel, input.fromCursor)
                .subscribe({
                next: (event) => emit.next(event),
                error: (err) => emit.error(err),
                complete: () => emit.complete(),
            });
            // Cleanup on unsubscribe
            return () => subscription.unsubscribe();
        });
    }),
    /**
     * Subscribe to specific session with auto-replay of latest N events
     *
     * Convenience wrapper around subscribe() for common use case.
     * Automatically replays last N events + continues with real-time.
     *
     * Usage:
     * ```ts
     * trpc.events.subscribeToSession.subscribe(
     *   { sessionId: 'abc123', replayLast: 10 },
     *   { onData: (event) => handleEvent(event) }
     * )
     * ```
     */
    subscribeToSession: publicProcedure
        .input(z.object({
        sessionId: z.string(),
        replayLast: z.number().min(0).max(100).default(0), // Replay last N events
    }))
        .subscription(({ ctx, input }) => {
        // Streaming events use session-stream:${id} channel
        // Session model updates use session:${id} channel (handled by Lens)
        const channel = `session-stream:${input.sessionId}`;
        return observable((emit) => {
            const subscription = ctx.appContext.eventStream
                .subscribeWithHistory(channel, input.replayLast)
                .subscribe({
                next: (event) => emit.next(event),
                error: (err) => emit.error(err),
                complete: () => emit.complete(),
            });
            return () => subscription.unsubscribe();
        });
    }),
    /**
     * Subscribe to all session events (session list sync)
     *
     * Subscribes to session-events channel for multi-client session list sync.
     * Receives events: session-created, session-deleted, session-title-updated, etc.
     *
     * Usage:
     * ```ts
     * trpc.events.subscribeToAllSessions.subscribe(
     *   { replayLast: 20 },
     *   {
     *     onData: (event) => {
     *       if (event.payload.type === 'session-created') {
     *         // Add session to list
     *       } else if (event.payload.type === 'session-deleted') {
     *         // Remove session from list
     *       }
     *     }
     *   }
     * )
     * ```
     */
    subscribeToAllSessions: publicProcedure
        .input(z.object({
        replayLast: z.number().min(0).max(100).default(20), // Replay last N events
    }))
        .subscription(({ ctx, input }) => {
        const channel = "session-events";
        return observable((emit) => {
            const subscription = ctx.appContext.eventStream
                .subscribeWithHistory(channel, input.replayLast)
                .subscribe({
                next: (event) => emit.next(event),
                error: (err) => emit.error(err),
                complete: () => emit.complete(),
            });
            return () => subscription.unsubscribe();
        });
    }),
    /**
     * Get channel info (for debugging)
     *
     * Returns:
     * - inMemoryCount: Number of active subscribers
     * - persistedCount: Total events in database
     * - firstId/lastId: Range of event IDs
     */
    getChannelInfo: publicProcedure
        .input(z.object({ channel: z.string() }))
        .query(async ({ ctx, input }) => {
        return await ctx.appContext.eventStream.info(input.channel);
    }),
    /**
     * Cleanup old events from a channel
     * Keeps last N events, deletes older ones
     *
     * Usage:
     * ```ts
     * await trpc.events.cleanupChannel.mutate({
     *   channel: 'session:abc123',
     *   keepLast: 100
     * })
     * ```
     */
    cleanupChannel: publicProcedure
        .input(z.object({
        channel: z.string(),
        keepLast: z.number().min(1).max(1000).default(100),
    }))
        .mutation(async ({ ctx, input }) => {
        await ctx.appContext.eventStream.cleanupChannel(input.channel, input.keepLast);
        return { success: true };
    }),
});
//# sourceMappingURL=events.router.js.map