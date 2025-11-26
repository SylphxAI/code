# Lens Architecture

Lens is our TypeScript-first, frontend-driven API framework that combines the best of tRPC, GraphQL, and Pothos.

## Core Principles

1. **Frontend-Driven**: Client declares what it wants, server handles how
2. **TypeScript-First**: Full type inference from Zod schemas, no codegen
3. **Automatic Optimistic Updates**: Declarative `.optimistic()` on mutations
4. **Field Selection**: GraphQL-like field selection with auto-optimized transmission
5. **Zero Boilerplate**: Just use `lensClient`, everything is automatic

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React/TUI)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  lensClient.session.getById.query({ sessionId })               │
│  lensClient.session.updateTitle.mutate({ sessionId, title })   │
│  lensClient.session.getById.subscribe({ sessionId })           │
│                                                                 │
│  ↓ TypeScript inference ↓                                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Lens Client (@sylphx/lens-client)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • Type-safe proxy for API calls                               │
│  • Automatic optimistic updates via OptimisticManager          │
│  • Field selection support                                     │
│  • Transport abstraction (InProcess, HTTP, WebSocket)          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Transport Layer                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TUI:  InProcessTransport (zero overhead, direct function call)│
│  Web:  HTTPTransport (REST-like, with EventSource for subs)    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Lens Server (@sylphx/lens-server)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • Request routing                                             │
│  • Schema validation (Zod)                                     │
│  • Context injection                                           │
│  • Event publishing                                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  API Definition (@sylphx/code-api)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  lens                                                          │
│    .input(z.object({ sessionId: z.string() }))                 │
│    .output(SessionSchema)                                      │
│    .optimistic((opt) => opt                                    │
│      .entity('Session')                                        │
│      .id($ => $.sessionId)                                     │
│      .apply((draft, input, t) => { ... })                      │
│    )                                                           │
│    .mutation(async ({ input, ctx }) => { ... })                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Automatic Optimistic Updates

Lens handles optimistic updates completely automatically. Users don't need to know about `OptimisticManager` or any internal details.

### How It Works

1. **Define optimistic in API**:
```typescript
// api.ts
triggerStream: lens
  .input(z.object({ sessionId: z.string().nullish(), content: z.array(...) }))
  .output(z.object({ success: z.boolean(), sessionId: z.string() }))
  .optimistic((opt) => opt
    .entity('Session')
    .id($ => $.sessionId || 'temp-session')
    .apply((draft, input, t) => {
      // Optimistically set status immediately
      draft.status = {
        text: "Thinking...",
        isActive: true,
      };
      draft.updatedAt = t.now();
    })
  )
  .mutation(async ({ input, ctx }) => { ... })
```

2. **User just calls mutation**:
```typescript
// User code - no optimistic handling needed!
await lensClient.message.triggerStream.mutate({
  sessionId: 'sess-1',
  content: [{ type: 'text', content: 'Hello' }],
});
// ✅ UI updates immediately (optimistic)
// ✅ Server confirms → reconciles automatically
// ✅ Error → rolls back automatically
```

3. **User just subscribes**:
```typescript
// User code - no wrapping needed!
lensClient.session.getById.subscribe({ sessionId }).subscribe({
  next: (session) => {
    // ✅ Receives merged state (optimistic + server)
    // ✅ Automatic reconciliation when server updates
    console.log('Session:', session);
  }
});
```

### Internal Flow

```
User calls mutate()
       │
       ▼
┌──────────────────────────┐
│ Lens Client              │
│ 1. beforeMutation()      │ ← Apply optimistic to cache
│ 2. transport.mutate()    │ ← Send to server
│ 3. onSuccess/onError()   │ ← Confirm or rollback
└──────────────────────────┘
       │
       ▼
Server processes & publishes event
       │
       ▼
┌──────────────────────────┐
│ Subscription (auto-wrap) │
│ 1. Receive server update │
│ 2. mergeBase()           │ ← Merge into base state
│ 3. Emit merged state     │ ← base + optimistic layers
└──────────────────────────┘
       │
       ▼
UI receives final merged state
```

## Field Selection

Lens supports GraphQL-like field selection with automatic transmission optimization.

```typescript
// Select only needed fields
const session = await lensClient.session.getById.query(
  { sessionId: 'sess-1' },
  {
    select: {
      id: true,
      title: true,
      status: true,
      // messages: false ← Not selected, not transmitted
    }
  }
);
// session type: { id: string; title: string; status: SessionStatus }
```

### Auto-Optimized Transmission

Backend automatically chooses optimal strategy per field:
- **String fields** (e.g., title) → Delta strategy (57% bandwidth savings)
- **Object fields** (e.g., status) → Patch strategy (99% bandwidth savings)
- **Primitive fields** (e.g., id) → Value strategy (simple, fast)

## Transport Options

### InProcessTransport (TUI)
- Zero overhead - direct function call
- No serialization needed
- Used for embedded server (TUI)

