# Lens Streaming Architecture

**Status:** 🚧 In Progress
**Created:** 2025-01-23
**Updated:** 2025-01-23

## Problem Statement

### Original tRPC Issues
- **Inconsistent granularity**: Mixed model-level (`session-updated`) and field-level events (`session-status-updated`, `session-title-start/delta/end`)
- **Manual event management**: Every field change requires custom event emission
- **No bandwidth optimization**: All events send full payloads
- **Complex optimistic updates**: Hard to coordinate across different event types
- **TypeScript types**: Lost type safety with custom event handling

### Why Lens?
Lens was designed to solve these exact problems:
- **Frontend-driven**: Client uses `select` to specify needed fields
- **Model-level consistency**: Always operate on resources, not custom events
- **Auto-optimization**: Backend chooses best strategy (delta/patch/value) per field
- **Built-in optimistic updates**: Framework-level support
- **TypeScript-first**: Full type inference like tRPC

## Current Problem

After tRPC → Lens migration, we still have the old problem:

### Two Competing Subscriptions
```typescript
// 1. Session model subscription (should handle ALL session updates)
lensClient.session.getById.subscribe()

// 2. Event stream subscription (should only handle transient streaming)
lensClient.events.subscribeToSession.subscribe()
```

Both subscribe to `session:${sessionId}` channel, causing:
- `useLensSessionSubscription` receives `session-updated` events first
- Empty callback discards them
- `useEventStream` never receives events for optimistic reconciliation
- Result: Timeout on optimistic updates

### Root Cause
We're still mixing paradigms:
- **Persistent model data** (session title, status, tokens) → Should use resource subscription
- **Transient streaming data** (text-delta chunks, tool calls) → Should use event stream

But we emit `session-updated` as an event instead of updating the model!

## Correct Lens Architecture

### Principle: Everything is a Model

```
Session Model
  ├─ id, title, status, totalTokens, ...
  └─ messages: Message[]

Message Model
  ├─ id, role, status, ...
  └─ steps: MessageStep[]

MessageStep Model
  ├─ id, stepIndex, status, ...
  └─ parts: MessagePart[]

MessagePart (Union Type)
  ├─ { type: "text", content: string, status: "active" | "completed" | ... }
  ├─ { type: "reasoning", content: string, status: ..., duration?: number }
  ├─ { type: "tool", name: string, input: unknown, result: unknown, status: ... }
  └─ ...
```

### No Custom Events Needed!

All streaming data becomes model updates:
- `text-delta` → Update `MessagePart.content` (text grows incrementally)
- `tool-call` → Add new `MessagePart` with type="tool"
- `tool-result` → Update existing tool part with `result` field
- `session-status-updated` → Update `Session.status`
- `session-title-updated` → Update `Session.title`

Lens handles ALL streaming via delta/patch strategies!

## Implementation Design

### Database (Already Ready!)

```sql
-- step_parts table (already exists)
CREATE TABLE step_parts (
  id TEXT PRIMARY KEY,
  step_id TEXT REFERENCES message_steps(id),
  ordering INTEGER NOT NULL,      -- Position within step
  type TEXT NOT NULL,              -- 'text' | 'reasoning' | 'tool' | 'error'
  content TEXT NOT NULL            -- JSON of MessagePart
)
```

The `content` JSON includes:
- `status`: "active" | "completed" | "error" | "abort"
- `content`: Text that grows during streaming
- All other fields (toolName, input, result, duration, etc.)

### Server Side

#### Current (Wrong)
```typescript
// ❌ Manual event emission
for await (const chunk of aiStream) {
  if (chunk.type === 'text-delta') {
    observer.next({ type: 'text-delta', text: chunk.text });
    eventStream.publish('session:xxx', { type: 'text-delta', ... });
  }
}
```

