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
import type { StoredEvent } from "../../services/event-persistence.service.js";
export declare const eventsRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
    subscribe: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
        input: {
            channel: string;
            fromCursor?: {
                timestamp: number;
                sequence: number;
            } | undefined;
        };
        output: StoredEvent<any>;
        meta: object;
    }>;
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
    subscribeToSession: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
        input: {
            sessionId: string;
            replayLast?: number | undefined;
        };
        output: StoredEvent<any>;
        meta: object;
    }>;
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
    subscribeToAllSessions: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
        input: {
            replayLast?: number | undefined;
        };
        output: StoredEvent<any>;
        meta: object;
    }>;
    /**
     * Get channel info (for debugging)
     *
     * Returns:
     * - inMemoryCount: Number of active subscribers
     * - persistedCount: Total events in database
     * - firstId/lastId: Range of event IDs
     */
    getChannelInfo: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            channel: string;
        };
        output: {
            inMemoryCount: number;
            persistedCount?: number;
            firstId?: string | null;
            lastId?: string | null;
        };
        meta: object;
    }>;
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
    cleanupChannel: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            channel: string;
            keepLast?: number | undefined;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
}>>;
/**
 * Export types for client
 */
export type EventsRouter = typeof eventsRouter;
//# sourceMappingURL=events.router.d.ts.map