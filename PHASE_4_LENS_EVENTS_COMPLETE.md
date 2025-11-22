# Phase 4: Lens Event Stream Migration - Complete ✅

## 總結

核心 event streaming 已從 tRPC 遷移到 Lens，實現 model-level events + type-safe subscriptions。

---

## ✅ 已完成

### 1. Lens Events API Definition
**File:** `packages/code-api/src/api.ts` (lines 1063-1200)

```typescript
export const eventsAPI = lens.object({
  // Generic channel subscription with cursor-based replay
  subscribe: lens.query({ ... }),

  // Convenience: Subscribe to specific session
  subscribeToSession: lens.query({ ... }),

  // Convenience: Subscribe to all sessions (session list sync)
  subscribeToAllSessions: lens.query({ ... }),

  // Channel info (debugging)
  getChannelInfo: lens.query({ ... }),

  // Cleanup old events
  cleanupChannel: lens.mutation({ ... }),
});
```

**Features:**
- ✅ Cursor-based replay from database
- ✅ Channel-based routing (`session:id`, `sessions`, `bash:all`, etc.)
- ✅ Model-level event granularity
- ✅ Type-safe subscriptions with full inference

---

### 2. Client Migrations

#### useSessionListSync → Lens + Model-Level Events
**File:** `packages/code/src/hooks/client/useSessionListSync.ts`

**Before (tRPC + Field-Level):**
```typescript
const client = await getTRPCClient();
client.events.subscribeToAllSessions.subscribe({ replayLast }, {
  onData: (event) => {
    switch (event.payload.type) {
      case "session-title-updated":        // ❌ Field-level
      case "session-model-updated":        // ❌ Field-level
      case "session-provider-updated":     // ❌ Field-level
      ...
    }
  }
});
```

**After (Lens + Model-Level):**
```typescript
const client = getLensClient<API>();
client.events.subscribeToAllSessions.subscribe({ replayLast }, {
  next: (event) => {
    switch (event.payload.type) {
      case "session-updated":             // ✅ Model-level
        // Partial session with only changed fields
        if (event.session.title !== undefined) {
          callbacks.onSessionTitleUpdated(event.sessionId, event.session.title);
        }
        ...
      case "session-created":
      case "session-deleted":
      case "session-compacted":           // ✅ New event type
      ...
    }
  }
});
```

**Benefits:**
- ✅ Unified model-level granularity
- ✅ Partial session updates (efficient transmission)
- ✅ Full type safety with autocomplete
- ✅ Handles session-compacted event

---

#### useBackgroundBashCount → Lens
**File:** `packages/code/src/hooks/client/useBackgroundBashCount.ts`

**Before (tRPC):**
```typescript
const trpc = useTRPCClient();
const processes = await trpc.bash.list.query();
trpc.events.subscribe.subscribe({ channel: "bash:all" }, { ... });
```

**After (Lens):**
```typescript
const client = useLensClient<API>();
const processes = await client.bash.list.query({});
client.events.subscribe.subscribe({ channel: "bash:all" }, { ... });
```

**Benefits:**
- ✅ Consistent API (Lens for both queries and subscriptions)
- ✅ Type-safe bash.list.query with inference
- ✅ Observable-based subscriptions (RxJS)

---

### 3. Infrastructure Ready

#### AppEventStream PubSubAdapter (Created, Not Used Yet)
**File:** `packages/code-server/src/adapters/app-event-stream-pubsub.adapter.ts`

Adapter for integrating AppEventStream with Lens PubSub interface.
**Status:** Created for future use, not currently integrated.

#### AppEventStream Service (Existing)
**File:** `packages/code-server/src/services/app-event-stream.service.ts`

**Features Preserved:**
- ✅ Cursor-based replay from database (EventPersistence)
- ✅ ReplaySubject with 50-event in-memory buffer
- ✅ Channel-based routing
- ✅ Auto-cleanup of old events

**Status:** Still used by both tRPC and Lens eventsAPI (shared infrastructure).

---

## 🔄 Coexistence Strategy

**Current State:** Lens and tRPC event streams coexist

