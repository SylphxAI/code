# Optimistic Updates: Industry Research & Optimal Design

**Date:** 2024-12-22
**Status:** 🔬 Research Complete → Design Phase

---

## Executive Summary

After thorough research of industry-leading frameworks (React Query, Apollo Client, SWR, Relay, React 19), a clear pattern emerges: **the best optimistic updates systems are mutation-centric, not centralized**.

**Key Insight:** Successful frameworks co-locate optimistic logic with mutations, not in separate configuration files.

---

## Research Findings

### 1. React Query / TanStack Query

**Architecture:**
```typescript
useMutation({
  mutationFn: updateTodo,

  // Optimistic update lifecycle
  onMutate: async (newTodo) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries({ queryKey: ['todos'] });

    // Snapshot previous state
    const previousTodos = queryClient.getQueryData(['todos']);

    // Optimistically update
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);

    // Return context for rollback
    return { previousTodos };
  },

  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos'], context.previousTodos);
  },

  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }
});
```

**Patterns:**
1. ✅ **Mutation-centric** - Optimistic logic lives with mutation definition
2. ✅ **Snapshot-restore** - Explicit rollback via context
3. ✅ **Query cancellation** - Prevents race conditions
4. ✅ **Type-safe** - Context types inferred from onMutate return
5. ✅ **Cache-aware** - Direct cache manipulation via queryClient

**DX:**
- Explicit but verbose
- Each mutation defines its own optimistic strategy
- No centralized config
- Easy to understand and debug

---

### 2. Apollo Client

**Architecture:**
```typescript
const [updateComment] = useMutation(UPDATE_COMMENT, {
  optimisticResponse: {
    updateComment: {
      id: commentId,
      __typename: "Comment",
      content: newContent,
    }
  }
});
```

**Patterns:**
1. ✅ **Inline optimistic response** - Co-located with mutation
2. ✅ **Dual-storage** - Optimistic stored separately from canonical cache
3. ✅ **Auto-rollback** - GraphQL errors automatically discard optimistic version
4. ✅ **Type-driven** - `__typename` + `id` for cache normalization
5. ✅ **Conditional updates** - Function can return `IGNORE` sentinel

**DX:**
- Simplest API surface
- Declarative optimistic response
- No manual cache manipulation (GraphQL schema handles it)
- Automatic rollback on error

---

### 3. SWR

**Architecture:**
```typescript
const { trigger } = useSWRMutation('/api/user', updateUser);

await trigger(newUser, {
  optimisticData: (currentData) => ({
    ...currentData,
    ...newUser
  }),
  rollbackOnError: true,
  populateCache: true,  // Write mutation response to cache
});
```

**Patterns:**
1. ✅ **Function-based optimistic data** - Transform current state
2. ✅ **Auto-rollback** - Built-in via rollbackOnError
3. ✅ **Cache population** - Mutation response updates cache automatically
4. ✅ **Bound mutate** - Hook returns mutate function scoped to key
5. ✅ **Concurrent-safe** - Handles overlapping mutations automatically

**DX:**
- Minimal boilerplate
- Function-based optimistic updates (flexible)
- Auto-rollback reduces error handling code
- Cache integration seamless

---

### 4. React 19 useOptimistic

**Architecture:**
```typescript
const [optimisticMessages, addOptimisticMessage] = useOptimistic(
  messages,
  (state, newMessage) => [...state, newMessage]
);

async function formAction(formData) {
  addOptimisticMessage(formData.get("message"));

  startTransition(async () => {
    await sendMessage(formData);
  });
}
```

**Patterns:**
1. ✅ **Primitive hook** - Minimal API surface
2. ✅ **Transition-aware** - Integrates with React 19 transitions
3. ✅ **Update function** - Developer defines merge logic
4. ✅ **No rollback** - Assumes success (form-centric)
5. ✅ **Zero dependencies** - Built into React

**DX:**
- Extremely simple for basic cases
- No rollback mechanism (manual implementation needed)
- Perfect for forms, limited for complex scenarios
- Predictable but low-level

---

## Pattern Synthesis

### Common Principles Across All Frameworks

