# Migration Guide: Resource-Based Lens

Complete guide for migrating from manual APIs to resource-based declarative APIs.

## Overview

The resource-based system eliminates manual subscription boilerplate through:
- Declarative resource definitions
- Auto-generated CRUD APIs
- Automatic N+1 optimization
- Real-time subscriptions
- Full TypeScript inference

**Code Reduction: 75%** (from ~200 lines to ~50 lines per resource)

---

## Quick Comparison

### Before (Manual)
```typescript
// Define types manually
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Create API handlers manually
const messageAPI = lens.router({
  getById: lens.procedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ id: z.string(), role: z.enum(['user', 'assistant']), content: z.string() }).nullable())
    .query(async ({ input, ctx }) => {
      return await ctx.db.message.findUnique({ where: { id: input.id } });
    })
    .subscribe(async ({ input, ctx }) => {
      // Manual subscription setup
      const channel = `message:${input.id}`;
      return ctx.eventStream.subscribe(channel).pipe(
        startWith(null),
        switchMap(() => ctx.db.message.findUnique({ where: { id: input.id } }))
      );
    }),

  list: lens.procedure
    // ... more boilerplate ...

  create: lens.procedure
    // ... more boilerplate ...
});
```

### After (Resource-Based)
```typescript
// Define resource once
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

// Generate complete API automatically
const messageAPI = generateResourceAPI(Message.definition);

// That's it! Full CRUD + subscriptions generated
```

---

## Step-by-Step Migration

### Step 1: Install Dependencies

```bash
bun add zod rxjs  # If not already installed
```

### Step 2: Define Resources

Create resource definitions for your entities:

```typescript
// resources/message.ts
import { defineResource } from '@sylphx/lens/resource';
import { hasMany, belongsTo } from '@sylphx/lens/resource';
import { z } from 'zod';

export const Message = defineResource({
  name: 'message',
  fields: z.object({
    id: z.string(),
    session_id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    created_at: z.date(),
    updated_at: z.date(),
  }),
  relationships: {
    session: belongsTo('session', { foreignKey: 'session_id' }),
    steps: hasMany('step', { foreignKey: 'message_id', orderBy: { created_at: 'asc' } }),
  },
  hooks: {
    beforeCreate: async (data) => {
      // Auto-set timestamps
      return {
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      };
    },
    beforeUpdate: async (id, data) => {
      // Auto-update timestamp
      return {
        ...data,
        updated_at: new Date(),
      };
    },
  },
});
```

```typescript
// resources/step.ts
export const Step = defineResource({
  name: 'step',
  fields: z.object({
    id: z.string(),
    message_id: z.string(),
    type: z.enum(['thinking', 'action', 'observation']),
    output: z.string(),
    created_at: z.date(),
  }),
  relationships: {
    message: belongsTo('message', { foreignKey: 'message_id' }),
  },
});
```

### Step 3: Generate APIs

```typescript
// api/index.ts
import { generateResourceAPI, generateAllAPIs } from '@sylphx/lens/codegen';
import { Message, Step, Session } from '../resources';

// Generate individual APIs
export const messageAPI = generateResourceAPI(Message.definition);
export const stepAPI = generateResourceAPI(Step.definition);
export const sessionAPI = generateResourceAPI(Session.definition);

// Or generate all at once
export const apis = generateAllAPIs([
  Message.definition,
  Step.definition,
  Session.definition,
]);

// Export typed APIs
export type MessageAPI = typeof messageAPI;
export type StepAPI = typeof stepAPI;
```

### Step 4: Use Generated APIs

```typescript
// Query
const message = await messageAPI.getById.query(
  { id: 'msg-1' },
  { include: { steps: true } },  // Auto-loads relationships
  ctx
);

// List with filters
const userMessages = await messageAPI.list.query(
  {
    where: { role: 'user' },
    orderBy: { created_at: 'desc' },
    limit: 10,
  },
  {},
  ctx
);

// Create
const created = await messageAPI.create(
  {
    session_id: 'session-1',
    role: 'user',
    content: 'Hello',
  },
  {},
  ctx
);

// Update
const updated = await messageAPI.update(
  {
    where: { id: 'msg-1' },
    data: { content: 'Updated content' },
  },
  {},
  ctx
);

// Delete
await messageAPI.delete({ id: 'msg-1' }, {}, ctx);
```

### Step 5: Subscribe to Updates

```typescript
// Subscribe to single resource
const subscription = messageAPI.getById.subscribe(
  { id: 'msg-1' },
  { include: { steps: true } },
  {
    onData: (message) => {
      console.log('Message updated:', message);
    },
    onError: (error) => {
      console.error('Subscription error:', error);
    },
  },
  ctx
);

// Cleanup
subscription.unsubscribe();
```

### Step 6: Remove Manual Code

1. **Delete manual API handlers** - No longer needed
2. **Delete manual subscription setup** - Auto-generated
3. **Delete type definitions** - Inferred from Zod schemas
4. **Delete manual DataLoader setup** - Built-in

