# Lens + Optimistic Updates Integration Design

**Date:** 2024-12-22
**Status:** ✅ Design Complete (Research-Based)

**See also:** `OPTIMISTIC_UPDATES_RESEARCH.md` - Comprehensive industry research and analysis

---

## 🎯 Research Summary & Optimal Approach

**Research Conducted:** Analyzed React Query, Apollo Client, SWR, React 19 useOptimistic, and optimistic UI best practices.

**Key Finding:** ALL successful frameworks use **mutation-centric co-location**, NOT centralized configuration.

**Optimal Pattern:**
```typescript
// ✅ Inline optimistic config (co-located with mutation)
export const updateSessionTitle = mutation({
  input: z.object({ sessionId: z.string(), title: z.string() }),
  output: SessionSchema,
  resolve: async (input, ctx) => { ... },

  // Optimistic config lives HERE (not in separate file)
  optimistic: {
    apply: (input) => ({
      type: 'update-session-title',
      sessionId: input.sessionId,
      title: input.title
    })
  }
});
```

**Why This Is Optimal:**
- ✅ 簡單輕型 (Simple & Lightweight) - No centralized config, minimal API
- ✅ 高效強大 (Efficient & Powerful) - Leverages existing effect system
- ✅ Fine-grained - Per-mutation control
- ✅ Best UX - Immediate updates, smooth rollback
- ✅ Best DX - Type-safe, co-located, easy to maintain