#### 1. **Mutation-Centric Co-location**

❌ **NOT THIS (Centralized Config):**
```typescript
// Separate config file
const optimisticConfig = {
  'session.updateTitle': { ... },
  'session.updateStatus': { ... },
  'message.add': { ... },
  // 100+ mutations...
};
```

✅ **THIS (Co-located with Mutation):**
```typescript
// Each mutation defines its own optimistic strategy
useMutation({
  mutationFn: updateTitle,
  onMutate: async (input) => { ... }  // Right here!
});
```

**Why:** Co-location improves maintainability, discoverability, and type safety.

---

#### 2. **Snapshot-Restore Pattern**

All frameworks use this lifecycle:
1. **Before mutation:** Snapshot current state
2. **Optimistic update:** Apply changes immediately
3. **On error:** Restore snapshot
4. **On success:** Keep optimistic version or replace with server response

---

#### 3. **Type Safety via Return Types**

React Query example:
```typescript
onMutate: (newTodo) => {
  const previous = queryClient.getQueryData(['todos']);
  return { previous };  // Type inferred!
},
onError: (err, vars, context) => {
  // context.previous is type-safe!
}
```

No explicit typing needed - return type flows through lifecycle.

---

#### 4. **Explicit > Implicit**

Frameworks prefer **explicit optimistic updates** over automatic/convention-based:
- Developer declares what changes
- No magic auto-generation
- Clear rollback strategy

**Why:** Optimistic updates require domain knowledge - can't be auto-generated safely.

---

### Key Design Decisions

| Aspect | Apollo | React Query | SWR | React useOptimistic |
|--------|--------|-------------|-----|---------------------|
| **API Style** | Declarative | Imperative | Hybrid | Primitive |
| **Rollback** | Automatic | Manual via context | Automatic (opt-in) | Manual |
| **Cache Integration** | Automatic (GraphQL) | Manual (queryClient) | Automatic (mutate) | None (local state) |
| **Type Safety** | `__typename` required | Inferred from return | Generic types | Any value |
| **Complexity** | Low | Medium | Low | Minimal |
| **Flexibility** | Medium | High | Medium | High |
| **Best For** | GraphQL apps | Complex caching | Simple APIs | Forms |

---

## What Makes Optimistic Updates "Optimal"?

Based on research, an optimal system must be:

### ✅ 1. **簡單輕型** (Simple & Lightweight)

**Simple:**
- Co-located with mutations (not centralized)
- Minimal API surface (1-3 functions)
- Declarative when possible, imperative when needed

**Lightweight:**
- No large runtime overhead
- No complex state machines
- No unnecessary abstractions

**Anti-pattern:** Auto-generation, convention-based magic, centralized config

---

### ✅ 2. **高效強大** (Efficient & Powerful)

**Efficient:**
- Avoid unnecessary re-renders
- Cancel in-flight queries to prevent overwrites
- Use mutation keys to scope invalidations

**Powerful:**
- Handle concurrent mutations
- Support complex rollback scenarios
- Integrate with existing cache/state

**Key:** Power comes from composability, not features.

---

### ✅ 3. **Fine-Grained Control**

**Essential Controls:**
- When to apply optimistic update (conditional)
- How to merge optimistic data (custom logic)
- When to rollback (error types)
- When to invalidate cache (mutation relationships)

**Not needed:** Automatic detection, AI-based inference, complex DSLs

---

### ✅ 4. **Best UX**

**User Experience:**
- Immediate visual feedback (<16ms)
- Smooth rollback (no jarring changes)
- Error recovery (clear failure states)
- Consistent behavior (predictable)

---

### ✅ 5. **Best DX**

**Developer Experience:**
- Type-safe (full inference)
- Easy to debug (explicit flow)
- Easy to test (pure functions)
- Easy to maintain (co-located)

---

## Optimal Architecture for Lens

### Design Principles

Based on research, the optimal design for Lens is:

1. ✅ **Mutation-Centric** - NOT centralized config
2. ✅ **Explicit** - NOT auto-generated
3. ✅ **Composable** - NOT monolithic
4. ✅ **Type-Safe** - Full inference
5. ✅ **Effect-Based** - Pure functional (keep existing strength)

