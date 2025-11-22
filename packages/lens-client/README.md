# @sylphx/lens-client

Type-safe client for Lens APIs with full TypeScript inference.

## Features

- **🎯 Field Selection** - Frontend controls which fields to fetch
- **⚡ Update Strategies** - Minimize transmission (delta, patch, value, auto)
- **🔄 Optimistic Updates** - Cache with automatic reconciliation
- **📘 Type Inference** - Full TypeScript type safety from server schema

## Installation

```bash
npm install @sylphx/lens-client @sylphx/lens-core
```

## Quick Start

```typescript
import { createLensClient } from '@sylphx/lens-client';
import { InProcessTransport } from '@sylphx/lens-core';
import { api } from './api'; // Your Lens API definition

// Create client with in-process transport
const client = createLensClient<typeof api>({
  transport: new InProcessTransport({ api, context }),
  optimistic: true // Enable optimistic updates
});

// Type-safe queries
const session = await client.session.getById.query({ sessionId: 'abc' });

// Type-safe mutations
const updated = await client.session.updateTitle.mutate({
  sessionId: 'abc',
  title: 'New Title'
});

// Type-safe subscriptions
client.session.getById.subscribe({ sessionId: 'abc' }).subscribe({
  next: (session) => console.log('Session updated:', session)
});
```

## Field Selection

Control exactly which fields to fetch from the server:

```typescript
// Array syntax - simple field selection
const session = await client.session.getById.query(
  { sessionId: 'abc' },
  { select: ['id', 'title', 'updatedAt'] }
);
// Returns: { id: string, title: string, updatedAt: Date }

// Object syntax - nested field selection
const session = await client.session.getById.query(
  { sessionId: 'abc' },
  {
    select: {
      id: true,
      title: true,
      messages: {
        id: true,
        content: true
      }
    }
  }
);
// Returns: { id: string, title: string, messages: Array<{ id: string, content: string }> }
```

## Update Strategies

Minimize data transfer with intelligent update strategies:

```typescript
// Subscription with patch strategy - only send JSON Patch operations
client.session.getById.subscribe(
  { sessionId: 'abc' },
  {
    select: ['id', 'title', 'updatedAt'],
    updateMode: 'patch' // Only send changes, not full object
  }
).subscribe({
  next: (session) => console.log('Patched session:', session)
});

// Delta strategy - for text streaming (LLM responses)
client.message.streamResponse.subscribe(
  { sessionId: 'abc', userMessageContent: 'Hello' },
  {
    updateMode: 'delta' // Only send text differences
  }
).subscribe({
  next: (message) => console.log('Streamed content:', message.content)
});

// Auto strategy - intelligently choose best strategy
client.session.getById.subscribe(
  { sessionId: 'abc' },
  {
    updateMode: 'auto' // Lens picks best strategy based on data type
  }
);
```

## Optimistic Updates

Instant UI updates with automatic reconciliation:

```typescript
// Enable optimistic updates (default: true)
const client = createLensClient<typeof api>({
  transport,
  optimistic: true
});

// Mutation with optimistic data
const updateTitle = async (newTitle: string) => {
  const result = await client.session.updateTitle.mutate(
    { sessionId: 'abc', title: newTitle },
    {
      optimistic: true,
      optimisticData: {
        id: 'abc',
        title: newTitle, // Set immediately in UI
        updatedAt: new Date()
      }
    }
  );

  // If mutation succeeds: optimistic data confirmed
  // If mutation fails: optimistic data reverted automatically
  return result;
};
```

### How Optimistic Updates Work

1. **Instant UI Update** - `optimisticData` set immediately in cache
2. **Server Mutation** - Mutation sent to server
3. **Auto Reconciliation**:
   - ✅ **Success**: Real server data replaces optimistic data
   - ❌ **Failure**: Optimistic data reverted to original value

### Unified Optimistic Pattern

```typescript
// 1. Subscribe to session (real-time sync)
const { data } = client.session.getById.subscribe(
  { sessionId: 'abc' },
  { select: ['id', 'title'], updateMode: 'patch' }
);

// 2. Mutation with optimistic update
const updateTitle = async (newTitle: string) => {
  // Instant UI update
  await client.session.updateTitle.mutate(
    { sessionId: 'abc', title: newTitle },
    {
      optimistic: true,
      optimisticData: { id: 'abc', title: newTitle }
    }
  );

  // Subscription automatically syncs from server:
  // - If server accepts: patch = [] (no changes, already optimistic)
  // - If server modifies: patch = [changes] (e.g., sanitized title)
  // - If fails: subscription reverts via error event
};
```