---

## Advanced Features

### Lifecycle Hooks

```typescript
const Message = defineResource({
  name: 'message',
  fields: z.object({ id: z.string(), content: z.string() }),
  hooks: {
    beforeCreate: async (data) => {
      // Validate, transform, or enrich data
      return { ...data, content: sanitize(data.content) };
    },
    afterCreate: async (entity) => {
      // Send notifications, update metrics, etc.
      await notifyNewMessage(entity);
    },
    beforeUpdate: async (id, data) => {
      // Check permissions, validate changes
      await checkPermissions(id, data);
      return data;
    },
    afterUpdate: async (entity) => {
      // Invalidate caches, trigger workflows
      await invalidateCache(entity.id);
    },
    beforeDelete: async (id) => {
      // Archive data, check constraints
      await archiveMessage(id);
    },
    afterDelete: async (id) => {
      // Cleanup related data
      await cleanupRelatedData(id);
    },
  },
});
```

### Computed Fields

```typescript
const User = defineResource({
  name: 'user',
  fields: z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
  }),
  computed: {
    fullName: (user) => `${user.first_name} ${user.last_name}`,
    avatar: async (user, ctx) => {
      return await ctx.db.avatar.findUnique({
        where: { user_id: user.id },
      });
    },
  },
});
```

### Field Selection

```typescript
// Only fetch specific fields
const message = await messageAPI.getById.query(
  { id: 'msg-1' },
  {
    select: {
      id: true,
      content: true,
      // Don't fetch other fields
    },
  },
  ctx
);
```

### Relationship Options

```typescript
const Message = defineResource({
  name: 'message',
  fields: z.object({ id: z.string() }),
  relationships: {
    // Ordered relationship
    steps: hasMany('step', {
      foreignKey: 'message_id',
      orderBy: { created_at: 'asc' },
    }),

    // Many-to-many through junction table
    tags: hasMany('tag', {
      foreignKey: 'tag_id',
      through: 'message_tags',
    }),
  },
});
```

---

## Performance

### Automatic N+1 Elimination

**Before:**
```typescript
// N+1 query problem
const messages = await db.message.findMany();
for (const message of messages) {
  message.steps = await db.step.findMany({ where: { message_id: message.id } });
}
// 1 + N queries
```

**After:**
```typescript
// Automatically batched
const messages = await messageAPI.list.query(
  {},
  { include: { steps: true } },
  ctx
);
// 2 queries total (1 for messages, 1 batched query for all steps)
```

### Caching

All queries automatically use per-request DataLoader caching:

```typescript
// These 3 loads are batched into 1 query
const [m1, m2, m3] = await Promise.all([
  messageAPI.getById.query({ id: 'msg-1' }, {}, ctx),
  messageAPI.getById.query({ id: 'msg-2' }, {}, ctx),
  messageAPI.getById.query({ id: 'msg-3' }, {}, ctx),
]);

// Second load of same ID returns cached value
const cached = await messageAPI.getById.query({ id: 'msg-1' }, {}, ctx);
// No database query
```

---

## Migration Checklist

- [ ] Install dependencies (`zod`, `rxjs`)
- [ ] Define resources with `defineResource()`
- [ ] Add relationships (`hasMany`, `belongsTo`, etc.)
- [ ] Generate APIs with `generateResourceAPI()`
- [ ] Update client code to use generated APIs
- [ ] Test CRUD operations
- [ ] Test subscriptions
- [ ] Remove manual API handlers
- [ ] Remove manual subscription setup
- [ ] Run integration tests
- [ ] Monitor performance (should see N+1 elimination)
- [ ] Update documentation

---

## Troubleshooting

### Type Errors

**Problem:** TypeScript can't infer types from resource definition

**Solution:** Ensure resource definition is properly typed:
```typescript
const Message = defineResource({
  name: 'message' as const,  // Use 'as const' for string literals
  fields: z.object({ ... }),
});
```

### Relationships Not Loading

**Problem:** Related data is `null` or missing

**Solution:**
1. Check that target resource is registered
2. Verify foreign key field exists in schema
3. Use `include` option: `{ include: { steps: true } }`

### Subscription Not Updating

**Problem:** Subscription doesn't emit updates

**Solution:**
1. Verify events are published (check mutation handlers)
2. Check event channel names match
3. Ensure EventStream is properly configured

---

## Best Practices

1. **One resource per file** - Keep resource definitions organized
2. **Co-locate relationships** - Define bidirectional relationships together
3. **Use hooks for business logic** - Keep API handlers pure
4. **Validate early** - Use Zod for comprehensive validation
5. **Test with integration tests** - Verify full CRUD + subscription flow
6. **Monitor queries** - Use query planner to detect N+1 issues
7. **Cache appropriately** - Use per-request context for loaders

---

## Support

For issues, see:
- [API Documentation](./API.md)
- [Examples](./examples/)
- [ADR-001: Resource-Based Enhancement](../.sylphx/decisions/001-resource-based-lens.md)
