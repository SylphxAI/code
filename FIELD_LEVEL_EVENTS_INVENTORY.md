# Field-Level Metadata Events Inventory

## Problem Statement

Current implementation violates Lens framework's **model-level granularity** principle by emitting field-level metadata events instead of model-level events.

**Core Issue:** Mixing content streaming (which is inherently incremental) with metadata updates (which should be model-level).

## Architectural Principle

### ✅ Content Streaming (Keep - Incremental by Nature)
- `text-delta`, `text-end` - Incremental text streaming
- `tool-input-delta`, `tool-input-end` - Tool parameter streaming
- `reasoning-delta`, `reasoning-end` - Reasoning streaming

**Why Keep:** These are content being generated incrementally. The "delta" nature is essential.

### ❌ Field-Level Metadata Events (Remove - Should be Model-Level)
- `session-status-updated` - Only status field
- `session-tokens-updated` - Only token fields
- `session-title-updated-start/delta/end` - Only title field
- `message-status-updated` - Only message status field

**Why Remove:** These are metadata about models. Should emit full model and let update strategies (delta, patch, value, auto) handle transmission optimization.

## Complete Inventory

### 1. session-status-updated ❌

**Type Definition:**
```typescript
// packages/code-core/src/types/streaming-events.types.ts:83
{ type: "session-status-updated"; sessionId: string; status: SessionStatus }

interface SessionStatus {
  text: string;
  duration: number;
  tokenUsage: number;
  isActive: boolean;
}
```

**Server-Side Emission:**
- File: `packages/code-server/src/services/streaming/session-status-manager.ts`
- Function: `emitSessionStatusUpdated` (event-emitter.ts line 31-41)
- Called from: `createSessionStatusManager` (lines 103-115)
- Purpose: Real-time unified progress indicator updates
- Frequency: Every second while active + on state changes (tool calls, token updates)

**Client-Side Handling:**
- Handler: `handleSessionStatusUpdated` (sessionHandlers.ts line 226-254)
- Uses: V2 Effect System for optimistic updates + reconciliation
- Updates: currentSession zen signal via optimistic effects

**Dependencies:**
- Used by: stream-orchestrator.ts
- Interval: 1-second polling for duration updates
- State: currentTool, tokenUsage, startTime, todos, isActive

---

### 2. session-tokens-updated ❌

**Type Definition:**
```typescript
// packages/code-core/src/types/streaming-events.types.ts:74-79
{
  type: "session-tokens-updated";
  sessionId: string;
  totalTokens: number;
  baseContextTokens: number;
  outputTokens?: number; // Current streaming output tokens
}
```

**Server-Side Emission:**
- File: `packages/code-server/src/services/token-tracking.service.ts`
- Emission Points (4 places):
  - Line 74: `emitInitialBaselineTokens` - Initial baseline when streaming starts
  - Line 106: `accumulateStepTokens` - After each step completion
  - Line 170: `accumulateStepTokensStreaming` - During streaming (with outputTokens)
  - Line 231: `finalizeTotalTokens` - Final totals when streaming completes
- Purpose: Track token usage throughout streaming lifecycle

**Client-Side Handling:**
- Handler: `handleSessionTokensUpdated` (sessionHandlers.ts line 169-209)
- Updates: currentSession.totalTokens, currentSession.baseContextTokens
- Updates: streamingOutputTokens for status indicator
- Architecture: "Send data on needed" - client is pure UI

**Dependencies:**
- Consumed by: session-status-manager (stream-orchestrator.ts line 125)
- Used in: StatusBar component, useTotalTokens hook

---

### 3. session-title-updated-start/delta/end ❌

**Type Definition:**
```typescript
// packages/code-core/src/types/streaming-events.types.ts:80-82
| { type: "session-title-updated-start"; sessionId: string }
| { type: "session-title-updated-delta"; sessionId: string; text: string }
| { type: "session-title-updated-end"; sessionId: string; title: string }
```

**Server-Side Emission:**
- File: `packages/code-server/src/services/streaming/title-generator.ts`
- Emission Points:
  - Lines 84-92: `session-title-updated-start`
  - Lines 104-113: `session-title-updated-delta` (in loop)
  - Line 133: `session-title-updated-end` (via publishTitleUpdate)