## Custom Cache

Provide your own cache implementation:

```typescript
import type { LensCache } from '@sylphx/lens-client';

class RedisCacheAdapter implements LensCache {
  constructor(private redis: Redis) {}

  async get(key: string) {
    return JSON.parse(await this.redis.get(key) || 'null');
  }

  async set(key: string, value: any) {
    await this.redis.set(key, JSON.stringify(value));
  }

  async delete(key: string) {
    await this.redis.del(key);
  }

  async optimisticUpdate(key: string, value: any) {
    const original = await this.get(key);
    await this.redis.set(`${key}:original`, JSON.stringify(original));
    await this.redis.set(`${key}:optimistic`, JSON.stringify(value));
  }

  async revertOptimistic(key: string) {
    const original = await this.redis.get(`${key}:original`);
    if (original) {
      await this.redis.set(key, original);
    }
    await this.redis.del(`${key}:optimistic`);
    await this.redis.del(`${key}:original`);
  }

  async confirmOptimistic(key: string) {
    const optimistic = await this.redis.get(`${key}:optimistic`);
    if (optimistic) {
      await this.redis.set(key, optimistic);
    }
    await this.redis.del(`${key}:optimistic`);
    await this.redis.del(`${key}:original`);
  }
}

const client = createLensClient<typeof api>({
  transport,
  cache: new RedisCacheAdapter(redis)
});
```

## Type Inference

Full TypeScript type safety from server schema:

```typescript
// Server API definition
export const api = lens.object({
  session: lens.object({
    getById: lens.query({
      input: z.object({ sessionId: z.string() }),
      output: SessionSchema,
      resolve: async ({ sessionId }) => getSession(sessionId)
    }),
    updateTitle: lens.mutation({
      input: z.object({ sessionId: z.string(), title: z.string() }),
      output: SessionSchema,
      resolve: async ({ sessionId, title }) => updateSession(sessionId, title)
    })
  })
});

// Client automatically infers types
const client = createLensClient<typeof api>({ transport });

// ✅ Type-safe input
const session = await client.session.getById.query({
  sessionId: 'abc' // ✅ Correct
});

// ❌ TypeScript error - invalid input
const session = await client.session.getById.query({
  sessionId: 123 // ❌ Error: Type 'number' is not assignable to type 'string'
});

// ✅ Type-safe output
session.title // ✅ string
session.invalid // ❌ Property 'invalid' does not exist
```

## API Reference

### `createLensClient<T>(config)`

Creates a type-safe Lens client.

**Parameters:**
- `config.transport: LensTransport` - Transport implementation (required)
- `config.optimistic?: boolean` - Enable optimistic updates (default: `true`)
- `config.cache?: LensCache` - Custom cache implementation (default: `InMemoryCache`)

**Returns:** `LensClient<T>` - Type-safe client instance

### `QueryOptions`

Options for one-time queries.

```typescript
interface QueryOptions {
  select?: FieldSelection; // Control which fields to fetch
}
```

### `MutationOptions`

Options for mutations.

```typescript
interface MutationOptions {
  select?: FieldSelection;       // Control which fields to return
  optimistic?: boolean;           // Enable optimistic update (default: true if cache enabled)
  optimisticData?: any;           // Optimistic value to set immediately
}
```

### `SubscriptionOptions`

Options for subscriptions.

```typescript
interface SubscriptionOptions {
  select?: FieldSelection;  // Control which fields to fetch
  updateMode?: UpdateMode;  // Minimize transmission ('delta' | 'patch' | 'value' | 'auto')
}
```

### `LensCache`

Cache interface for optimistic updates.

```typescript
interface LensCache {
  get(key: string): any;
  set(key: string, value: any): void;
  delete(key: string): void;
  optimisticUpdate(key: string, value: any): void;
  revertOptimistic(key: string): void;
  confirmOptimistic(key: string): void;
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Lens Client                           │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Field         │  │ Update       │  │ Optimistic      │  │
│  │ Selection     │  │ Strategies   │  │ Updates Cache   │  │
│  └───────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │  Lens Transport  │ (HTTP, WebSocket, SSE, InProcess)
                 └──────────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │   Lens Server    │
                 └──────────────────┘
```

## License

MIT
