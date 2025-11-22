# 014. Framework Principles: What vs How Separation

**Status:** ✅ Accepted
**Date:** 2024-12-22

## Context

During Phase 6-7 implementation of the fine-grained roadmap, we encountered a fundamental question: "點解要限制？我地係fine grained reactive, 又唔係pooling" (Why limit? We're fine-grained reactive, not polling).

This challenged the assumption that "fine-grained frontend-driven" means "frontend controls everything including implementation details."

### The Original Misconception

We initially planned:
- Phase 5: Field selection (What data) ✅ Correct
- Phase 6: Update strategies (How to transmit) ❓ Questionable
- Phase 7: Throttle/debounce (How often) ❌ Wrong - Violates reactive principle

This blurred the line between **requirements** (What) and **implementation** (How).

## Decision

**Fine-grained frontend-driven means: Frontend has precise control of WHAT it needs, not HOW it's implemented.**

We establish four core principles:

### 1. Frontend-Driven Requirements (Not Implementation)

```typescript
// ✅ What (Frontend Requirement)
lensClient.session.getById.subscribe(
  { sessionId: 'abc' },
  {
    select: {              // What data I need
      id: true,
      title: true,
      status: true,
    }
  }
);

// ❌ How (Implementation Detail - Backend's job)
{
  updateMode: 'delta',     // HOW to transmit
  throttle: 1000,          // HOW often to emit
  compression: 'gzip',     // HOW to compress
}
```

### 2. TypeScript-First Intelligence

Type inference replaces manual configuration. The type system does the work.

```typescript
const session = await lensClient.session.getById.query(
  { sessionId: 'abc' },
  { select: { id: true, title: true } }
);
// session.id ✅ Available
// session.messages ❌ Type error - not selected
```

### 3. Fine-Grained Reactivity

Event-driven server push. Not polling. Not client-side throttling.

- Server emits when state changes (meaningful updates)
- Frontend receives updates reactively
- If server emits too frequently → fix server logic
- No need for client-side throttle/debounce

### 4. Zero Configuration Default

Best practices are automatic, not configured.

- Backend auto-optimizes transmission strategy (delta for strings, patch for objects)
- Backend auto-throttles if emitting too frequently
- Backend auto-compresses large payloads
- Frontend only configures when truly needed (rare)

## Rationale

### Inspiration: GraphQL

GraphQL gets this right:
- ✅ Frontend specifies: which resource, which fields
- ❌ Frontend doesn't specify: HTTP/2, serialization, batching, caching

GraphQL is frontend-driven for **requirements**, not **implementation**.

### Backend Has Better Information

Backend knows:
- Field types (string → delta, object → patch)
- Update patterns (rapid → debounce)
- Payload sizes (large → compression)
- Network conditions (slow → adaptive)

Frontend doesn't know these details and shouldn't need to.

### Maintainability

Implementation details change. Requirements don't.

```typescript
// Requirements stable over time
{ select: { id: true, title: true } }

// Implementation evolves
// v1: JSON → v2: MessagePack → v3: Protobuf
// Frontend code unchanged ✅
```

## Consequences

### Positive

- **Simpler API**: Fewer parameters, less configuration
- **Better Defaults**: Backend auto-optimizes transparently
- **Maintainable**: Implementation can evolve without frontend changes
- **True Fine-Grained**: Precise control of data needs, not transmission details
- **Aligned with Principles**: Reactive, TypeScript-first, zero-config

### Negative

- **Less Control**: Advanced users can't override optimization (mitigated by providing escape hatch if truly needed)
- **Backend Complexity**: Backend must implement intelligent auto-optimization
- **Trust Required**: Frontend trusts backend to optimize correctly

### Action Items

1. **Phase 6 Decision**: Remove `updateMode` parameter or change to `priority` preference
2. **Phase 7 Cancelled**: Throttle/debounce violates reactive principle
3. **Documentation**: Update FINE_GRAINED_ROADMAP.md ✅ Complete
4. **Hook API**: Review `useLensSessionSubscription` parameters
5. **ADR-013**: Update if field selection philosophy clarified

## References

- Implementation: `packages/code/src/hooks/client/useLensSessionSubscription.ts`
- Roadmap: `FINE_GRAINED_ROADMAP.md`
- Related: ADR-013 (Field Selection)
- Inspiration: GraphQL specification (query language for APIs)
