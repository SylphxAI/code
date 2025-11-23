# Lens Resource Framework

TypeScript-first declarative resource framework with automatic N+1 optimization, real-time subscriptions, and full type inference.

## Features

✨ **Declarative Resources** - Define once, generate complete APIs
🚀 **Auto-generated CRUD** - getById, list, create, update, delete
🔄 **Real-time Subscriptions** - Observable-based reactive updates
⚡ **N+1 Elimination** - Automatic batching via DataLoader
🎯 **Full Type Inference** - TypeScript types from Zod schemas
🪝 **Lifecycle Hooks** - before/after create/update/delete
📊 **Query Planning** - Optimal execution strategy selection
💾 **Per-request Caching** - Automatic deduplication

**Code Reduction: 75%** (from ~200 lines to ~50 lines per resource)

---

## Quick Start

```bash
bun add @sylphx/lens zod rxjs
```

```typescript
import { defineResource, hasMany, belongsTo } from '@sylphx/lens/resource';
import { generateResourceAPI } from '@sylphx/lens/codegen';
import { z } from 'zod';

// 1. Define resources
const Message = defineResource({
  name: 'message',
  fields: z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  }),
  relationships: {
    steps: hasMany('step', { foreignKey: 'message_id' }),
  },
});

const Step = defineResource({
  name: 'step',
  fields: z.object({
    id: z.string(),
    message_id: z.string(),
    type: z.string(),
  }),
  relationships: {
    message: belongsTo('message', { foreignKey: 'message_id' }),
  },
});

// 2. Generate API
const messageAPI = generateResourceAPI(Message.definition);

// 3. Use it!
const message = await messageAPI.getById.query(
  { id: 'msg-1' },
  { include: { steps: true } },  // Auto-loads relationships
  ctx
);

const created = await messageAPI.create(
  { role: 'user', content: 'Hello' },
  {},
  ctx
);

// Subscribe to real-time updates
messageAPI.getById.subscribe(
  { id: 'msg-1' },
  {},
  {
    onData: (msg) => console.log('Updated:', msg),
  },
  ctx
);
```

---

## Core Concepts

### Resources

Resources represent domain entities with fields and relationships.

```typescript
const User = defineResource({
  name: 'user',
  fields: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
  }),
  relationships: {
    posts: hasMany('post', { foreignKey: 'user_id' }),
    profile: hasOne('profile', { foreignKey: 'user_id' }),
  },
  computed: {
    displayName: (user) => user.name || user.email,
  },
  hooks: {
    beforeCreate: async (data) => {
      data.email = data.email.toLowerCase();
      return data;
    },
  },
});
```

### Relationships

Four relationship types:

```typescript
// 1:N - One user has many posts
hasMany('post', { foreignKey: 'user_id' })

// N:1 - Post belongs to one user
belongsTo('user', { foreignKey: 'user_id' })

// 1:1 - User has one profile
hasOne('profile', { foreignKey: 'user_id' })

// N:M - Post has many tags via junction table
manyToMany('tag', {
  through: 'post_tags',
  foreignKey: 'post_id',
  targetForeignKey: 'tag_id',
})
```

### Generated APIs

Each resource gets complete CRUD + subscriptions:

```typescript
interface GeneratedAPI<T> {
  // Queries
  getById: {
    query: (input, options, ctx) => Promise<T | null>;
    subscribe: (input, options, handlers, ctx) => Subscription;
  };
  list: {
    query: (options, ctx) => Promise<T[]>;
    subscribe: (options, handlers, ctx) => Subscription;
  };

  // Mutations
  create: (data, options, ctx) => Promise<T>;
  update: (where, data, options, ctx) => Promise<T>;
  delete: (where, options, ctx) => Promise<void>;
}
```

### Query Options

```typescript
// Field selection
const message = await messageAPI.getById.query(
  { id: 'msg-1' },
  {
    select: {
      id: true,
      content: true,
      // Other fields excluded
    },
  },
  ctx
);

// Relationship inclusion
const message = await messageAPI.getById.query(
  { id: 'msg-1' },
  {
    include: {
      steps: true,  // Loads related steps
      session: true,  // Loads related session
    },
  },
  ctx
);

// List with filters
const messages = await messageAPI.list.query(
  {
    where: { role: 'user' },
    orderBy: { created_at: 'desc' },
    limit: 10,
    offset: 0,
  },
  {},
  ctx
);
```

### Subscriptions

Real-time updates with RxJS Observables:

```typescript
const subscription = messageAPI.getById.subscribe(
  { id: 'msg-1' },
  { include: { steps: true } },
  {
    onData: (message) => {
      // Emitted on initial load and every update
      console.log('Current:', message);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
    onComplete: () => {
      console.log('Subscription complete');
    },
  },
  ctx
);

// Cleanup
subscription.unsubscribe();
```

### Lifecycle Hooks

Intercept and transform operations:

