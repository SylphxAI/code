# Lens Resource-Based Enhancement - Implementation Plan

**Date:** 2025-01-23
**Status:** 🚧 In Progress (Phase 4 Complete)
**ADR:** [ADR-001: Resource-Based Lens Enhancement](decisions/001-resource-based-lens.md)
**Phase:** 4/6 Complete

## Progress Tracking

- ✅ **Phase 1: Core API & Registry** (Week 1) - COMPLETE
- ✅ **Phase 2: Query Planner** (Week 2) - COMPLETE
- ✅ **Phase 3: DataLoader Integration** (Week 2) - COMPLETE
- ✅ **Phase 4: Runtime API Generation** (Week 3) - COMPLETE
- ⏳ **Phase 5: Subscription Manager** (Week 3) - PENDING
- ⏳ **Phase 6: Migration & Testing** (Week 4) - PENDING

---

## Executive Summary

Transform Lens from manual subscription framework to auto-generating resource framework with:
- Declarative resource definitions (`defineResource`)
- Automatic N+1 optimization (DataLoader)
- Auto-generated CRUD + subscriptions
- Full TypeScript inference
- Zero boilerplate for new resources

**Timeline:** 4 weeks
**Effort:** 1 developer full-time
**Impact:** 90% reduction in code for new resources

---

## Goals

### Primary Goals
- ✅ Eliminate manual subscription boilerplate
- ✅ Automatic N+1 detection and batching
- ✅ Type-safe resource definitions with inference
- ✅ GraphQL-like query syntax with tRPC-style types

### Secondary Goals
- ✅ Performance same or better than manual
- ✅ Gradual migration path (no big-bang)
- ✅ Comprehensive documentation
- ✅ Production-ready by end of month

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  lensClient.message.getById({ id }, { select: ... })    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Code Generator (Phase 4)                    │
│  - Generates CRUD APIs from resource definitions         │
│  - Generates TypeScript types                            │
│  - Generates subscription handlers                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Query Planner (Phase 2)                     │
│  - Analyzes query depth                                  │
│  - Detects N+1 patterns                                  │
│  - Generates execution plan (JOIN vs batch vs lazy)      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
┌───────▼────────┐      ┌──────────▼──────────┐
│  DataLoader    │      │  Subscription Mgr   │
│  (Phase 3)     │      │  (Phase 5)          │
│  - Batching    │      │  - Auto-subscribe   │
│  - Caching     │      │  - Event merging    │
│  - Dedup       │      │  - State updates    │
└───────┬────────┘      └──────────┬──────────┘
        │                          │
        └────────────┬─────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Resource Registry (Phase 1)                 │
│  - Stores resource definitions                           │
│  - Validates relationships                               │
│  - Provides type inference                               │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Core API & Registry (Week 1)

### Objectives
- Design `defineResource()` API
- Implement resource registry
- Relationship types (`hasMany`, `belongsTo`, etc.)
- Type inference engine

### Tasks

#### 1.1 Create Package Structure
```bash
packages/lens/src/
  resource/
    define-resource.ts    # Main API
    relationships.ts      # Relationship helpers
    registry.ts          # Central registry
    types.ts             # Type definitions
    validator.ts         # Schema validation
  __tests__/
    define-resource.test.ts
```

#### 1.2 Implement `defineResource()`
```typescript
// packages/lens/src/resource/define-resource.ts
import { z, type ZodType } from 'zod';

export interface ResourceDefinition<
  TName extends string,
  TFields extends ZodType,
  TRelationships extends Record<string, Relationship>
> {
  name: TName;
  fields: TFields;
  relationships?: TRelationships;
  computed?: Record<string, ComputedField>;
  hooks?: ResourceHooks;
}

export function defineResource<
  TName extends string,
  TFields extends ZodType,
  TRelationships extends Record<string, Relationship> = {}
>(
  definition: ResourceDefinition<TName, TFields, TRelationships>
): Resource<TName, TFields, TRelationships> {
  // Validate definition
  validateResourceDefinition(definition);

  // Register in global registry
  ResourceRegistry.register(definition);

  // Return typed resource handle
  return new Resource(definition);
}
```