---

### Proposed Architecture: Inline Optimistic Config

```typescript
// Lens Mutation Definition with INLINE optimistic config
export const updateSessionTitle = mutation({
  input: z.object({
    sessionId: z.string(),
    title: z.string()
  }),
  output: SessionSchema,

  async resolve(input, ctx) {
    const updated = await ctx.db.session.update(input.sessionId, {
      title: input.title
    });

    ctx.eventStream.emit('session-updated', {
      sessionId: input.sessionId,
      session: updated
    });

    return updated;
  },

  // ✅ INLINE optimistic configuration
  optimistic: {
    // How to apply optimistically (receives input)
    apply: (input) => ({
      type: 'update-session-title' as const,
      sessionId: input.sessionId,
      title: input.title
    }),

    // Optional: Custom merge logic
    merge: (serverState, optimisticOp) => ({
      ...serverState,
      title: optimisticOp.title
    })
  }
});
```

---

### Client-Side Usage (Zero Config)

```typescript
// ✅ NO centralized config needed!

// Mutation automatically supports optimistic updates
const { mutate } = lensClient.session.updateTitle;

await mutate({
  sessionId: 'abc',
  title: "New Title"
  // Automatically:
  // 1. Applies optimistic update (via mutation's optimistic.apply)
  // 2. Sends to server
  // 3. Confirms or rolls back
});
```

---

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (lensClient.session.updateTitle.mutate)            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Extract optimistic config from mutation definition      │
│     config = mutation.optimistic                            │
│                                                             │
│  2. Generate operation                                      │
│     operation = config.apply(input)                         │
│     // { type: 'update-session-title', ... }                │
│                                                             │
│  3. Apply to optimistic manager                             │
│     optimisticManager.apply(sessionId, operation)           │
│     // Returns effects                                      │
│                                                             │
│  4. Execute effects                                         │
│     - PATCH_STATE (update local state)                      │
│     - SCHEDULE_TIMEOUT (auto-rollback after 10s)            │
│                                                             │
│  5. Send mutation to server                                 │
│     response = await transport.mutate(...)                  │
│                                                             │
│  6. On success:                                             │
│     optimisticManager.confirm(operationId, response)        │
│                                                             │
│     On error:                                               │
│     optimisticManager.rollback(operationId)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Integration with Subscriptions

```typescript
useLensSessionSubscription({
  select: { id: true, title: true, status: true },

  onSessionUpdated: (session) => {
    // session is MERGED:
    // - Server state (from subscription)
    // - Optimistic updates (from pending operations)

    // Example:
    // Server: { title: "Old Title" }
    // Optimistic: { title: "New Title" }
    // Merged: { title: "New Title" }  ← User sees this!
  }
});
```

**Merging Logic:**
```typescript
function getMergedState(sessionId: string) {
  const serverState = subscriptionCache.get(sessionId);
  const optimisticState = optimisticManager.getComputedState(sessionId);

  // Merge: optimistic overrides server
  return {
    ...serverState,
    ...optimisticState
  };
}
```

---

## Advantages of This Design

### ✅ 1. No Centralized Config

Each mutation defines its own optimistic strategy inline.

**Benefits:**
- Easy to discover (right next to mutation)
- Easy to maintain (change mutation = change optimistic logic together)
- Type-safe (input/output types shared)
- No giant config file

---

### ✅ 2. Explicit but Minimal

Developer explicitly defines `apply` function, but:
- No manual `confirm`/`rollback` calls (automatic)
- No manual cache management (optimistic manager handles it)
- No manual timeout handling (effect system handles it)

---

### ✅ 3. Gradual Adoption

Not all mutations need optimistic updates:
```typescript
// Mutation WITHOUT optimistic (server-only)
export const deleteSession = mutation({
  input: z.object({ sessionId: z.string() }),
  output: z.boolean(),
  resolve: async (input, ctx) => { ... }
  // No optimistic field - works fine!
});
```

Only add `optimistic` when UX needs it.

---

