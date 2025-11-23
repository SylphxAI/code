# 001. Resource-Based Lens Enhancement

**Status:** 🚧 Proposed
**Date:** 2025-01-23

## Context

Current Lens implementation requires manual subscription handling, state merging, and relationship resolution. Each resource (session, message, step) needs custom subscription logic with RxJS operators. This creates boilerplate, prevents automatic N+1 optimization, and makes nested queries difficult.

## Decision

Enhance Lens framework with resource-based auto-generation inspired by Prisma + GraphQL + tRPC patterns. Introduce `defineResource()` API that declaratively defines resources with fields, relationships, and generates fully-typed APIs with automatic query optimization.

## Rationale

**Eliminates Boilerplate:**
- No manual subscription handlers
- No manual state merging (scan operators)
- No manual relationship resolution
- Auto-generated CRUD + subscriptions

**Type Safety:**
- Full TypeScript inference from resource definition
- Compile-time relationship validation
- IDE autocomplete for nested queries

**Performance:**
- Automatic N+1 detection and batching
- Automatic depth optimization
- Automatic query planning
- DataLoader pattern built-in

**Developer Experience:**
- Declarative resource definitions
- GraphQL-like query syntax
- Framework handles complexity
- Single source of truth

## Proposed API

### Resource Definition

```typescript
import { defineResource, z } from '@sylphx/lens';

export const MessageResource = defineResource({
  name: 'message',

  fields: z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    status: z.enum(['active', 'completed', 'error']),
    createdAt: z.date(),
  }),

  relationships: {
    session: belongsTo('session', {
      foreignKey: 'session_id',
    }),
    steps: hasMany('step', {
      foreignKey: 'message_id',
      orderBy: { stepIndex: 'asc' },
    }),
  },

  // Optional: Custom resolvers for computed fields
  computed: {
    totalTokens: async (message, ctx) => {
      const steps = await ctx.loader.loadMany('step', { message_id: message.id });
      return steps.reduce((sum, step) => sum + (step.tokens || 0), 0);
    },
  },
});
```

### Auto-Generated APIs

```typescript
// Query - auto-generated
const message = await lensClient.message.getById({ id: 'msg-123' });

// Query with selection - auto-generated
const message = await lensClient.message.getById(
  { id: 'msg-123' },
  {
    select: {
      id: true,
      role: true,
      steps: {
        select: {
          id: true,
          parts: true, // Nested relationship
        },
      },
    },
  }
);

// Subscription - auto-generated
const subscription = lensClient.message.getById.subscribe(
  { id: 'msg-123' },
  { select: { steps: { select: { parts: true } } } },
  {
    onData: (message) => console.log('Updated:', message),
  }
);

// List query - auto-generated
const messages = await lensClient.message.list({
  where: { session_id: 'session-123', status: 'completed' },
  orderBy: { createdAt: 'desc' },
  limit: 20,
});

// Mutation - auto-generated
const updated = await lensClient.message.update({
  where: { id: 'msg-123' },
  data: { status: 'completed' },
});
```

### Automatic N+1 Optimization

```typescript
// User code - simple and declarative
const messages = await lensClient.message.list({
  where: { session_id: 'session-123' },
  select: {
    id: true,
    steps: {
      select: {
        id: true,
        parts: true,
      },
    },
  },
});

// Framework auto-generates optimized queries:
// Query 1: SELECT * FROM messages WHERE session_id = 'session-123'
// Query 2: SELECT * FROM steps WHERE message_id IN ('msg-1', 'msg-2', 'msg-3') ORDER BY message_id, step_index
// Query 3: SELECT * FROM step_parts WHERE step_id IN ('step-1', 'step-2', ...) ORDER BY step_id, ordering

// Total: 3 queries (not 1 + N + N*M)
// Batched with DataLoader pattern
```

## Architecture

### Core Components

1. **Resource Registry**
   - Central registry of all defined resources
   - Validates relationships at registration time
   - Provides type inference for cross-resource queries

2. **Query Planner**
   - Analyzes query depth and relationships
   - Generates optimal query execution plan
   - Decides: JOIN vs batched queries vs lazy loading

3. **DataLoader Integration**
   - Automatic batching for relationship loading
   - Per-request caching
   - Deduplication

4. **Subscription Manager**
   - Auto-subscribes to relevant event channels
   - Auto-merges updates into cached state
   - Handles nested relationship updates

5. **Code Generator**
   - Generates fully-typed CRUD APIs
   - Generates subscription APIs
   - Generates TypeScript types from resource definitions

### Event Architecture

Resources publish fine-grained events to specific channels:

```typescript
// Resource: message
// Channel: `resource:message:${id}`
// Events:
{
  type: 'resource:updated',
  resource: 'message',
  id: 'msg-123',
  changes: {
    status: { old: 'active', new: 'completed' }
  }
}

// Nested resources publish to both channels:
// 1. Own channel: `resource:step:${stepId}`
// 2. Parent channel: `resource:message:${messageId}` with relationship info
```

Lens automatically:
- Subscribes to relevant channels based on query selection
- Merges events into cached query results
- Re-renders components with updated data

