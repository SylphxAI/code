# Lens Event Design - Model-Level Updates

**Date:** 2025-01-23
**Status:** 🚧 Design Phase

## Problem

Current architecture mixes granularities:
- ✅ Field-level events: `text-delta`, `tool-call`, `reasoning-delta` (streaming content)
- ✅ Model-level events: `session-updated` (title, status, metadata)
- ❌ **Gap**: No model-level events for message/part updates

When `upsertPart()` writes to database:
- Parts saved to DB ✅
- Field-level events published (`text-delta`) ✅
- **Model-level events NOT published** ❌

Result: Lens subscription can't receive message updates declaratively.

## Solution: message-updated Event

### Event Schema

```typescript
{
  type: 'message-updated',
  sessionId: string,
  messageId: string,
  message: {
    id: string,
    role: 'assistant',
    status: 'active' | 'completed' | 'error',
    steps: [
      {
        id: string,
        stepIndex: number,
        status: 'active' | 'completed',
        parts: [
          {
            type: 'text',
            content: string,  // Incremental - grows during streaming
            status: 'active' | 'completed'
          },
          {
            type: 'tool',
            name: string,
            input: unknown,
            result: unknown,
            status: 'active' | 'completed',
            duration: number
          }
          // ...
        ]
      }
    ]
  }
}
```

### Publishing Strategy

**After each `upsertPart()`:**

```typescript
// In stream-orchestrator.ts
const persistence = {
  messageRepository,
  getStepId: () => stepIdMap.get(currentStepNumber) || null,

  // NEW: Publish message-updated event after upsert
  async publishUpdate(messageId: string) {
    const message = await messageRepository.getById(messageId);
    await appContext.eventStream.publish(`session:${sessionId}`, {
      type: 'message-updated',
      sessionId,
      messageId,
      message
    });
  }
};
```

**In ai-orchestrator.ts:**

```typescript
case "text-delta": {
  if (state.currentTextPartIndex !== null) {
    const part = state.currentStepParts[state.currentTextPartIndex];
    if (part && part.type === "text") {
      part.content += chunk.text;

      // LENS: Write to database + publish event
      if (persistence) {
        const stepId = persistence.getStepId();
        if (stepId) {
          await persistence.messageRepository.upsertPart(
            stepId,
            state.currentTextPartIndex,
            part,
          );

          // NEW: Publish message-updated event
          await persistence.publishUpdate(messageId);
        }
      }
    }

    // OLD: Field-level callback (to be removed)
    callbacks.onTextDelta?.(chunk.text);
  }
  break;
}
```

### Subscription Handling

**In session.getById.subscribe() (api.ts):**

```typescript
subscribe: ({ input, ctx }): Observable<Session | null> => {
  const { sessionId } = input;
  const { Observable } = require("rxjs");
  const { map, scan, startWith } = require("rxjs/operators");

  return ctx.appContext.eventStream
    .subscribe(`session:${sessionId}`)
    .pipe(
      // Accumulate state from events
      scan((session: Session | null, event: any) => {
        if (!session) return null;

        switch (event.type) {
          case 'session-updated':
            // Merge session-level updates (title, status, etc.)
            return { ...session, ...event.session };

          case 'message-updated':
            // Update specific message
            return {
              ...session,
              messages: session.messages.map(m =>
                m.id === event.messageId ? event.message : m
              )
            };

          default:
            return session;
        }
      }, null as Session | null),

      // Start with initial query
      startWith(null)
    );
}
```

## Performance Considerations

### Concern: Publishing Full Message on Every Delta

**Problem**:
- Text streaming: ~50 deltas/sec
- Each delta triggers `message-updated` event
- Event contains full message with all parts
- High bandwidth usage

**Solution Options**:

