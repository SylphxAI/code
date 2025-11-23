# Streaming Architecture Migration Plan

**Date:** 2025-01-23
**Status:** 🚧 In Progress

## Goal

Migrate from batch-write streaming to incremental-write streaming to enable Lens delta optimization.

## Current Architecture (Batch Write)

### Flow
```
AI SDK streams → processAIStream() → Update state.currentStepParts (in memory)
                                   → Emit events to client
                                   ↓
                              At end of step
                                   ↓
                    completeStep() → updateStepParts() → Write ALL parts to DB at once
```

### Problems
- Parts only saved at step end (no persistence during streaming)
- Can't resume streaming after disconnect
- Lens can't stream updates (no DB changes to watch)
- Client gets events but has no persistent state

## Target Architecture (Incremental Write)

### Flow
```
AI SDK streams → processAIStream() → Update state.currentStepParts (in memory)
                                   → upsertPart() → Write part to DB immediately
                                   → Emit events (optional, for migration)
                                   ↓
                              Lens watches DB
                                   ↓
                              Delta computed → Stream to subscribers
                                   ↓
                              Client UI updates reactively
```

### Benefits
- ✅ Parts saved immediately (can resume streaming)
- ✅ Lens streams delta updates automatically
- ✅ Client subscriptions get real-time updates
- ✅ Multi-client sync works
- ✅ No custom event types needed (future)

## Implementation Steps

### Phase 1: Add Database Writes (Keep Events) ✅ Current

**Goal:** Write parts to database during streaming while keeping event emissions

**Changes:**
1. ✅ Add `messageRepository.upsertPart()` method
2. Add stepId and messageRepository to `processAIStream()` parameters
3. Call `upsertPart()` when parts are created/updated:
   - `text-delta`: Update text part content
   - `tool-call`: Insert new tool part
   - `tool-result`: Update tool part with result
   - `reasoning-delta`: Update reasoning part content
4. Keep event emissions (backward compatibility)

**Files to modify:**
- `ai-orchestrator.ts` - Add upsertPart() calls
- `stream-orchestrator.ts` - Pass messageRepository and stepId to processAIStream

**Testing:**
- Verify parts are written to database during streaming
- Verify events still emit (existing clients still work)
- Check database after each chunk

### Phase 2: Configure Lens Watching

**Goal:** Make Lens detect and stream database changes

**Changes:**
1. Configure Lens to watch `step_parts` table
2. Add delta strategy for MessagePart.content field
3. Add patch strategy for MessagePart.status field
4. Test change detection

**Files to modify:**
- `lens/src/resources/message.ts` - Configure resource
- `lens/src/strategies/` - Add delta/patch strategies

**Testing:**
- Insert part via upsertPart(), verify Lens publishes change
- Update part content, verify delta is computed
- Subscribe and verify delta received

### Phase 3: Update Lens API

**Goal:** Support nested selection (Message.steps.parts)

**Changes:**
1. Update `message.getById` query to support nested selection
2. Add `steps.parts` field selection support
3. Test subscription with field selection

**Files to modify:**
- `code-api/src/api.ts` - Update message.getById definition

**Testing:**
- Subscribe with nested select, verify data shape
- Update part, verify subscriber receives delta
- Test multiple subscribers

### Phase 4: Migrate Client

**Goal:** Replace event subscriptions with model subscriptions

**Changes:**
1. Create `useMessageSubscription` hook
2. Update MessageView to use model data
3. Remove event handlers (onTextDelta, onToolCall, etc.)
4. Test reactive rendering

**Files to modify:**
- `packages/code/src/hooks/client/useMessageSubscription.ts` - New hook
- `packages/code/src/components/MessageView.tsx` - Use model data
- `packages/code/src/screens/chat/hooks/useChatEffects.ts` - Remove useEventStream

**Testing:**
- Verify UI updates as parts stream in
- Test multiple parts rendering
- Test status changes (active → completed)

### Phase 5: Remove Events

**Goal:** Clean up event-based code

**Changes:**
1. Remove event emissions from ai-orchestrator
2. Remove text-delta, tool-call event types
3. Remove event handlers
4. Remove useEventStream hook

**Files to remove/modify:**
- Remove event emissions from callbacks
- Remove event type definitions
- Clean up documentation

**Testing:**
- Full streaming test
- Multi-client sync test
- Performance benchmarking

## Technical Details

### upsertPart() Integration

**In processAIStream():**

