# 008. Queued Messages Architecture

**Status:** ✅ Accepted
**Date:** 2025-01-XX

## Context

Users want to continue typing messages while the LLM is responding. These messages should queue up and auto-send when the current step completes. This enables uninterrupted workflow without waiting for AI responses.

## Decision

Server-managed per-session queue with event-driven multi-client sync.

## Architecture

### Design Principles

✅ **Server manages state** - Client is pure UI
✅ **Per-session queue** - Not global, isolated by session
✅ **Multi-client sync** - All clients see same queue via events
✅ **Restorable** - Queue persisted in DB, survives session switches
✅ **Event-driven** - Queue changes broadcast via StreamEvents
✅ **Client-server separation** - Client calls mutations, server manages queue

### Data Model

```typescript
// Database schema addition (sessions table)
export const sessions = sqliteTable("sessions", {
  // ... existing fields ...

  // NEW: Message queue (per-session)
  messageQueue: text("message_queue", { mode: "json" })
    .$type<QueuedMessage[]>()
    .default("[]"),
});

// Queued message structure
interface QueuedMessage {
  id: string;              // temp-queue-{timestamp}
  content: string;         // User message text
  attachments: FileAttachment[];  // File references
  enqueuedAt: number;      // Unix timestamp (ms)
}
```

### Server Components

#### 1. SessionRepository Extensions

```typescript
// packages/code-core/src/database/session-repository.ts

/**
 * Add message to session queue
 */
async enqueueMessage(
  sessionId: string,
  content: string,
  attachments: FileAttachment[] = []
): Promise<QueuedMessage>

/**
 * Get next message from queue (FIFO)
 * Returns null if queue is empty
 */
async dequeueMessage(sessionId: string): Promise<QueuedMessage | null>

/**
 * Get all queued messages for display
 */
async getQueuedMessages(sessionId: string): Promise<QueuedMessage[]>

/**
 * Clear all queued messages
 */
async clearQueue(sessionId: string): Promise<void>

/**
 * Remove specific queued message by ID
 */
async removeQueuedMessage(
  sessionId: string,
  messageId: string
): Promise<void>
```

#### 2. tRPC Mutation Endpoints

```typescript
// packages/code-server/src/routes/message.router.ts

export const messageRouter = router({
  // ... existing mutations ...

  // Queue management
  enqueueMessage: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      content: z.string(),
      attachments: z.array(fileAttachmentSchema).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.sessionRepository.enqueueMessage(
        input.sessionId,
        input.content,
        input.attachments
      );

      // Broadcast queue update to all clients
      ctx.eventBus.publish(`session:${input.sessionId}`, {
        type: "queue-message-added",
        sessionId: input.sessionId,
        message,
      });

      return message;
    }),

  dequeueMessage: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.sessionRepository.dequeueMessage(
        input.sessionId
      );

      if (message) {
        ctx.eventBus.publish(`session:${input.sessionId}`, {
          type: "queue-message-removed",
          sessionId: input.sessionId,
          messageId: message.id,
        });
      }

      return message;
    }),

  clearQueue: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.clearQueue(input.sessionId);

      ctx.eventBus.publish(`session:${input.sessionId}`, {
        type: "queue-cleared",
        sessionId: input.sessionId,
      });
    }),

  removeQueuedMessage: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      messageId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.removeQueuedMessage(
        input.sessionId,
        input.messageId
      );

      ctx.eventBus.publish(`session:${input.sessionId}`, {
        type: "queue-message-removed",
        sessionId: input.sessionId,
        messageId: input.messageId,
      });
    }),

  getQueuedMessages: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sessionRepository.getQueuedMessages(input.sessionId);
    }),
});
```

#### 3. Auto-Send on Step Completion

```typescript
// packages/code-server/src/services/streaming/stream-orchestrator.ts

// After step completes and finishReason !== 'tool-calls'
if (finishReason === 'stop' || finishReason === 'length') {
  // Check if there are queued messages
  const nextQueued = await sessionRepository.dequeueMessage(sessionId);

  if (nextQueued) {
    // Broadcast dequeue event
    observer.next({
      type: "queue-message-removed",
      sessionId,
      messageId: nextQueued.id,
    });

    // Auto-send the queued message
    // Parse content into parts
    const { parts } = parseUserInput(
      nextQueued.content,
      nextQueued.attachments
    );

    // Trigger new stream with queued message
    // This starts a new streaming cycle automatically
    await streamAIResponse({
      appContext,
      sessionRepository,
      messageRepository,
      aiConfig,
      sessionId,
      userMessageContent: parts,
      // No abortSignal - queued messages can't be aborted mid-flight
    });
  }
}
```

### Client Components

#### 1. StreamEvent Extensions