#### 1.3 Implement Relationship Types
```typescript
// packages/lens/src/resource/relationships.ts

export function hasMany<TTarget extends string>(
  targetResource: TTarget,
  options: {
    foreignKey: string;
    orderBy?: Record<string, 'asc' | 'desc'>;
    through?: string; // For many-to-many
  }
): HasManyRelationship<TTarget> {
  return {
    type: 'hasMany',
    target: targetResource,
    ...options,
  };
}

export function belongsTo<TTarget extends string>(
  targetResource: TTarget,
  options: {
    foreignKey: string;
  }
): BelongsToRelationship<TTarget> {
  return {
    type: 'belongsTo',
    target: targetResource,
    ...options,
  };
}

export function hasOne<TTarget extends string>(
  targetResource: TTarget,
  options: {
    foreignKey: string;
  }
): HasOneRelationship<TTarget> {
  return {
    type: 'hasOne',
    target: targetResource,
    ...options,
  };
}
```

#### 1.4 Implement Resource Registry
```typescript
// packages/lens/src/resource/registry.ts

class ResourceRegistryImpl {
  private resources = new Map<string, ResourceDefinition>();

  register<T extends ResourceDefinition>(definition: T): void {
    // Validate no duplicate names
    if (this.resources.has(definition.name)) {
      throw new Error(`Resource "${definition.name}" already registered`);
    }

    // Store definition
    this.resources.set(definition.name, definition);

    // Validate relationships after all resources registered
    this.validateRelationships(definition);
  }

  get<TName extends string>(name: TName): ResourceDefinition | undefined {
    return this.resources.get(name);
  }

  private validateRelationships(definition: ResourceDefinition): void {
    for (const [key, relationship] of Object.entries(definition.relationships || {})) {
      const target = this.resources.get(relationship.target);
      if (!target) {
        console.warn(
          `Resource "${definition.name}" has relationship "${key}" ` +
          `to undefined resource "${relationship.target}"`
        );
      }
    }
  }
}

export const ResourceRegistry = new ResourceRegistryImpl();
```

### Deliverables
- ✅ `defineResource()` API working with type inference
- ✅ Relationship helpers (`hasMany`, `belongsTo`, `hasOne`, `manyToMany`)
- ✅ Resource registry with validation
- ✅ Unit tests (>90% coverage - 60/60 passing)
- ✅ API documentation (inline JSDoc)

**Implementation:** Commit bc669c5 - 8 files, 1728 lines
**Completed:** 2025-01-23

### Success Criteria
```typescript
// This should compile with full type inference:
const Message = defineResource({
  name: 'message',
  fields: z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
  }),
  relationships: {
    steps: hasMany('step', { foreignKey: 'message_id' })
  }
});

// Type of Message.fields should be inferred
// Type of Message.relationships.steps should be inferred
```

---

## Phase 2: Query Planner (Week 2)

### Objectives
- Analyze query depth and complexity
- Detect N+1 patterns
- Generate optimal execution plan
- Choose strategy: JOIN vs batched vs lazy

### Tasks

#### 2.1 Query Depth Analyzer
```typescript
// packages/lens/src/query-planner/analyzer.ts

interface QueryAnalysis {
  depth: number;
  relationships: string[];
  estimatedQueries: number;
  hasNPlusOne: boolean;
}

export function analyzeQuery(
  resource: ResourceDefinition,
  selection: SelectionSet
): QueryAnalysis {
  let depth = 0;
  let relationships: string[] = [];

  function traverse(selection: SelectionSet, currentDepth: number) {
    depth = Math.max(depth, currentDepth);

    for (const [key, value] of Object.entries(selection)) {
      if (resource.relationships?.[key]) {
        relationships.push(key);
        if (typeof value === 'object' && value.select) {
          traverse(value.select, currentDepth + 1);
        }
      }
    }
  }

  traverse(selection, 1);

  return {
    depth,
    relationships,
    estimatedQueries: 1 + relationships.length,
    hasNPlusOne: relationships.length > 0,
  };
}
```

#### 2.2 Execution Plan Generator
```typescript
// packages/lens/src/query-planner/optimizer.ts

type ExecutionStrategy = 'join' | 'batch' | 'lazy';

interface ExecutionPlan {
  strategy: ExecutionStrategy;
  steps: QueryStep[];
}

export function generateExecutionPlan(
  resource: ResourceDefinition,
  selection: SelectionSet,
  analysis: QueryAnalysis
): ExecutionPlan {
  // Strategy decision logic
  const strategy = decideStrategy(analysis);

  // Generate steps based on strategy
  const steps = strategy === 'join'
    ? generateJoinSteps(resource, selection)
    : generateBatchSteps(resource, selection);

  return { strategy, steps };
}

function decideStrategy(analysis: QueryAnalysis): ExecutionStrategy {
  // Simple heuristics (can be improved)
  if (analysis.depth === 1) return 'join';
  if (analysis.depth <= 2 && analysis.relationships.length <= 3) return 'batch';
  return 'lazy';
}
```