```typescript
// Add parameters
export async function processAIStream(
  fullStream: AsyncIterable<TextStreamPart<any>>,
  observer: Observer<StreamEvent, unknown>,
  state: StreamState,
  tokenContext: TokenTrackingContext | null,
  callbacks: StreamCallbacks,
  // NEW:
  persistence?: {
    messageRepository: MessageRepository;
    getStepId: () => string | null; // Get current step ID
  }
): Promise<...> {

  // In text-delta handler:
  case "text-delta": {
    if (state.currentTextPartIndex !== null) {
      const part = state.currentStepParts[state.currentTextPartIndex];
      if (part.type === "text") {
        part.content += chunk.text;

        // NEW: Write to database
        if (persistence) {
          const stepId = persistence.getStepId();
          if (stepId) {
            await persistence.messageRepository.upsertPart(
              stepId,
              state.currentTextPartIndex,
              part
            );
          }
        }
      }
      callbacks.onTextDelta?.(chunk.text);
    }
    break;
  }

  // Similar for tool-call, reasoning-delta, etc.
}
```

**In stream-orchestrator:**

```typescript
const callbacks: StreamCallbacks = { ... };

// NEW: Create persistence context
let currentStepNumber = lastCompletedStepNumber + 1;
const persistence = {
  messageRepository,
  getStepId: () => stepIdMap.get(currentStepNumber) || null
};

// Pass to processAIStream
await processAIStream(
  fullStream,
  observer,
  state,
  tokenContext,
  callbacks,
  persistence  // NEW
);
```

### Step Number Tracking

**Problem:** processAIStream doesn't know which step it's processing

**Solution:** Pass getStepId() function that returns current step ID

**Implementation:**
- stream-orchestrator tracks currentStepNumber
- Increments in onStepFinish callback
- getStepId() looks up stepIdMap.get(currentStepNumber)

### Ordering Tracking

**Already solved:** processAIStream maintains:
- `state.currentTextPartIndex` - Index of current text part
- `state.currentReasoningPartIndex` - Index of current reasoning part
- `state.currentStepParts.length` - Next index for new parts

These are used as the `ordering` parameter to upsertPart().

## Testing Strategy

### Phase 1 Testing (Database Writes)
```typescript
// Test: Text streaming
1. Start streaming
2. After each text-delta, query database for part
3. Verify content is growing incrementally
4. Verify status changes from 'active' to 'completed'

// Test: Tool calls
1. Start streaming with tool call
2. Verify tool part inserted with input
3. Verify tool part updated with result
4. Verify status changes

// Test: Multiple parts
1. Stream text → tool → text
2. Verify 3 parts in database with correct ordering
3. Verify each part has correct type and content
```

### Phase 2 Testing (Lens Watching)
```typescript
// Test: Change detection
1. Subscribe to message
2. upsertPart() with new content
3. Verify Lens publishes change
4. Verify delta contains only new content

// Test: Delta computation
1. Part content: "Hello"
2. Update to: "Hello world"
3. Verify delta is: " world" (not full content)
```

### Phase 3 Testing (Nested Selection)
```typescript
// Test: Nested query
const message = await lensClient.message.getById.query(
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
// Verify message.steps[0].parts is populated
```

### Phase 4 Testing (Client Migration)
```typescript
// Test: Reactive rendering
1. Subscribe to message
2. Start streaming
3. Verify UI updates as parts arrive
4. No manual event handling needed
```

## Rollback Plan

If migration causes issues:

1. **Phase 1 Rollback:**
   - Remove upsertPart() calls
   - Keep event emissions
   - Back to batch-write at step end

2. **Phase 2-4 Rollback:**
   - Disable Lens watching
   - Keep using useEventStream
   - Events still work

## Success Criteria

- ✅ Parts written to database during streaming
- ✅ Lens detects changes and streams deltas
- ✅ Client UI updates reactively from model
- ✅ No event handlers needed
- ✅ Multi-client sync works
- ✅ Performance is same or better
- ✅ Code is simpler (less custom logic)

## Timeline

- Phase 1: 1-2 hours (add database writes)
- Phase 2: 2-3 hours (configure Lens)
- Phase 3: 1-2 hours (update API)
- Phase 4: 2-3 hours (migrate client)
- Phase 5: 1 hour (cleanup)
- Testing: 2-3 hours

**Total: 1-2 days**

## Current Status

- ✅ Phase 0: Design and documentation
- 🚧 Phase 1: In progress (adding database writes)
- ⏳ Phase 2: Pending
- ⏳ Phase 3: Pending
- ⏳ Phase 4: Pending
- ⏳ Phase 5: Pending