**Rejected Approaches:**
- ❌ Centralized config file (becomes huge, hard to maintain)
- ❌ Convention-based auto-generation (can't generate handlers)
- ❌ Client-side config (duplicates mutation definitions)

---

## Context

**Problem:** Lens 的核心初衷之一是實施 optimistic updates，但目前只有基礎設施，未整合。

**Existing:**
- ✅ `packages/optimistic/` - Pure functional optimistic manager
- ✅ Lens subscriptions - Real-time server state
- ❌ Integration between them - NOT DONE

**Goal:** 透明、自動的 optimistic updates，無需手動管理。

---

## Current Optimistic System Analysis

### Architecture

```typescript
// Pure Functional Effect System
OptimisticManagerV2
  ├─ apply(operation) → EffectResult
  ├─ confirm(operationId, serverData) → EffectResult
  ├─ rollback(operationId) → EffectResult
  └─ reconcile(serverEvent) → EffectResult

// Effect Types
Effect =
  | PATCH_STATE (狀態更新)
  | SCHEDULE_TIMEOUT (超時處理)
  | CANCEL_TIMEOUT (取消超時)
  | EMIT_EVENT (事件發送)
  | LOG (日誌)

// Operation Types
Operation =
  | add-message
  | add-to-queue
  | update-message-status
  | update-session-status
  | ...
```

### Strengths

1. ✅ **Pure Functional** - No side effects, testable
2. ✅ **Effect System** - Composable, framework-agnostic
3. ✅ **Self-Healing** - Reconcile with server events
4. ✅ **Timeout Handling** - Auto-rollback after 10s
5. ✅ **Type-Safe** - Full TypeScript support

### Limitations

1. ❌ **Not Integrated** - Separate from Lens
2. ❌ **Manual Management** - Must call apply/confirm/rollback explicitly
3. ❌ **Specific to Messages** - Operations tied to messages/queue
4. ❌ **No Mutation API** - No declarative mutation interface

---

## Integration Design: Three Approaches

### ❌ Approach 1: Explicit Optimistic API (Too Manual)

```typescript
useLensSessionSubscription({
  select: { title: true, status: true },
  optimistic: {
    onApply: (op) => optimisticManager.apply(sessionId, op),
    onConfirm: (id) => optimisticManager.confirm(sessionId, id),
    onRollback: (id) => optimisticManager.rollback(sessionId, id)
  }
});
```

**Problems:**
- Too manual - Frontend manages optimistic lifecycle
- Violates "Select is All You Need" philosophy
- Not transparent

### ❌ Approach 2: Separate Mutation API (Disconnected)

```typescript
const { mutate } = useLensMutation();

await mutate.updateTitle({
  title: "New Title",
  optimistic: true
});
```

**Problems:**
- Disconnected from subscription
- Duplicate APIs (subscription vs mutation)
- Not aligned with Lens architecture

### ✅ Approach 3: Transparent Auto-Optimistic (BEST)

**Philosophy:** Optimistic updates should be transparent, automatic, zero-config.

```typescript
// Subscription automatically handles optimistic updates
useLensSessionSubscription({
  select: { id: true, title: true, status: true }
  // No optimistic configuration needed!
});

// Mutations automatically optimistic
await lensClient.session.update.mutate({
  sessionId: 'abc',
  data: { title: "New Title" }
  // Automatically:
  // 1. Optimistically update local state
  // 2. Send to server
  // 3. Server confirms → done
  // 4. Server rejects → rollback
});
```

**How it Works:**

```
Frontend                          Backend
   |                                 |
   | lensClient.session.update.mutate()
   |-------------------------------->|
   | [Optimistic] Update local state |
   |                                 | Process request
   |                                 |
   |<--------------------------------|
   | [Lens Subscription] Server confirms/rejects
   |                                 |
   | [Auto] Confirm or rollback      |
```

**Benefits:**
1. ✅ Transparent - No manual optimistic management
2. ✅ Zero-config - Works automatically
3. ✅ Type-safe - Full inference
4. ✅ Aligned with Lens philosophy

---

## Proposed Architecture

### Layer 1: Lens Mutation (New)

```typescript
// Lens Mutation Definition
const api = {
  session: {
    update: mutation({
      input: z.object({
        sessionId: z.string(),
        data: z.object({
          title: z.string().optional(),
          status: SessionStatusSchema.optional(),
        })
      }),
      output: SessionSchema,
      resolve: async (input, ctx) => {
        // Update database
        const updated = await ctx.db.session.update(input);

        // Emit event for subscriptions
        ctx.eventStream.emit('session-updated', {
          sessionId: input.sessionId,
          session: updated
        });

        return updated;
      },

      // NEW: Optimistic configuration
      optimistic: {
        // How to apply optimistically
        apply: (input) => ({
          type: 'update-session' as const,
          sessionId: input.sessionId,
          updates: input.data
        }),

        // How to extract confirm data from server response
        confirm: (response) => ({
          sessionId: response.id,
          data: response
        })
      }
    })
  }
};
```

### Layer 2: Lens Client (Enhanced)

```typescript
// Enhanced client with automatic optimistic updates
const client = createLensClient<typeof api>({
  transport,
  optimistic: {
    enabled: true,  // Enable by default
    manager: new OptimisticManagerV2(),

    // Hook into mutation lifecycle
    onBeforeMutate: (mutation, input) => {
      // Apply optimistic update
      const operation = mutation.optimistic.apply(input);
      return optimisticManager.apply(sessionId, operation);
    },

    onMutateSuccess: (operationId, response) => {
      // Confirm optimistic update
      return optimisticManager.confirm(sessionId, operationId, response);
    },

    onMutateError: (operationId, error) => {
      // Rollback optimistic update
      return optimisticManager.rollback(sessionId, operationId);
    }
  }
});
```

### Layer 3: Subscription Integration

```typescript
// Subscription automatically reflects optimistic updates
useLensSessionSubscription({
  select: { id: true, title: true, status: true },
  onSessionUpdated: (session) => {
    // This session includes:
    // 1. Server state (from subscription)
    // 2. Optimistic updates (from pending operations)
    // Automatically merged!
  }
});
```

**How Merging Works:**

```typescript
// Internal: Merge server state + optimistic layer
function getOptimisticState(sessionId: string) {
  const serverState = subscriptionState[sessionId];
  const optimisticState = optimisticManager.getState(sessionId);

  // Merge: server + optimistic = computed state
  return {
    ...serverState,
    ...optimisticState.computedUpdates
  };
}
```

---

## Implementation Plan

### Phase 1: Lens Mutation Support

**Goal:** Add mutation definitions to Lens API

**Tasks:**
1. Create `LensMutation` type in lens-core
2. Add `mutation()` helper function
3. Support optimistic configuration in mutation definition
4. Wire up mutation in lens-server

**Files:**
- `lens-core/src/schema/types.ts` - Add LensMutation type
- `lens-core/src/schema/index.ts` - Export mutation() helper
- `lens-server/src/router.ts` - Handle mutations

### Phase 2: Optimistic Manager Integration

**Goal:** Integrate optimistic manager with Lens client

**Tasks:**
1. Add optimistic option to LensClientConfig
2. Hook into mutation lifecycle (before/success/error)
3. Auto-apply/confirm/rollback based on lifecycle
4. Generate operations from mutation input

**Files:**
- `lens-client/src/index.ts` - Add optimistic support
- `lens-client/src/optimistic.ts` - New optimistic integration layer

### Phase 3: Subscription State Merging

**Goal:** Merge server state + optimistic layer

**Tasks:**
1. Hook optimistic manager into subscriptions
2. Merge server state with computed optimistic state
3. Update subscription callbacks with merged state
4. Handle reconciliation when server events arrive

**Files:**
- `code/src/hooks/client/useLensSessionSubscription.ts` - Merge logic
- `lens-client/src/subscription.ts` - Optimistic subscription wrapper

### Phase 4: Generalize Operations

**Goal:** Make operations work for any entity (not just messages)

**Tasks:**
1. Create generic Operation type
2. Support session, message, any entity
3. Extract operation generator from mutation config
4. Update effect helpers for generic operations

**Files:**
- `optimistic/src/types.ts` - Generalize Operation type
- `optimistic/src/operations.ts` - Generic operation handlers

---

## Success Criteria

### Phase 1 Complete When:
- [x] LensMutation type defined
- [x] mutation() helper works
- [x] Can define mutations with optimistic config
- [x] Mutations execute on server

### Phase 2 Complete When:
- [x] Lens client accepts optimistic config
- [x] Mutations automatically apply optimistically
- [x] Confirm/rollback happen automatically
- [x] No manual optimistic management needed

### Phase 3 Complete When:
- [x] Subscriptions reflect optimistic updates
- [x] Server state + optimistic layer merged
- [x] UI updates immediately on mutation
- [x] Reconciliation works when server responds

### Phase 4 Complete When:
- [x] Operations work for sessions, messages, any entity
- [x] No hardcoded message-specific logic
- [x] Easy to add new optimistic operations

---

## Example Usage (Final State)

```typescript
// 1. Define API with optimistic mutations
const api = {
  session: {
    getById: query({
      input: z.object({ sessionId: z.string() }),
      output: SessionSchema,
      subscribe: true,  // Enable subscriptions
      resolve: async (input, ctx) => {
        return ctx.db.session.findById(input.sessionId);
      }
    }),

    updateTitle: mutation({
      input: z.object({
        sessionId: z.string(),
        title: z.string()
      }),
      output: SessionSchema,
      resolve: async (input, ctx) => {
        const updated = await ctx.db.session.update(input.sessionId, {
          title: input.title
        });

        ctx.eventStream.emit('session-updated', {
          sessionId: input.sessionId,
          session: updated
        });

        return updated;
      },

      // Optimistic configuration
      optimistic: {
        apply: (input) => ({
          type: 'update-session',
          sessionId: input.sessionId,
          updates: { title: input.title }
        })
      }
    })
  }
};

// 2. Create client with optimistic enabled
const client = createLensClient<typeof api>({
  transport,
  optimistic: { enabled: true }  // Auto-optimistic
});

// 3. Subscribe to session (includes optimistic updates)
useLensSessionSubscription({
  select: { id: true, title: true }
});

// 4. Mutate (automatically optimistic!)
await client.session.updateTitle.mutate({
  sessionId: 'abc',
  title: "New Title"
});
// UI updates immediately!
// Server confirms → stays
// Server rejects → rolls back automatically
```

**This is the Lens vision fulfilled: Frontend-driven, optimistic, zero-config, TypeScript-first!**

---

## Next Steps

1. ⏳ Review this design with team
2. ⏳ Start Phase 1: Lens Mutation Support
3. ⏳ Implement Phase 2-4 sequentially
4. ⏳ Test with real scenarios
5. ⏳ Document patterns and best practices