#### 2.3 Query Executor
```typescript
// packages/lens/src/query-planner/executor.ts

export async function executeQuery<T>(
  plan: ExecutionPlan,
  context: QueryContext
): Promise<T> {
  const results = [];

  for (const step of plan.steps) {
    const stepResult = await executeStep(step, context);
    results.push(stepResult);
  }

  // Merge results
  return mergeResults(results, plan);
}
```

### Deliverables
- ✅ Query analyzer with depth detection
- ✅ Execution plan generator
- ✅ Query executor
- ✅ Strategy decision logic
- ✅ Unit tests (33/33 passing)
- ⏸️ Performance benchmarks (deferred to Phase 6)

**Implementation:** Commit 9fbf8ff - 7 files, 2040 lines
**Completed:** 2025-01-23

---

## Phase 3: DataLoader Integration (Week 2)

### Objectives
- Integrate DataLoader for automatic batching
- Implement per-request caching
- Deduplicate queries

### Tasks

#### 3.1 DataLoader Wrapper
```typescript
// packages/lens/src/loader/data-loader.ts
import DataLoader from 'dataloader';

export class ResourceLoader {
  private loaders = new Map<string, DataLoader<any, any>>();

  constructor(private context: LoaderContext) {}

  forResource<T>(resourceName: string): DataLoader<string, T> {
    if (!this.loaders.has(resourceName)) {
      const loader = new DataLoader<string, T>(
        async (ids) => this.batchLoad(resourceName, ids)
      );
      this.loaders.set(resourceName, loader);
    }
    return this.loaders.get(resourceName)!;
  }

  private async batchLoad(
    resourceName: string,
    ids: readonly string[]
  ): Promise<any[]> {
    // Batch query implementation
    const resource = ResourceRegistry.get(resourceName);
    const results = await this.context.db.query[resourceName].findMany({
      where: { id: { in: ids } }
    });

    // Return in same order as ids
    return ids.map(id => results.find(r => r.id === id));
  }
}
```

#### 3.2 Relationship Loader
```typescript
// packages/lens/src/loader/relationship-loader.ts

export async function loadRelationship<T>(
  parentIds: string[],
  relationship: Relationship,
  loader: ResourceLoader
): Promise<Map<string, T[]>> {
  if (relationship.type === 'hasMany') {
    return loadHasMany(parentIds, relationship, loader);
  } else if (relationship.type === 'belongsTo') {
    return loadBelongsTo(parentIds, relationship, loader);
  }
  throw new Error(`Unknown relationship type: ${relationship.type}`);
}

async function loadHasMany<T>(
  parentIds: string[],
  relationship: HasManyRelationship,
  loader: ResourceLoader
): Promise<Map<string, T[]>> {
  // Single batched query
  const results = await loader.context.db.query[relationship.target].findMany({
    where: { [relationship.foreignKey]: { in: parentIds } }
  });

  // Group by parent ID
  const grouped = new Map<string, T[]>();
  for (const result of results) {
    const parentId = result[relationship.foreignKey];
    if (!grouped.has(parentId)) {
      grouped.set(parentId, []);
    }
    grouped.get(parentId)!.push(result);
  }

  return grouped;
}
```

### Deliverables
- ✅ DataLoader integration (minimal implementation)
- ✅ Batching for hasMany/belongsTo/hasOne/manyToMany
- ✅ Per-request caching
- ✅ Deduplication logic
- ✅ Unit tests (26/26 passing, 1 skipped)
- ⏸️ Performance tests (deferred to Phase 6)

**Implementation:** Commit 52a6825 - 7 files, 1257 lines
**Completed:** 2025-01-23

---

## Phase 4: Code Generation (Week 3)

### Objectives
- Auto-generate CRUD APIs from resource definitions
- Generate TypeScript types
- Generate subscription handlers

### Tasks

#### 4.1 API Generator
```typescript
// packages/lens/src/codegen/api-generator.ts

export function generateResourceAPI<T extends ResourceDefinition>(
  resource: T
): GeneratedAPI<T> {
  return {
    // Query APIs
    getById: generateGetById(resource),
    list: generateList(resource),

    // Mutation APIs
    create: generateCreate(resource),
    update: generateUpdate(resource),
    delete: generateDelete(resource),

    // Subscription APIs (generated in Phase 5)
  };
}

function generateGetById<T extends ResourceDefinition>(
  resource: T
): QueryHandler {
  return lens
    .input(z.object({ id: z.string() }))
    .output(resource.fields.nullable())
    .query(async ({ input, ctx }) => {
      const loader = ctx.getLoader();
      return await loader.forResource(resource.name).load(input.id);
    }, async ({ input, ctx }) => {
      // Subscription handler (implemented in Phase 5)
      return subscribeToResource(resource, input.id, ctx);
    });
}
```