```typescript
const Message = defineResource({
  name: 'message',
  fields: z.object({ id: z.string(), content: z.string() }),
  hooks: {
    beforeCreate: async (data) => {
      // Transform before creation
      return { ...data, content: sanitize(data.content) };
    },
    afterCreate: async (entity) => {
      // Side effects after creation
      await sendNotification(entity);
    },
    beforeUpdate: async (id, data) => {
      // Validate before update
      await checkPermissions(id);
      return data;
    },
    afterUpdate: async (entity) => {
      // Side effects after update
      await invalidateCache(entity);
    },
    beforeDelete: async (id) => {
      // Cleanup before deletion
      await archiveData(id);
    },
    afterDelete: async (id) => {
      // Cleanup after deletion
      await removeRelatedData(id);
    },
  },
});
```

---

## Performance

### Automatic N+1 Elimination

Without Lens:
```typescript
// 1 + N queries
const messages = await db.message.findMany();  // 1 query
for (const message of messages) {
  message.steps = await db.step.findMany({  // N queries
    where: { message_id: message.id }
  });
}
```

With Lens:
```typescript
// 2 queries total
const messages = await messageAPI.list.query(
  {},
  { include: { steps: true } },  // Automatically batched
  ctx
);
// 1 query for messages + 1 batched query for all steps
```

### Caching

Per-request caching prevents duplicate queries:

```typescript
// These 3 loads are batched into 1 query
const [m1, m2, m3] = await Promise.all([
  messageAPI.getById.query({ id: 'msg-1' }, {}, ctx),
  messageAPI.getById.query({ id: 'msg-2' }, {}, ctx),
  messageAPI.getById.query({ id: 'msg-3' }, {}, ctx),
]);

// Subsequent loads return cached value
const cached = await messageAPI.getById.query({ id: 'msg-1' }, {}, ctx);
// No database query - returns cached instance
```

### Query Planning

Automatic strategy selection:

- **JOIN**: Shallow queries, simple relationships
- **BATCH**: N+1 patterns, moderate complexity
- **LAZY**: Deep nesting (3+ levels), high complexity

```typescript
import { analyzeQuery, decideStrategy } from '@sylphx/lens/query-planner';

const analysis = analyzeQuery(Message.definition, selection);
console.log({
  depth: analysis.depth,
  hasNPlusOne: analysis.hasNPlusOne,
  estimatedQueries: analysis.estimatedQueries,
});

const strategy = decideStrategy(analysis);
// 'join' | 'batch' | 'lazy'
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer                │
│  messageAPI.getById.query(...)          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        Code Generator                    │
│  - Generates CRUD from definitions      │
│  - Type-safe handlers                   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        Query Planner                     │
│  - Analyzes depth & N+1 patterns        │
│  - Selects optimal strategy             │
└──────────────────┬──────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
┌──────▼───────┐      ┌───────▼────────┐
│  DataLoader  │      │  Subscription  │
│  - Batching  │      │  - Real-time   │
│  - Caching   │      │  - Events      │
└──────┬───────┘      └───────┬────────┘
       │                      │
       └──────────┬───────────┘
                  │
┌─────────────────▼─────────────────────┐
│       Resource Registry                │
│  - Stores definitions                  │
│  - Validates relationships             │
└────────────────────────────────────────┘
```

---

## Migration

See [MIGRATION.md](./MIGRATION.md) for complete migration guide.

**Summary:**
1. Define resources with `defineResource()`
2. Generate APIs with `generateResourceAPI()`
3. Replace manual handlers
4. Remove manual subscriptions
5. Test and deploy

**Before:** ~200 lines per resource
**After:** ~50 lines per resource
**Savings:** 75% code reduction

---

## Examples

See [examples/](./examples/) for:
- Basic CRUD operations
- Relationship loading
- Subscriptions
- Hooks and computed fields
- Performance optimization

---

## API Reference

### Resource Definition

```typescript
defineResource<TName, TFields, TRelationships>({
  name: string;
  fields: ZodType;
  relationships?: Record<string, Relationship>;
  computed?: Record<string, ComputedField>;
  hooks?: ResourceHooks;
  tableName?: string;
})
```

### API Generation

```typescript
generateResourceAPI<T>(resource: ResourceDefinition<T>)
generateAllAPIs<T>(resources: ResourceDefinition<T>[])
```

### Query Planner

```typescript
analyzeQuery(resource, selection): QueryAnalysis
generateExecutionPlan(resource, selection, analysis): ExecutionPlan
decideStrategy(analysis): ExecutionStrategy
executeQuery(plan, context): Promise<ExecutionResult>
```

### DataLoader

```typescript
createLoader(db): ResourceLoader
loader.load<T>(resourceName, id): Promise<T | null>
loader.loadMany<T>(resourceName, ids): Promise<(T | null)[]>
loader.loadByField<T>(resourceName, field, values): Promise<Map<any, T[]>>
loader.prime<T>(resourceName, id, value): void
loader.clear(resourceName, id?): void
```

### Subscriptions

```typescript
SubscriptionManager()
manager.subscribeToResource<T>(resource, id, options, context): Observable<T | null>
manager.subscribeToList<T>(resource, options, context): Observable<T[]>
```

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

---

## License

MIT