#### Option A: Debounce Publishing (Recommended)
```typescript
// Publish every 10 deltas OR when part completes
let deltaSinceLastPublish = 0;
const PUBLISH_INTERVAL = 10;

case "text-delta": {
  await upsertPart(...);
  deltaSinceLastPublish++;

  if (deltaSinceLastPublish >= PUBLISH_INTERVAL) {
    await publishUpdate(messageId);
    deltaSinceLastPublish = 0;
  }
}

case "text-end": {
  await upsertPart(...);
  await publishUpdate(messageId); // Always publish on completion
  deltaSinceLastPublish = 0;
}
```

**Benefit**: 50 events/sec → 5 events/sec (10x reduction)

#### Option B: Delta Events Within Message Context
```typescript
{
  type: 'message-part-updated',
  sessionId,
  messageId,
  stepId,
  partIndex,
  delta: {
    content: 'new text',  // Only new content
    status: 'active'       // Only if changed
  }
}
```

**Benefit**: Minimal bandwidth, but requires client-side state merging

#### Option C: Lens Delta Strategy (Future)
Let Lens framework compute deltas automatically:
- Client subscribes with `select: { messages: { steps: { parts: true } } }`
- Lens detects changes and computes content delta
- Only diff transmitted

**Benefit**: Framework-level optimization, no manual work

### Recommendation

**Phase 1**: Option A (Debounce) - Simple, effective, keeps events model-level
**Phase 2**: Measure bandwidth and latency
**Phase 3**: If needed, implement Option C in Lens framework

## Migration Path

### Phase 1: Add message-updated Events (Keep Field-Level)
- ✅ Parts written to DB
- ✅ Field-level events published (`text-delta`)
- 🆕 Model-level events published (`message-updated`)
- Both event types coexist

### Phase 2: Update Client to Use Model Events
- Subscribe to `session.getById` with messages selection
- Remove `useEventStream` dependency
- UI updates from model (already does this!)

### Phase 3: Remove Field-Level Events
- Stop publishing `text-delta`, `tool-call`, etc.
- Only `message-updated` events
- Verify UI still works

### Phase 4: Optimize (Optional)
- Add debouncing if needed
- Implement Lens delta strategy
- Measure performance improvements

## Benefits

### ✅ Architectural Consistency
- All events at model level
- No granularity mixing
- Clean abstraction

### ✅ Frontend-Driven
```tsx
// Client just declares what it wants
const session = useLensQuery(lensClient.session.getById, { sessionId }, {
  select: {
    messages: {
      select: {
        steps: { select: { parts: true } }
      }
    }
  }
});

// No event handlers!
<MessageList messages={session.messages} />
```

### ✅ Type Safety
- Full TypeScript inference
- No custom event types
- IDE autocomplete works

### ✅ Optimistic Updates
- Single source of truth (database)
- Events reflect database state
- No synchronization bugs

### ✅ Bandwidth Optimization (Future)
- Lens computes deltas automatically
- Client receives only changes
- 57%-99% savings depending on strategy

## Implementation Checklist

- [ ] Add `publishUpdate()` to PersistenceContext
- [ ] Call `publishUpdate()` after each `upsertPart()`
- [ ] Update `session.getById.subscribe()` to handle `message-updated`
- [ ] Add debouncing (10 deltas interval)
- [ ] Test streaming with model events
- [ ] Verify UI updates reactively
- [ ] Remove field-level events
- [ ] Update documentation

## Success Criteria

- ✅ Parts written to database during streaming
- ✅ `message-updated` events published
- ✅ Lens subscription receives events
- ✅ Client UI updates from model
- ✅ No manual event handlers needed
- ✅ Performance acceptable (<100ms latency)
- ✅ Bandwidth reasonable (<1MB/min for typical chat)

## References

- `packages/code-server/src/services/streaming/ai-orchestrator.ts` - Stream processing
- `packages/code-server/src/services/streaming/stream-orchestrator.ts` - Orchestration
- `packages/code-api/src/api.ts` - Lens API definitions
- `.sylphx/lens-streaming-architecture.md` - Overall architecture
- `.sylphx/streaming-migration-plan.md` - Migration timeline