### Deliverables
- ✅ Runtime API generator (generateResourceAPI)
- ✅ Query handlers (getById, list) with DataLoader integration
- ✅ Mutation handlers (create, update, delete) with validation
- ✅ Lifecycle hooks (beforeCreate, afterCreate, etc.)
- ✅ Event publishing for subscriptions
- ✅ Full TypeScript type inference
- ✅ Field selection and relationship inclusion
- ✅ Unit tests (35/35 passing)

**Implementation:** Commit 86876e8 - 8 files, 1487 lines
**Completed:** 2025-01-23

**Note:** This is RUNTIME API generation (not compile-time codegen).
TypeScript-first approach with full type inference, similar to tRPC/Drizzle pattern.

---

## Phase 5: Subscription Manager (Week 3)

### Objectives
- Auto-subscribe to resource event channels
- Merge events into query cache
- Handle nested relationship updates

### Tasks

#### 5.1 Subscription Manager
```typescript
// packages/lens/src/subscription/manager.ts

export class SubscriptionManager {
  async subscribeToResource<T>(
    resource: ResourceDefinition,
    id: string,
    selection: SelectionSet,
    context: SubscriptionContext
  ): Promise<Observable<T>> {
    // Subscribe to resource channel
    const channel = `resource:${resource.name}:${id}`;

    return context.eventStream.subscribe(channel).pipe(
      startWith(null), // Trigger initial fetch
      scan((current, event) => {
        if (!current) return null;
        if (event.type === 'resource:updated') {
          return this.mergeUpdate(current, event);
        }
        return current;
      })
    );
  }

  private mergeUpdate(current: any, event: ResourceEvent): any {
    // Deep merge event changes into current state
    return {
      ...current,
      ...event.changes,
    };
  }
}
```

### Deliverables
- ✅ Subscription manager
- ✅ Event merging logic
- ✅ Nested relationship updates
- ✅ Real-time updates working

---

## Phase 6: Migration & Testing (Week 4)

### Objectives
- Migrate existing resources (session, message, step)
- Remove manual subscription code
- Comprehensive testing
- Documentation

### Tasks

#### 6.1 Migrate Existing Resources
- Convert `sessionAPI` to `defineResource`
- Convert `messageAPI` to `defineResource`
- Remove manual subscription handlers
- Update client code

#### 6.2 Testing
- Unit tests for each phase
- Integration tests
- Performance benchmarks
- N+1 elimination verification

#### 6.3 Documentation
- API reference
- Migration guide
- Best practices
- Examples

### Deliverables
- ✅ All resources migrated
- ✅ Test coverage >85%
- ✅ Performance benchmarks pass
- ✅ Documentation complete

---

## Success Metrics

### Code Reduction
- **Before:** ~200 lines per resource (manual subscription + handlers)
- **After:** ~50 lines per resource (defineResource only)
- **Target:** 75% code reduction

### Performance
- **N+1 Queries:** 0 (all automatically batched)
- **Query Time:** Same or better than manual
- **Memory:** <10% increase (caching overhead)

### Developer Experience
- **Time to Add Resource:** <30 minutes (was 2-3 hours)
- **Type Safety:** 100% (no `as` casts needed)
- **Errors:** Compile-time (not runtime)

---

## Risk Mitigation

### Risk: Performance Regression
**Mitigation:**
- Benchmark each phase
- Fallback to manual optimization
- Escape hatches for custom queries

### Risk: Migration Complexity
**Mitigation:**
- Gradual migration (resource by resource)
- Keep old APIs working during transition
- Comprehensive migration guide

### Risk: Framework Complexity
**Mitigation:**
- Extensive documentation
- Clear examples
- Internal training sessions

---

## Timeline

```
Week 1: Phase 1 (Core API & Registry)
Week 2: Phase 2-3 (Query Planner + DataLoader)
Week 3: Phase 4-5 (Code Gen + Subscriptions)
Week 4: Phase 6 (Migration + Testing)
```

**Total:** 4 weeks (160 hours)

---

## Next Steps

1. Review and approve ADR-001
2. Set up project structure
3. Start Phase 1 implementation
4. Daily standup to track progress

---

## References

- [ADR-001: Resource-Based Lens Enhancement](decisions/001-resource-based-lens.md)
- [Lens Event Design](lens-event-design.md)
- [Streaming Migration Plan](streaming-migration-plan.md)
