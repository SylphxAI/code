# Lens Fine-Grained Streaming - Implementation Checklist

**Date:** 2025-01-23
**Status:** 🚧 In Progress

## Architecture Summary

**Goal:** Fine-grained message subscriptions with automatic state merging

**Flow:**
```
upsertPart() → Publish part-updated event → Subscribe to message channel → Merge into message state → Client receives update
```

---

## Code Changes Required

### 1. Update message.getById Subscription (code-api)

**File:** `packages/code-api/src/api.ts`
**Location:** Line 536-567 (message.getById subscribe function)

**Current:**
```typescript
// Subscribes to session:${sessionId} channel
// Listens to session-updated events
// Returns full message from event
```

**Change To:**
```typescript
// Subscribe to message:${messageId} channel
// Listen to part-updated events
// Merge parts into message state using scan() operator
```

**Implementation:**
```typescript
async ({ input, ctx }): Promise<Observable<Message | null>> => {
  const { messageId } = input;
  const { scan, startWith } = require("rxjs/operators");

  // Initial fetch
  const sessionId = messageId.split('-step-')[0].replace(/-[^-]+$/, '');
  const session = await ctx.sessionRepository.getSessionById(sessionId);
  const initialMessage = session?.messages?.find(m => m.id === messageId) || null;

  // Subscribe to message-specific channel
  return ctx.appContext.eventStream
    .subscribe(`message:${messageId}`)
    .pipe(
      startWith({ type: 'initial', message: initialMessage }),
      scan((currentMessage, event) => {
        if (event.type === 'part-updated') {
          // Merge part into message
          return mergePart(currentMessage, event.stepId, event.partIndex, event.part);
        }
        return currentMessage;
      }, initialMessage)
    );
}
```

---

### 2. Publish part-updated Events (code-server)

**File:** `packages/code-server/src/services/streaming/stream-orchestrator.ts`
**Location:** Line 412-415 (persistence context)

**Current:**
```typescript
const persistence = {
  messageRepository,
  getStepId: () => stepIdMap.get(currentStepNumber) || null,
};
```

**Change To:**
```typescript
const persistence = {
  messageRepository,
  getStepId: () => stepIdMap.get(currentStepNumber) || null,

  // Publish fine-grained event after upsert
  publishPartUpdate: async (stepId: string, partIndex: number, part: MessagePart) => {
    await opts.appContext.eventStream.publish(`message:${assistantMessageId}`, {
      type: 'part-updated',
      messageId: assistantMessageId,
      stepId,
      partIndex,
      part
    });
  }
};
```

---

### 3. Call publishPartUpdate in ai-orchestrator

**File:** `packages/code-server/src/services/streaming/ai-orchestrator.ts`
**Locations:** Multiple (after each upsertPart call)

**Example (text-delta):**
```typescript
case "text-delta": {
  if (state.currentTextPartIndex !== null) {
    const part = state.currentStepParts[state.currentTextPartIndex];
    if (part && part.type === "text") {
      part.content += chunk.text;

      // LENS: Write to database
      if (persistence) {
        const stepId = persistence.getStepId();
        if (stepId) {
          await persistence.messageRepository.upsertPart(
            stepId,
            state.currentTextPartIndex,
            part,
          );

          // NEW: Publish fine-grained event
          await persistence.publishPartUpdate(stepId, state.currentTextPartIndex, part);
        }
      }
    }
  }
  break;
}
```

**Apply to all cases:**
- text-delta (line ~119-129)
- text-end (line ~149-166)
- reasoning-delta (line ~192-224)
- reasoning-end (line ~228-249)
- tool-call (line ~280-315)
- tool-result (line ~320-370)

---

### 4. Add Debouncing (Optional Optimization)

**Strategy:** Publish every 10 deltas OR when part completes

```typescript
// In persistence context
let deltaSinceLastPublish = 0;
const PUBLISH_INTERVAL = 10;

publishPartUpdate: async (stepId, partIndex, part, forcePublish = false) => {
  deltaSinceLastPublish++;

  if (forcePublish || deltaSinceLastPublish >= PUBLISH_INTERVAL) {
    await opts.appContext.eventStream.publish(`message:${assistantMessageId}`, {
      type: 'part-updated',
      messageId: assistantMessageId,
      stepId,
      partIndex,
      part
    });
    deltaSinceLastPublish = 0;
  }
}
```

---

## Testing Checklist

- [ ] message.getById subscription receives part-updated events
- [ ] Parts merge correctly into message state
- [ ] UI updates reactively as text streams in
- [ ] Tool calls update correctly
- [ ] Reasoning parts update correctly
- [ ] Multiple parts in same step work
- [ ] Status changes (active → completed) work
- [ ] Performance acceptable (<100ms latency)

---

## Rollback Plan

If issues arise:
1. Revert message.getById subscription to use `session:${sessionId}` channel
2. Remove publishPartUpdate calls
3. Keep using session-updated events
4. All existing code still works

---

## Next Phase

After this works:
1. Document patterns discovered
2. Remove field-level events (text-delta, tool-call)
3. Create ADR for resource-based Lens enhancement
4. Plan Lens framework enhancement with defineResource()

---

## Files Modified

- `packages/code-api/src/api.ts` - message.getById subscription
- `packages/code-server/src/services/streaming/stream-orchestrator.ts` - persistence context
- `packages/code-server/src/services/streaming/ai-orchestrator.ts` - publish calls (6 locations)
- `.sylphx/lens-event-design.md` - Design documentation
- `.sylphx/implementation-checklist.md` - This file

---

## Status

- ✅ Design complete
- ✅ Documentation written
- 🚧 Code implementation in progress
- ⏳ Testing pending