#### Correct (Lens Way)
```typescript
// ✅ Write to database, Lens handles streaming
for await (const chunk of aiStream) {
  if (chunk.type === 'text-delta') {
    // Update database
    const currentContent = await getCurrentPartContent(stepId, partIndex);
    await messageRepository.upsertPart(stepId, partIndex, {
      type: 'text',
      content: currentContent + chunk.text,
      status: 'active'
    });
    // Lens automatically:
    // 1. Detects database change
    // 2. Computes delta (only new text)
    // 3. Streams to subscribers
  }

  if (chunk.type === 'tool-call') {
    // Add new part
    await messageRepository.upsertPart(stepId, nextPartIndex, {
      type: 'tool',
      toolId: chunk.toolId,
      name: chunk.name,
      input: chunk.input,
      status: 'active'
    });
    // Lens streams new part to subscribers
  }
}
```

### Repository Layer

#### New Method: `upsertPart()`
```typescript
/**
 * Upsert a single part in a step (for incremental streaming updates)
 *
 * - If part exists at ordering: UPDATE content
 * - If part doesn't exist: INSERT new part
 *
 * Example:
 * 1. upsertPart(stepId, 0, { type: 'text', content: 'Hello', status: 'active' })
 * 2. upsertPart(stepId, 0, { type: 'text', content: 'Hello wo', status: 'active' })
 * 3. upsertPart(stepId, 0, { type: 'text', content: 'Hello world', status: 'completed' })
 */
async upsertPart(stepId: string, ordering: number, part: MessagePart): Promise<string>
```

**Status:** ✅ Implemented

### Lens Layer

#### Resource Definition
```typescript
// Lens automatically watches step_parts table
export const message = lens
  .resource('message')
  .query(async ({ messageId }) => {
    // Load message with steps and parts
    return await messageRepository.getById(messageId);
  })
  .subscribe(({ messageId }) => {
    // Lens watches database changes
    // Returns observable of message updates
  });
```

#### Client Subscription
```typescript
// ✅ Single subscription for everything
lensClient.message.getById.subscribe(
  { messageId },
  {
    select: {
      id: true,
      role: true,
      status: true,      // Patch-updated
      steps: {
        select: {
          id: true,
          parts: {         // Delta-streamed as they grow!
            select: {
              type: true,
              content: true,  // Incremental text streaming
              status: true,
              // ... other fields
            }
          }
        }
      }
    }
  }
)
```

### Client Side

#### UI Component (Reactive)
```tsx
function MessageView({ messageId }: { messageId: string }) {
  // Subscribe to message model
  const message = useLensQuery(
    lensClient.message.getById,
    { messageId },
    {
      select: {
        steps: {
          select: {
            parts: true
          }
        }
      }
    }
  );

  // Automatically re-renders as parts stream in!
  return (
    <div>
      {message.steps.map(step => (
        <div key={step.id}>
          {step.parts.map(part => (
            <PartView key={part.id} part={part} />
          ))}
        </div>
      ))}
    </div>
  );
}

function PartView({ part }: { part: MessagePart }) {
  switch (part.type) {
    case 'text':
      return <TextPart content={part.content} status={part.status} />;
    case 'tool':
      return <ToolPart name={part.name} input={part.input} result={part.result} />;
    // ...
  }
}
```

No event handlers needed! UI updates reactively as model changes.

## Benefits

### 1. Single Source of Truth
- Database is the authority
- All clients see same data
- No synchronization issues

### 2. Automatic Persistence
- Every update saved to database
- Can resume streaming after disconnect
- Full history preserved

### 3. Lens Auto-Optimization
- **Text parts**: Delta strategy (only send new characters)
- **Object fields**: Patch strategy (only send changed fields)
- **Status changes**: Value strategy (simple replacement)
- **Bandwidth savings**: 57%-99% depending on field type

### 4. Built-in Optimistic Updates
- Client predicts changes immediately
- Lens reconciles when server confirms
- No manual coordination needed

### 5. Multi-Client Sync
- All clients subscribe to same model
- Changes propagate automatically
- Real-time collaboration ready

### 6. Type Safety
- Full TypeScript inference
- No custom event types
- IDE autocomplete works

### 7. Simplified Code
- No event handlers
- No event emission logic
- No subscription adapters
- Just: Read model → Render UI