## Implementation Plan

### Phase 1: Core API Design (Week 1)

**Deliverables:**
- `defineResource()` API specification
- Relationship types: `hasMany`, `belongsTo`, `hasOne`, `manyToMany`
- Resource registry implementation
- Type inference engine

**Files:**
- `packages/lens/src/resource/define-resource.ts`
- `packages/lens/src/resource/relationships.ts`
- `packages/lens/src/resource/registry.ts`
- `packages/lens/src/resource/types.ts`

### Phase 2: Query Planner (Week 2)

**Deliverables:**
- Query depth analyzer
- JOIN vs batch decision logic
- Query execution plan generator
- Integration with existing query system

**Files:**
- `packages/lens/src/query-planner/analyzer.ts`
- `packages/lens/src/query-planner/optimizer.ts`
- `packages/lens/src/query-planner/executor.ts`

### Phase 3: DataLoader Integration (Week 2)

**Deliverables:**
- DataLoader wrapper for Lens
- Automatic batching for relationships
- Per-request cache
- Deduplication logic

**Files:**
- `packages/lens/src/loader/data-loader.ts`
- `packages/lens/src/loader/batch-fn.ts`
- `packages/lens/src/loader/cache.ts`

### Phase 4: Code Generation (Week 3)

**Deliverables:**
- CRUD API generator
- Subscription API generator
- TypeScript type generator
- Client API generator

**Files:**
- `packages/lens/src/codegen/api-generator.ts`
- `packages/lens/src/codegen/type-generator.ts`
- `packages/lens/src/codegen/client-generator.ts`

### Phase 5: Subscription Manager (Week 3)

**Deliverables:**
- Auto-subscription to resource channels
- Event merging into query cache
- Nested relationship update handling
- Optimistic update support

**Files:**
- `packages/lens/src/subscription/manager.ts`
- `packages/lens/src/subscription/event-merger.ts`
- `packages/lens/src/subscription/cache.ts`

### Phase 6: Migration & Testing (Week 4)

**Deliverables:**
- Migrate existing resources (session, message, step)
- Remove manual subscription code
- Integration tests
- Performance benchmarks
- Documentation

**Files:**
- Migration of existing code
- Test suites
- Benchmarks
- Docs

## Consequences

### Positive

**Developer Productivity:**
- 90% reduction in boilerplate for new resources
- Type-safe by default
- No manual optimization needed

**Performance:**
- Automatic N+1 elimination
- Optimal query plans
- Consistent caching strategy

**Maintainability:**
- Single source of truth (resource definitions)
- Centralized optimization logic
- Easier to reason about

**Scalability:**
- Framework optimizes as app grows
- No per-resource performance tuning
- Consistent patterns

### Negative

**Initial Complexity:**
- Framework becomes more complex
- Higher learning curve for contributors
- More abstraction layers

**Migration Effort:**
- Need to migrate existing code
- Potential breaking changes
- Testing overhead

**Framework Lock-in:**
- More opinionated than current approach
- Harder to customize individual resources
- Framework updates affect all resources

**Performance Edge Cases:**
- Auto-optimization may not always be optimal
- Need escape hatches for custom queries
- Complex relationships may need manual tuning

## Alternatives Considered

### Alternative 1: Keep Current Manual Approach

**Pros:** Simple, explicit, no framework changes
**Cons:** Boilerplate, no auto-optimization, error-prone

**Decision:** Rejected - doesn't scale, violates DRY

### Alternative 2: Use Existing ORM (Prisma/Drizzle)

**Pros:** Mature, well-tested, large community
**Cons:** No subscription support, no type-safe client generation, no event integration

**Decision:** Rejected - doesn't solve our core problems

### Alternative 3: GraphQL Server + Client

**Pros:** Industry standard, mature tooling, N+1 solved
**Cons:** Separate schema, no TypeScript inference, heavyweight, no native subscriptions

**Decision:** Rejected - too much overhead, loses tRPC-style inference

## Open Questions

1. **Custom Query Functions:**
   - How to allow custom queries while maintaining auto-optimization?
   - Escape hatch API design?

2. **Deeply Nested Queries:**
   - What's the depth limit?
   - How to prevent over-fetching?
   - Performance monitoring?

3. **Real-time Consistency:**
   - How to handle race conditions in subscriptions?
   - Optimistic update conflicts?
   - Event ordering guarantees?

4. **Migration Strategy:**
   - Gradual migration or big-bang?
   - Backward compatibility?
   - Deprecation timeline?

## Success Criteria

- ✅ Zero manual subscription handlers for new resources
- ✅ Automatic N+1 elimination (verified with benchmarks)
- ✅ <100 lines of code to add fully-featured resource
- ✅ Full TypeScript inference (no `as` casts)
- ✅ Performance same or better than manual approach
- ✅ All existing functionality works with new system

## References

- Implementation: `packages/lens/src/resource/` (to be created)
- Inspiration: Prisma schema, GraphQL resolvers, tRPC inference
- Related: `.sylphx/lens-event-design.md`, `.sylphx/streaming-migration-plan.md`