```typescript
// packages/code-core/src/types/streaming-events.types.ts

export type StreamEvent =
  | /* ... existing events ... */

  // Queue events
  | {
      type: "queue-message-added";
      sessionId: string;
      message: {
        id: string;
        content: string;
        attachments: FileAttachment[];
        enqueuedAt: number;
      };
    }
  | {
      type: "queue-message-removed";
      sessionId: string;
      messageId: string;
    }
  | {
      type: "queue-cleared";
      sessionId: string;
    };
```

#### 2. Client State Management

```typescript
// packages/code-client/src/stores/queueStore.ts

import { createStore } from "@nanostores/preact";

// Per-session queue state (synced from server events)
export const $sessionQueues = createStore<Record<string, QueuedMessage[]>>({});

// Get queue for current session
export function getSessionQueue(sessionId: string | null): QueuedMessage[] {
  if (!sessionId) return [];
  return $sessionQueues.get()[sessionId] || [];
}

// Event handlers (called from streamEventHandlers.ts)
export function handleQueueMessageAdded(event: QueueMessageAddedEvent) {
  const queues = $sessionQueues.get();
  const sessionQueue = queues[event.sessionId] || [];

  $sessionQueues.set({
    ...queues,
    [event.sessionId]: [...sessionQueue, event.message],
  });
}

export function handleQueueMessageRemoved(event: QueueMessageRemovedEvent) {
  const queues = $sessionQueues.get();
  const sessionQueue = queues[event.sessionId] || [];

  $sessionQueues.set({
    ...queues,
    [event.sessionId]: sessionQueue.filter(
      (m) => m.id !== event.messageId
    ),
  });
}

export function handleQueueCleared(event: QueueClearedEvent) {
  const queues = $sessionQueues.get();
  $sessionQueues.set({
    ...queues,
    [event.sessionId]: [],
  });
}
```

#### 3. UI Integration

```typescript
// packages/code/src/screens/chat/Chat.tsx

// Show queued messages count in UI
const queuedMessages = getSessionQueue(currentSessionId);

// When user submits while streaming:
const handleSubmit = async (value: string) => {
  if (isStreaming) {
    // Add to queue instead of immediate send
    await caller.message.enqueueMessage.mutate({
      sessionId: currentSessionId,
      content: value,
      attachments: pendingAttachments,
    });

    // Clear input and attachments
    setInput("");
    clearAttachments();

    // Event handler will update UI automatically
    return;
  }

  // Normal send when not streaming
  await sendUserMessageToAI(value, pendingAttachments);
};

// Display queued messages in UI
{queuedMessages.length > 0 && (
  <div className="queued-messages">
    <div className="queue-header">
      {queuedMessages.length} message(s) queued
    </div>
    {queuedMessages.map((msg) => (
      <div key={msg.id} className="queued-message">
        <span>{msg.content.substring(0, 50)}...</span>
        <button onClick={() => removeQueuedMessage(msg.id)}>×</button>
      </div>
    ))}
  </div>
)}
```

### Event Flow

#### Enqueue Flow
```
User types while streaming
  ↓
Client: handleSubmit detects isStreaming=true
  ↓
Client: Call caller.message.enqueueMessage.mutate()
  ↓
Server: Add to session.messageQueue in DB
  ↓
Server: Broadcast "queue-message-added" event
  ↓
All Clients: Receive event via useEventStream
  ↓
All Clients: Update local queue state
  ↓
All Clients: Display updated queue count/preview
```

#### Auto-Send Flow
```
Step completes with finishReason='stop'
  ↓
Server: Check session.messageQueue
  ↓
Server: Dequeue next message
  ↓
Server: Broadcast "queue-message-removed" event
  ↓
All Clients: Update queue state (remove from display)
  ↓
Server: Call streamAIResponse() with dequeued content
  ↓
Server: New streaming cycle begins
  ↓
All Clients: Receive stream events (user-message-created, etc.)
```

### Migration Path

1. **Database migration**: Add `messageQueue` column to sessions table
2. **Server implementation**: SessionRepository + tRPC mutations
3. **Event types**: Add queue events to StreamEvent union
4. **Client state**: Implement queueStore + event handlers
5. **UI integration**: Update Chat.tsx submit handler + display

## Rationale

- **Server-managed queue**: Single source of truth, no client-side conflicts
- **Per-session isolation**: Each conversation has independent queue
- **Event-driven sync**: All clients automatically synchronized
- **DB persistence**: Queue survives session switches and app restarts
- **Auto-send**: Seamless workflow without manual queue management

## Consequences

**Positive:**
- Uninterrupted user workflow during AI responses
- Multi-client synchronization (queue visible on all devices)
- Persistent across session switches
- Clear separation of concerns (server = state, client = UI)

**Negative:**
- Additional DB storage for queues (minimal - just message metadata)
- Complexity in auto-send flow (recursive streamAIResponse calls)
- No way to abort queued messages once auto-send starts (acceptable tradeoff)

## References

- Implementation: `packages/code-core/src/database/session-repository.ts`
- Events: `packages/code-core/src/types/streaming-events.types.ts`
- UI: `packages/code/src/screens/chat/Chat.tsx`