### Why Keep Both?
1. **Core hooks migrated** - useSessionListSync, useBackgroundBashCount now use Lens
2. **23 files still use tRPC** - Other hooks/components not yet migrated
3. **No breaking changes** - Gradual migration allows testing

### tRPC Events Router Status
**File:** `packages/code-server/src/trpc/routers/events.router.ts`

**Status:** ⚠️ Deprecated but not removed

```typescript
// ⚠️ DEPRECATED: Use Lens eventsAPI instead
// packages/code-api/src/api.ts - eventsAPI
// This router will be removed in Phase 5
export const eventsRouter = router({ ... });
```

**Plan:** Remove in Phase 5 after all files migrated.

---

## 📊 Migration Progress

### Event Streaming
- ✅ Lens eventsAPI defined and working
- ✅ Core hooks migrated (session list sync, bash count)
- ⚠️ tRPC eventsRouter deprecated (coexisting)

### Remaining tRPC Usage (Phase 5)
**23 files still using `getTRPCClient()` for non-event APIs:**
- session.* queries/mutations
- bash.* queries/mutations
- config.* queries/mutations
- message.* queries
- file.* queries
- admin.* queries

**Plan:** Migrate in Phase 5 (Full tRPC Removal)

---

## 🎯 Success Criteria (Phase 4)

1. ✅ **Lens eventsAPI implemented** - Full feature parity with tRPC events
2. ✅ **Core event hooks migrated** - useSessionListSync, useBackgroundBashCount
3. ✅ **Model-level events** - Consistent granularity (session-updated, not field-level)
4. ✅ **Type-safe subscriptions** - Full TypeScript inference with autocomplete
5. ✅ **No breaking changes** - Gradual migration, both systems coexist

---

## 🚀 Benefits Achieved

### 1. Unified Granularity
```typescript
// Before: Mixed granularity
- session-status-updated (field-level)
- session-tokens-updated (field-level)
- session-title-updated-start/delta/end (field-level)

// After: Model-level only
- session-updated (partial session)
- session-created
- session-deleted
- session-compacted
```

### 2. Type-Safe Subscriptions
```typescript
// ✅ Full autocomplete
client.events.subscribeToAllSessions.subscribe(
  { replayLast: 20 },  // ✅ Type: number
  {
    next: (event) => {
      // ✅ event.payload.type autocomplete
      // ✅ event.payload.session autocomplete
    }
  }
);
```

### 3. Efficient Transmission
```typescript
// Model-level with partial updates
{
  type: "session-updated",
  sessionId: "abc",
  session: {
    id: "abc",
    title: "New Title",        // Only changed fields
    updatedAt: 1234567890
  }
}
```

---

## 📝 Next Steps: Phase 5

**Goal:** Complete tRPC removal

**Scope:**
1. Migrate remaining 23 files from tRPC to Lens
2. Remove all tRPC routers (session, bash, config, message, file, admin, events)
3. Remove tRPC dependencies
4. Remove TRPCProvider
5. Clean up old code

**Estimated Files:**
- 23 files using `getTRPCClient()`
- 8 tRPC routers to remove
- TRPCProvider and related infrastructure

---

## 🔗 Related Documentation

- **Model-Level Events:** `MODEL_LEVEL_EVENTS_MIGRATION_COMPLETE.md`
- **Type-Safe Field Selection:** `TYPE_SAFE_FIELD_SELECTION.md`
- **Lens Integration Guide:** `TYPE_SAFE_LENS_INTEGRATION.md`
- **ADR-009:** Lens Framework Integration
- **Architecture:** `.sylphx/architecture.md`

---

## Commits

1. `7ef5cbd` - feat: Migrate to model-level events architecture
2. `c6574a6` - docs: Add type-safe Lens integration guide
3. `a270122` - docs: Add ADR-009 and update architecture
4. `ea55034` - feat(client): Migrate event subscriptions from tRPC to Lens

---

**Phase 4 Status:** ✅ Core Complete (Event Streaming Migrated)
**Next Phase:** Phase 5 (Full tRPC Removal - 23 files remaining)