### ✅ 4. Type-Safe End-to-End

```typescript
// Server definition
optimistic: {
  apply: (input) => ({  // input type inferred from mutation input!
    type: 'update-session-title',
    sessionId: input.sessionId,  // ✅ Type-safe
    title: input.title            // ✅ Type-safe
  })
}

// Client usage
await mutate({
  sessionId: 'abc',  // ✅ Type-checked
  title: "New"       // ✅ Type-checked
});
```

---

### ✅ 5. Composable with Existing System

Leverages existing `OptimisticManagerV2`:
- ✅ Pure functional effect system (no changes needed)
- ✅ Timeout handling (already implemented)
- ✅ Reconciliation (already implemented)
- ✅ Rollback logic (already implemented)

**Only addition:** Extract `optimistic.apply` from mutation definition.

---

## Comparison to Previous Approaches

### ❌ Approach 1: Server-Side Config (Rejected)

```typescript
// Server defines optimistic (WRONG!)
const api = {
  session: {
    updateTitle: mutation({
      optimistic: { ... }  // ← Server shouldn't know about client optimistic!
    })
  }
};
```

**Problems:**
- Server shouldn't care about client-side optimistic logic
- Violates separation of concerns

---

### ❌ Approach 2: Centralized Client Config (Rejected)

```typescript
// Client-side centralized config (BECOMES HUGE!)
export const optimisticConfig = {
  'session.updateTitle': { ... },
  'session.updateStatus': { ... },
  'message.add': { ... },
  // 100+ mutations...
};
```

**Problems:**
- Hard to maintain (giant file)
- Hard to discover (separate from mutations)
- Not type-safe (string keys)

---

### ❌ Approach 3: Convention-Based Auto-Generation (Rejected)

```typescript
// Auto-generate from mutation name (DOESN'T WORK!)
// Convention: 'update-session-title' → auto-generate operation
```

**Problems:**
- Can't generate handlers (need explicit logic)
- SessionState is fixed structure (not generic)
- No way to know HOW to apply operation

---

### ✅ Approach 4: Inline Mutation Config (OPTIMAL!)

```typescript
// Each mutation defines its own optimistic strategy
export const updateSessionTitle = mutation({
  input: ...,
  output: ...,
  resolve: ...,

  optimistic: {  // ← Co-located, explicit, type-safe
    apply: (input) => ({ ... })
  }
});
```

**Benefits:**
- ✅ Co-located (easy to find)
- ✅ Explicit (easy to understand)
- ✅ Type-safe (input types inferred)
- ✅ No centralized config
- ✅ Gradual adoption (optional per mutation)

---

## Implementation Plan

### Phase 1: Mutation Optimistic Config Support

**Goal:** Allow mutations to define inline optimistic config

**Tasks:**
1. Add `optimistic` field to `LensMutation` type
2. Define `OptimisticConfig` interface
3. Wire up in lens-server (store config in metadata)

**Files:**
- `lens-core/src/schema/types.ts` - Add optimistic field
- `lens-core/src/schema/index.ts` - Export OptimisticConfig type

---

### Phase 2: Client-Side Optimistic Manager Integration

**Goal:** Extract optimistic config and apply automatically

**Tasks:**
1. Store mutation metadata (including optimistic config) in client
2. Hook into mutation lifecycle (before/success/error)
3. Extract `apply` function from mutation definition
4. Generate operation and pass to OptimisticManagerV2

**Files:**
- `lens-client/src/index.ts` - Mutation lifecycle hooks
- `lens-client/src/optimistic-adapter.ts` - NEW: Extract config, generate operations

---

### Phase 3: Subscription State Merging

**Goal:** Merge server state + optimistic layer in subscriptions

**Tasks:**
1. Hook optimistic manager into subscription callbacks
2. Merge server state with computed optimistic state
3. Update `useLensSessionSubscription` to return merged state

**Files:**
- `code/src/hooks/client/useLensSessionSubscription.ts` - Merge logic
- `lens-client/src/subscription.ts` - Optimistic subscription adapter

---

### Phase 4: Generalize Operations (If Needed)