## Migration Plan

### Phase 1: Foundation (✅ Complete)
- [x] Add `messageRepository.upsertPart()` method
- [ ] Document architecture (this file)

### Phase 2: Server Migration
- [ ] Update `stream-orchestrator.ts` to use `upsertPart()`
- [ ] Remove manual `eventStream.publish()` calls
- [ ] Test streaming writes to database

### Phase 3: Lens Configuration
- [ ] Configure Lens to watch `step_parts` table
- [ ] Add delta/patch strategies for MessagePart fields
- [ ] Test change detection and streaming

### Phase 4: API Updates
- [ ] Update Lens API `message.getById` to support nested selection
- [ ] Add `steps.parts` selection support
- [ ] Test subscription with field selection

### Phase 5: Client Migration
- [ ] Replace `useEventStream` with `useLensQuery`
- [ ] Update `MessageView` to render from model
- [ ] Remove event handlers (`onTextDelta`, `onToolCall`, etc.)

### Phase 6: Cleanup
- [ ] Remove `text-delta`, `tool-call` event types
- [ ] Remove `session-updated` event emission
- [ ] Remove event handler infrastructure
- [ ] Update all documentation

### Phase 7: Testing
- [ ] Test streaming performance
- [ ] Verify delta optimization works
- [ ] Test multi-client synchronization
- [ ] Performance benchmarking

## Performance Considerations

### Database Write Performance
**Concern:** Writing to database on every chunk might be slow
**Solution:**
- SQLite is VERY fast for writes (10,000+ writes/sec)
- Parts table has indexes on (step_id, ordering)
- upsertPart() is single query (not a transaction)
- Batch writes if needed (every N chunks)

### Lens Delta Computation
**Concern:** Computing deltas might add overhead
**Solution:**
- Lens caches previous state
- Delta is simple string diff for text
- Computed once, streamed to all clients
- More efficient than sending full content

### Network Overhead
**Concern:** More events means more network traffic
**Solution:**
- Delta strategy sends only new text (e.g., "w", "o", "r", "l", "d")
- Much smaller than full content updates
- WebSocket batching reduces overhead
- Overall bandwidth reduced by 57%-99%

## Questions & Decisions

### Q: Why not keep events for streaming and models for persistent data?
**A:** That's the tRPC way, which led to complexity. Lens way is "everything is a model". Models CAN stream incrementally via delta strategies. No need for separate event types.

### Q: What about very high-frequency updates (100+ chunks/sec)?
**A:**
- Option 1: Batch database writes (every 10 chunks)
- Option 2: Lens batching (built-in)
- Option 3: Throttle UI updates (React batching)
- In practice, AI streaming is ~10-50 chunks/sec, well within limits

### Q: How do we handle disconnections during streaming?
**A:**
- Database has partial state
- Client reconnects and subscribes
- Lens sends current state (full or delta from last known)
- Streaming resumes from where it was
- Much better than event-based (lost events = lost content)

## References

### Related Files
- `packages/code-core/src/database/message-repository.ts` - Repository with upsertPart()
- `packages/code-core/src/types/session.types.ts` - MessagePart types
- `packages/code-core/src/database/schema.ts` - Database schema
- `packages/code-server/src/services/streaming/stream-orchestrator.ts` - Server streaming logic

### Related Docs
- `.sylphx/context.md` - Project context and goals
- `lens/docs/architecture.md` - Lens framework architecture
- `lens/docs/strategies.md` - Delta/patch/value strategies

### Commits
- `0c4060a` - feat: Add messageRepository.upsertPart() for incremental streaming updates

## Status

**Current State:**
- ✅ Database schema ready
- ✅ MessagePart types defined
- ✅ Repository method implemented
- 🚧 Server streaming not migrated yet
- 🚧 Lens configuration not done yet
- 🚧 Client not migrated yet

**Next Steps:**
1. Test upsertPart() method
2. Update stream-orchestrator to use it
3. Configure Lens to watch step_parts
4. Migrate client to model subscription

**Estimated Effort:** 2-3 days for full migration