- Purpose: Stream title generation incrementally to show progress
- Parallel: Title generation runs in parallel with main streaming

**Client-Side Handling:**
- Handlers:
  - `handleSessionTitleUpdatedStart` (sessionHandlers.ts line 114-124)
  - `handleSessionTitleUpdatedDelta` (sessionHandlers.ts line 126-135)
  - `handleSessionTitleUpdatedEnd` (sessionHandlers.ts line 137-147)
- State Management:
  - isTitleStreaming flag
  - streamingTitle accumulator
  - Final update to session.title
- UI: Shows streaming title in sidebar

**Dependencies:**
- Published to: `session:${sessionId}` channel
- Parallel execution: generateSessionTitle() runs async alongside main stream
- Callback option: Can use callbacks instead of events for non-event-stream scenarios

---

### 4. message-status-updated ❌

**Type Definition:**
```typescript
// packages/code-core/src/types/streaming-events.types.ts:90-95
{
  type: "message-status-updated";
  messageId: string;
  status: "active" | "completed" | "error" | "abort";
  usage?: TokenUsage;
  finishReason?: string;
}
```

**Server-Side Emission:**
- File: `packages/code-server/src/services/streaming/event-emitter.ts`
- Function: `emitMessageStatusUpdated` (lines 89-103)
- Called from: Various places in streaming service
- Purpose: Update message lifecycle state

**Client-Side Handling:**
- Handler: `handleMessageStatusUpdated` (errorHandlers.ts line 64)
- Integration: `handleMessageStatusUpdatedWithOptimistic` (optimistic/integration.ts line 234)
- Updates: Message status in messages array

**Dependencies:**
- Used for: Message lifecycle tracking (active → completed/error/abort)
- Includes: Token usage and finish reason in final status

---

## Event Handler Mapping

**File:** `packages/code/src/screens/chat/streaming/streamEventHandlers.ts`

```typescript
// Lines 137-150
const streamEventHandlers: Record<string, StreamEventHandler> = {
  // Field-level metadata events (TO BE REMOVED)
  "session-status-updated": handleSessionStatusUpdated,          // ❌ Line 137
  "session-tokens-updated": handleSessionTokensUpdated,          // ❌ Line 138
  "session-title-updated-start": handleSessionTitleUpdatedStart, // ❌ Line 141
  "session-title-updated-delta": handleSessionTitleUpdatedDelta, // ❌ Line 142
  "session-title-updated-end": handleSessionTitleUpdatedEnd,     // ❌ Line 143
  "message-status-updated": handleMessageStatusUpdated,          // ❌ Line 150

  // Model-level events (KEEP)
  "session-created": handleSessionCreated,
  "session-updated": handleSessionUpdated,
  "session-deleted": handleSessionDeleted,

  // Content streaming events (KEEP)
  "text-delta": handleTextDelta,
  "tool-input-delta": handleToolInputDelta,
  // ... etc
};
```

---

## Correct Architecture (Lens Framework)

### Model-Level Events

```typescript
// ✅ Session metadata updates should emit full session model
{
  type: 'session-updated',
  payload: {
    session: {
      id: 'abc',
      title: 'Chat Title',
      status: { text: 'Thinking...', duration: 1234, tokenUsage: 500, isActive: true },
      totalTokens: 1000,
      baseContextTokens: 500,
      // ... all session fields
    }
  }
}

// ✅ Message updates should emit full message model
{
  type: 'message-updated',
  payload: {
    message: {
      id: 'msg-123',
      status: 'completed',
      usage: { promptTokens: 100, completionTokens: 50 },
      finishReason: 'stop',
      // ... all message fields
    }
  }
}
```

### Frontend Controls Transmission

```typescript
// Frontend decides what fields to receive and how to receive them
client.session.getById.subscribe(
  { sessionId: 'abc' },
  {
    // Field selection - frontend decides granularity
    select: {
      id: true,
      title: true,
      status: true,
      totalTokens: true
    },

    // Update strategy - frontend decides transmission optimization
    updateMode: 'delta'  // Only send changed fields
    // OR 'patch'  // JSON Patch operations
    // OR 'value'  // Full value
    // OR 'auto'   // Smart detection
  }
);
```