### HTTPTransport (Web)
- REST-like API over HTTP
- EventSource for subscriptions
- Used for remote server (Web UI)

## LensProvider Setup

```tsx
import { LensProvider } from "@sylphx/code-client";
import { api } from "@sylphx/code-api";

function App() {
  return (
    <LensProvider
      api={api}
      context={appContext}
      optimistic={true}  // Enable automatic optimistic updates
    >
      <YourApp />
    </LensProvider>
  );
}
```

## Using Lens Client

### In React Components
```tsx
import { useLensClient } from "@sylphx/code-client";

function SessionView({ sessionId }: { sessionId: string }) {
  const client = useLensClient();

  const updateTitle = async (newTitle: string) => {
    await client.session.updateTitle.mutate({ sessionId, newTitle });
    // ✅ Optimistic update applied automatically
  };

  return <button onClick={() => updateTitle('New Title')}>Update</button>;
}
```

### In Non-React Code (Signals, Utilities)
```typescript
import { lensClient } from "@sylphx/code-client";

// Direct access without hooks
const session = await lensClient.session.getById.query({ sessionId });
```

## Frontend-Driven Pattern: Direct useQuery

```tsx
import { useLensClient } from "@sylphx/code-client";
import { useQuery } from "@sylphx/lens-react";

function StatusBar({ sessionId }) {
  const client = useLensClient();

  // ✅ Direct useQuery - declare what you need
  const { data: session } = useQuery(
    sessionId
      ? client.getSession({ id: sessionId }).select({
          totalTokens: true, // Only fetch what this component needs
        })
      : null
  );

  return <TokenDisplay tokens={session?.totalTokens || 0} />;
}
```

**Key Principles**:
- ❌ No composable hooks (useLensSessionSubscription, etc.)
- ✅ Components directly declare data needs via `useQuery` + `select`
- ✅ Lens handles: lifecycle, state, optimistic updates, subscription
- ✅ Frontend-driven: specify WHAT, Lens handles HOW

## When to Use useQuery vs Signals

| Use Case | Pattern | Example |
|----------|---------|---------|
| **Static data display** | `useQuery` | StatusBar fetching totalTokens |
| **Real-time streaming** | Signals + Events | Chat with live text/tool streaming |
| **Local UI state** | Signals | Selected provider, model selection |
| **User preferences** | Signals | Theme, display settings |

### Chat Component (Signal + Event Pattern)

Chat uses signals instead of `useQuery` because:
1. **Real-time streaming** - Events modify session in-place (appending text, tools)
2. **Optimistic updates** - User messages appear instantly before server confirms
3. **temp-session handling** - Complex state transitions during session creation

```tsx
// Chat uses event-driven pattern (not useQuery)
// See: packages/code/src/hooks/client/useCurrentSession.ts
function useCurrentSession() {
  // Signals updated by event handlers during streaming
  const session = useCurrentSessionSignal();

  // One-time fetch when loading existing session
  useEffect(() => {
    if (sessionId) {
      lensClient.getSession({ id: sessionId }).then(setCurrentSession);
    }
  }, [sessionId]);

  return { currentSession: session };
}
```

### StatusBar Component (useQuery Pattern)

StatusBar uses `useQuery` because:
1. **Static display** - Just shows token count, no streaming
2. **Simple lifecycle** - Fetch when sessionId changes
3. **Auto-subscription** - Lens handles cache updates

```tsx
// StatusBar uses Frontend-Driven pattern
const { data: session } = useQuery(
  sessionId
    ? client.getSession({ id: sessionId }).select({ totalTokens: true })
    : null
);
```

## Key Benefits

1. **No Manual Optimistic Handling**
   - Define once in API, works everywhere
   - No `wrapSubscriptionWithOptimistic` needed
   - No `getOptimisticManager` needed

2. **Type Safety**
   - Full TypeScript inference
   - Autocomplete for fields
   - Compile-time validation

3. **Minimal Bundle Size**
   - No heavy GraphQL runtime
   - Tree-shakeable
   - ~90KB gzipped (entire TUI)

4. **Multi-Client Sync**
   - All clients subscribe to same events
   - Automatic reconciliation
   - No state conflicts

## Migration from Old System

The old `OptimisticManagerV2` and manual optimistic system has been removed. Everything is now handled automatically by Lens.

**Before (Old System)**:
```typescript
// ❌ Manual tracking
trackOptimisticMessage({ sessionId, optimisticId, content });

// ❌ Manual reconciliation
const result = optimisticManagerV2.reconcile(sessionId, event);
runOptimisticEffects(result.effects);

// ❌ Manual subscription wrapping
const wrapped = wrapSubscriptionWithOptimistic(sub, manager, {...});
```

**After (Lens)**:
```typescript
// ✅ Just call mutation
await lensClient.session.updateTitle.mutate({ sessionId, newTitle });

// ✅ Just subscribe
lensClient.session.getById.subscribe({ sessionId }).subscribe({...});

// Everything else is automatic!
```