**Goal:** Support any entity, not just sessions/messages

**Tasks:**
1. Analyze if current Operation types are sufficient
2. If not, create generic Operation type
3. Update effect helpers for generic operations

**Files:**
- `optimistic/src/types.ts` - Generic Operation (if needed)

---

## Success Metrics

### Implementation Complete When:

1. ✅ Mutations can define inline `optimistic` config
2. ✅ Client automatically applies optimistic updates
3. ✅ Subscriptions reflect merged state (server + optimistic)
4. ✅ Rollback works automatically on error
5. ✅ Type-safe end-to-end (input → operation → state)
6. ✅ No manual `confirm`/`rollback` calls needed
7. ✅ Zero centralized configuration

---

### UX Goals:

- Mutations feel instant (<16ms UI update)
- Smooth rollback on error (no jarring changes)
- Consistent behavior (predictable)

---

### DX Goals:

- Type-safe (full inference)
- Easy to discover (co-located with mutation)
- Easy to maintain (one place to change)
- Easy to test (pure functions)
- Optional (gradual adoption)

---

## Open Questions

### Q1: Should optimistic config be client-side or server-side?

**Answer:** Server-side definition, client-side execution.

**Rationale:**
- Mutation definition lives on server (single source of truth)
- But optimistic logic is CLIENT concern (server doesn't care)
- Solution: Server defines HOW to generate operation, client executes it

This is exactly what React Query does - mutation defined once, optimistic logic co-located.

---

### Q2: How to handle complex merge logic?

**Answer:** Optional `merge` function in optimistic config.

```typescript
optimistic: {
  apply: (input) => ({ ... }),

  // Optional: Custom merge logic
  merge: (serverState, optimisticOp) => {
    // Complex merging logic here
    return merged;
  }
}
```

Default merge: Simple spread (`{ ...serverState, ...optimisticOp }`).

---

### Q3: What about generic entities (not just sessions)?

**Answer:** Start with sessions, generalize if pattern emerges.

Current plan:
1. Implement for sessions first
2. Test with real usage
3. If pattern works, extend to messages, other entities
4. If generic pattern emerges, extract common types

**Don't over-generalize prematurely.**

---

### Q4: When NOT to use optimistic updates?

**Situations to avoid:**
- Complex server-side logic (can't predict result)
- Security-critical operations (must wait for server)
- Operations with side effects (email, payment)
- Batch operations (hard to rollback)

**When to use:**
- Simple CRUD operations
- User-initiated actions (like, save, update)
- Predictable transformations
- High-frequency updates

---

## Conclusion

### Key Takeaways from Research:

1. ✅ **Mutation-centric > Centralized config** (ALL frameworks agree)
2. ✅ **Explicit > Implicit** (No magic auto-generation)
3. ✅ **Co-location > Separation** (Easy to maintain)
4. ✅ **Type-safe > Stringly-typed** (Full inference)
5. ✅ **Composable > Monolithic** (Gradual adoption)

---

### Recommended Approach for Lens:

**Inline Optimistic Config** (Approach 4)

```typescript
export const updateSessionTitle = mutation({
  input: z.object({ sessionId: z.string(), title: z.string() }),
  output: SessionSchema,
  resolve: async (input, ctx) => { ... },

  // ✅ Co-located, explicit, type-safe
  optimistic: {
    apply: (input) => ({
      type: 'update-session-title',
      sessionId: input.sessionId,
      title: input.title
    })
  }
});
```

**Why this is optimal:**
- 簡單輕型 (Simple & Lightweight) - Minimal API, no centralized config
- 高效強大 (Efficient & Powerful) - Leverages existing effect system
- Fine-grained - Per-mutation control
- Best UX - Immediate updates, smooth rollback
- Best DX - Type-safe, co-located, easy to maintain

---

### Next Steps:

1. ✅ Research complete (this document)
2. ⏳ Validate design with user
3. ⏳ Implement Phase 1-3
4. ⏳ Test with real scenarios
5. ⏳ Document patterns

---

**This design aligns with Lens's core philosophy: Frontend-driven, TypeScript-first, zero-config, optimal architecture.**