### Benefits

1. **Frontend-Driven** ✅ - Client controls what data to receive
2. **Consistent Granularity** ✅ - Always model-level, never field-level
3. **Transmission Optimization** ✅ - Update strategies handle optimization
4. **Optimistic Updates** ✅ - Full model allows proper reconciliation
5. **Multi-Client Sync** ✅ - All clients receive same model-level events

---

## Migration Plan

### Phase 1: Document ✅
- ✅ Identify all field-level metadata events
- ✅ Map server-side emission points
- ✅ Map client-side handlers
- ✅ Document dependencies

### Phase 2: Remove Event Types 🔄
- ❌ Remove field-level events from `streaming-events.types.ts`
- ❌ Keep content streaming events (text-delta, tool-input-delta, etc.)
- ❌ Keep model-level events (session-created, session-updated, etc.)

### Phase 3: Server-Side Replacement ⏳
Replace field-level emissions with model-level:

**session-status-updated →** `session-updated` with full session
- Modify: `session-status-manager.ts`
- Emit: Full session model instead of just status
- Frequency: Same (every second + state changes)

**session-tokens-updated →** `session-updated` with full session
- Modify: `token-tracking.service.ts`
- Emit: Full session model instead of just tokens
- Merge: With session-status updates (same event)

**session-title-updated-* →** `session-updated` with full session
- Modify: `title-generator.ts`
- Keep: Incremental title streaming logic (generate text incrementally)
- Change: Emit full session model with each title delta
- Frontend: Subscription with `updateMode: 'delta'` will receive only changed title field

**message-status-updated →** `message-updated` with full message
- Modify: `event-emitter.ts`
- Emit: Full message model instead of just status

### Phase 4: Client-Side Replacement ⏳
Update handlers to receive full models:
- Modify: `sessionHandlers.ts` - receive full session
- Modify: `errorHandlers.ts` - receive full message
- Update: `streamEventHandlers.ts` - remove field-level event mappings
- Keep: Same UI behavior (extract needed fields from full model)

### Phase 5: Lens Subscriptions ⏳
- Add: Lens subscription for session updates
- Configure: Field selection (only needed fields)
- Configure: Update strategy (delta for minimal transmission)
- Remove: Direct event handlers (replaced by Lens subscription)

---

## Questions to Resolve

### 1. Title Streaming
**Question:** Should title generation still stream incrementally?

**Option A:** Keep incremental streaming, emit full session with each delta
- Pro: Shows real-time title generation progress
- Con: More frequent session updates during title generation

**Option B:** Generate title fully, emit once when complete
- Pro: Fewer events
- Con: No progress indication for title generation

**Recommendation:** Option A - user experience benefit outweighs event frequency

### 2. Session Status Polling
**Question:** session-status-manager polls every second for duration updates. Keep polling?

**Option A:** Keep 1-second polling
- Pro: Smooth duration counter
- Con: Frequent events even when nothing changes

**Option B:** Only emit on actual state changes
- Pro: Fewer events
- Con: Duration only updates on state changes

**Recommendation:** Option A - duration is important UX, 1-second updates acceptable

### 3. Event Deduplication
**Question:** Multiple sources emit session-updated (status manager, token tracker, title generator). Deduplicate?

**Option A:** Emit separately, let subscription handle dedup
- Pro: Simple, decoupled
- Con: Multiple events in quick succession

**Option B:** Centralized session update emitter with debouncing
- Pro: Fewer events
- Con: More complexity, coupling

**Recommendation:** Option A initially, Option B if performance issue

---

## Success Criteria

1. ✅ No field-level metadata events in `streaming-events.types.ts`
2. ✅ All metadata updates emit full model
3. ✅ Content streaming events unchanged (text-delta, tool-input-delta, etc.)
4. ✅ Client handlers receive full models
5. ✅ Same UI behavior (no regression)
6. ✅ Update strategies control transmission optimization
7. ✅ Type-safe field selection (object syntax: `{ id: true, status: true }`)
