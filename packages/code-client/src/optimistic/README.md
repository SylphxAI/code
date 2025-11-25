# Optimistic Updates - DEPRECATED

> **⚠️ This module is DEPRECATED.** Use Lens OptimisticManager instead.

## New Architecture

Lens now handles optimistic updates **automatically**. No manual code needed!

### How It Works

1. **Define `.optimistic()` on mutations** in `@sylphx/code-api`
2. **User calls `lensClient.*.mutate()`** - optimistic applied automatically
3. **User subscribes via `lensClient.*.subscribe()`** - receives merged state automatically

### Example

```typescript
// In API definition (api.ts)
updateTitle: lens
  .input(z.object({ sessionId: z.string(), newTitle: z.string() }))
  .output(z.object({ success: z.boolean() }))
  .optimistic((opt) => opt
    .entity('Session')
    .id($ => $.sessionId)
    .apply((draft, input, t) => {
      draft.title = input.newTitle;
      draft.updatedAt = t.now();
    })
  )
  .mutation(async ({ input, ctx }) => { ... })

// In user code - nothing special needed!
await lensClient.session.updateTitle.mutate({ sessionId, newTitle: 'New Title' });
// ✅ UI updates immediately
// ✅ Confirms on success
// ✅ Rolls back on error
```

## What's Removed

- `OptimisticManager` (V1) - replaced by `@sylphx/lens-client` OptimisticManager
- `OptimisticManagerV2` - removed entirely
- `@sylphx/optimistic` package - removed entirely
- `trackOptimisticMessage()` - not needed, Lens handles it
- `runOptimisticEffects()` - not needed, Lens handles it
- `wrapSubscriptionWithOptimistic()` - done automatically by Lens client

## What's Kept (in index.ts)

Queue handlers are still exported for direct signal updates:

```typescript
export {
  handleQueueCleared,
  handleQueueMessageAdded,
  handleQueueMessageRemoved,
  handleQueueMessageUpdated,
} from "../signals/domain/queue/index.js";
```

## Documentation

See `/docs/architecture/lens.md` for full Lens architecture documentation.
