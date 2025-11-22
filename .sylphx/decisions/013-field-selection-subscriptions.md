# 013. Frontend-Driven Field Selection for Subscriptions

**Status:** 🚧 Proposed
**Date:** 2024-12-22

## Context

Phase 4 established Lens-based subscriptions for session metadata, but currently fetches the entire session model on every update. This leads to over-fetching:

**Current behavior:**
```typescript
// Frontend receives full session model on every update
{
  id: "abc",
  title: "Chat session",
  status: { text: "active", duration: 1234, ... },
  totalTokens: 5000,
  messages: [...],  // Large array (not needed for metadata updates)
  todos: [...],      // Large array (not needed for metadata updates)
  // ... all other fields
}
```

**Problems:**
- Over-fetching: Receives `messages` and `todos` arrays even when only monitoring title/status
- Bandwidth waste: Full model transmitted on every update
- Inefficient: No control over what data to receive

**Goal:** Enable GraphQL-like field selection where frontend controls exactly which fields to receive.

## Decision

Implement **frontend-driven field selection** at three layers:

### 1. Transport Layer (Lens Core)

Add `select` parameter to transport interface:

```typescript
// packages/lens-core/src/transport/interface.ts
export interface LensTransport {
  subscribe<T>(
    request: LensRequest,
    options?: {
      select?: FieldSelection<T>;  // ← NEW
      updateMode?: UpdateMode;
    }
  ): Observable<Partial<T>>;
}
```

### 2. API Layer (Code API)

Subscribe handlers receive `select` from context:

```typescript
// packages/code-api/src/api.ts
session: lens.object({
  getById: lens
    .input(z.object({ sessionId: z.string() }))
    .output(SessionSchema.nullable())
    .query(
      async ({ input, ctx }) => { /* ... */ },
      ({ input, ctx, select }): Observable<Partial<Session>> => {
        return ctx.eventStream
          .subscribe(`session:${input.sessionId}`)
          .pipe(
            map(event => {
              const session = event.payload.session;
              // Apply field selection if provided
              return select ? applyFieldSelection(session, select) : session;
            })
          );
      }
    ),
}),
```

### 3. Hook Layer (Frontend)

Hooks accept `select` parameter:

```typescript
// packages/code/src/hooks/client/useLensSessionSubscription.ts
useLensSessionSubscription({
  select: {
    id: true,
    title: true,
    status: true,
    totalTokens: true,
    // messages: false  ← Explicitly exclude
    // todos: false     ← Explicitly exclude
  },
  onSessionUpdated: (session) => {
    // session is now Partial<Session> with only selected fields
  }
});
```

## Rationale

**Why frontend-driven?**
- Frontend knows what it needs (e.g., status bar only needs title/status)
- Different UI components need different fields
- Aligns with fine-grained architecture goal

**Why GraphQL-like selection?**
- Familiar pattern for developers
- Type-safe with TypeScript inference
- Explicit opt-in (select what you need)

**Why not server-driven?**
- Server doesn't know frontend requirements
- Would require multiple API endpoints for different use cases
- Violates frontend-driven architecture principle

## Implementation Plan

### Phase 5a: Type System
- [ ] Define `FieldSelection<T>` type in lens-core
- [ ] Define `Selected<T, S>` type for type narrowing
- [ ] Implement `applyFieldSelection()` utility

### Phase 5b: Transport Layer
- [ ] Update `LensTransport` interface
- [ ] Implement in `InProcessTransport`
- [ ] Implement in `HTTPTransport`
- [ ] Implement in `WebSocketTransport`
- [ ] Implement in `SSETransport`

### Phase 5c: API Layer
- [ ] Update subscribe handler signature to include `select`
- [ ] Apply field selection in `session.getById.subscribe`
- [ ] Test with selected vs full model

### Phase 5d: Client Layer
- [ ] Update lens client to pass `select` to transport
- [ ] Ensure type inference works (autocomplete for fields)

### Phase 5e: Hook Layer
- [ ] Add `select` parameter to `useLensSessionSubscription`
- [ ] Update type to return `Partial<Session>` based on selection
- [ ] Test in Chat component

## Consequences

### Positive
- ✅ **Bandwidth savings**: Only transmit needed fields (50-90% reduction)
- ✅ **Type safety**: TypeScript narrows type based on selection
- ✅ **Developer experience**: Autocomplete for field selection
- ✅ **Flexibility**: Different components select different fields
- ✅ **Foundation for Phase 6**: Update strategies per field

### Negative
- ⚠️ **Complexity**: More API surface area
- ⚠️ **Type inference**: Complex TypeScript types needed
- ⚠️ **Testing**: Need to test all selection combinations

### Mitigations
- Keep selection optional (defaults to full model)
- Provide type helpers for common selections
- Document common patterns
- Comprehensive test coverage

## Alternatives Considered

### Alternative 1: Multiple API Endpoints
```typescript
// Separate endpoints for different data needs
session.getMetadata()  // Only title, status, tokens
session.getFull()      // Everything
```

**Rejected:** Not scalable, violates DRY, frontend loses control

### Alternative 2: Server-Side Optimization
```typescript
// Server automatically excludes large fields
subscribe() {
  // Server decides to exclude messages/todos
}
```

**Rejected:** Server doesn't know frontend needs, violates frontend-driven principle

### Alternative 3: Post-Fetch Filtering
```typescript
// Client receives full model, filters locally
const session = await client.session.getById.subscribe({ sessionId });
const filtered = { id: session.id, title: session.title };
```

**Rejected:** Still transmits unnecessary data, wastes bandwidth

## References

- **Implementation**: Phase 5 steps in FINE_GRAINED_ROADMAP.md
- **Related ADR**: ADR-009 (Lens Framework Integration)
- **Inspiration**: GraphQL field selection, Prisma select
- **Lens Architecture**: `/Users/kyle/lens/.sylphx/architecture.md`

## Type System Example

```typescript
// Type-safe field selection with inference
type FieldSelection<T> = {
  [K in keyof T]?: boolean | (T[K] extends object ? FieldSelection<T[K]> : boolean);
};

type Selected<T, S> = S extends FieldSelection<T>
  ? {
      [K in keyof S & keyof T as S[K] extends true ? K : never]: T[K];
    }
  : T;

// Usage with full type inference
const session = await lensClient.session.getById.subscribe(
  { sessionId: 'abc' },
  {
    select: {
      id: true,
      title: true,
      status: {
        text: true,
        duration: true,
        // tokenUsage: false  ← Excluded
      }
    }
  }
);

// Type is automatically narrowed:
// session: {
//   id: string;
//   title: string;
//   status: {
//     text: string;
//     duration: number;
//   };
// }
```

## Success Criteria

- [ ] Field selection works for session subscriptions
- [ ] Type inference provides autocomplete
- [ ] Bandwidth reduction measurable (>50%)
- [ ] All transports support field selection
- [ ] Tests cover common selection patterns
- [ ] Documentation with examples

---

**Next Steps:**
1. Implement type system (Phase 5a)
2. Update transport layer (Phase 5b)
3. Modify API subscribe handlers (Phase 5c)
4. Test and validate (Phase 5d-e)
