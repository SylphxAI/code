# Lens Architecture

Lens is our TypeScript-first, frontend-driven API framework that combines the best of tRPC, GraphQL, and Pothos.

## Core Principles

1. **Live Query**: All queries are subscriptions - data updates automatically
2. **Server-Side Emit**: Server uses emit API to push updates
3. **Frontend-Driven**: Client declares what it wants, Lens handles how
4. **TypeScript-First**: Full type inference from Zod schemas, no codegen
5. **Zero Boilerplate**: Just use `useQuery`, everything is automatic

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React/TUI)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  useQuery(client.getSession({ id: sessionId }))                │
│                                                                 │
│  ↓ Data updates automatically via emit ↓                        │
│                                                                 │
│  session.textContent      ← emit.delta("textContent", ...)     │
│  session.currentTool      ← emit.set("currentTool", {...})     │
│  session.streamingStatus  ← emit.merge({ status: ... })        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Lens Client (@sylphx/lens-client)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • Type-safe proxy for API calls                               │
│  • Automatic subscription management                            │
│  • Field selection support                                     │
│  • Transport abstraction (InProcess, HTTP, WebSocket)          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Transport Layer                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TUI:  InProcessTransport (zero overhead, direct function call)│
│  Web:  HTTPTransport (REST-like, with WebSocket for streaming) │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Lens Server (@sylphx/lens-server)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • Request routing                                             │
│  • Schema validation (Zod)                                     │
│  • Context injection                                           │
│  • Emit API for streaming                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Live Query Pattern

**All queries are subscriptions.** Client describes what data it wants, server uses emit to push updates.

### Three-Layer Architecture

| Layer | Responsibility | API |
|-------|---------------|-----|
| **Server** | Describes what data exists, uses emit to push updates | `query().resolve(({ emit }) => {...})` |
| **Lens** | Handles sync, diff, reconnection automatically | Transparent |
| **Client** | Describes what data it wants | `useQuery(client.getSession({ id }))` |

### Client Usage

```tsx
function Chat({ sessionId }) {
  const client = useLensClient();

  // Describe: I want this session's data
  const { data: session } = useQuery(
    client.getSession({ id: sessionId })
  );

  // Data updates automatically!
  // - session.textContent updates via emit.delta
  // - session.currentTool updates via emit.set
  // - session.streamingStatus updates via emit.merge

  return (
    <div>
      <Text>{session?.textContent}</Text>
      {session?.currentTool && <ToolDisplay tool={session.currentTool} />}
    </div>
  );
}
```

### Server Usage

```typescript
export const getSession = query()
  .input(z.object({ id: z.string() }))
  .returns(Session)
  .resolve(async ({ input, ctx, emit, onCleanup }) => {
    // 1. Return initial data
    const session = await ctx.db.session.findUnique({ where: { id: input.id } });

    // 2. Subscribe to event source
    const channel = `session-stream:${input.id}`;
    const events = ctx.eventStream.subscribe(channel);

    // 3. Process events and use emit to update
    (async () => {
      for await (const event of events) {
        switch (event.type) {
          case "text-delta":
            emit.delta("textContent", [{ position: Infinity, insert: event.text }]);
            break;
          case "tool-call":
            emit.set("currentTool", { id: event.id, name: event.name });
            break;
          case "complete":
            emit.merge({ streamingStatus: "idle", isTextStreaming: false });
            break;
        }
      }
    })();

    // 4. Cleanup on disconnect
    onCleanup(() => { /* cleanup */ });

    return session;
  });
```

## Emit API

| Method | Use Case | Example |
|--------|----------|---------|
| `emit.merge(partial)` | Merge partial data | `emit.merge({ status: "streaming" })` |
| `emit.set(field, value)` | Set single field | `emit.set("isStreaming", true)` |
| `emit.delta(field, ops)` | Text streaming (57% bandwidth savings) | `emit.delta("text", [{ position: Infinity, insert: "..." }])` |
| `emit.patch(field, ops)` | JSON Patch (RFC 6902) | `emit.patch("tool", [{ op: "replace", path: "/status", value: "done" }])` |
| `emit.replace(data)` | Replace entire state | `emit.replace(newSession)` |

## Data Flow

```
1. Client: useQuery(client.getSession({ id }))
     ↓
2. Server: resolve() returns initial data + sets up emit listeners
     ↓
3. Lens: Automatically establishes WebSocket subscription
     ↓
4. Server: Event arrives → emit.delta/merge/set
     ↓
5. Lens: Automatically syncs diff to client
     ↓
6. Client: useQuery's data updates → React re-renders
```

## Anti-Patterns (Avoid These)

### ❌ Creating special "subscribe" queries

```typescript
// WRONG! Don't need special naming
export const subscribeToStreamingState = query()...
```

### ❌ Manual .subscribe() callbacks

```typescript
// WRONG! useQuery handles this automatically
query.subscribe((state) => { ... });
```

### ❌ Client-side event handling

```typescript
// WRONG! This logic should be on server
switch (event.type) {
  case "text-delta": ...
}
```

### ❌ 20+ callback options

```typescript
// WRONG! Old pattern with too many callbacks
sendMessage(text, {
  onTextDelta: (text) => setContent(c => c + text),
  onToolCall: (id, name) => setTool({ id, name }),
  // ... 18 more callbacks
});
```

## Migration Guide

### Before (Old Pattern)

```tsx
// Complex event handling
useEventStream({
  callbacks: {
    onTextDelta: (text) => setContent(c => c + text),
    onToolCall: (id, name) => setTool({ id, name }),
    onComplete: () => setStreaming(false),
    // ... 10+ callbacks
  }
});

// Manual subscription
const subscription = client.subscribeToSession({ sessionId })
  .subscribe({
    next: (event) => {
      switch (event.type) {
        case "text-delta": ...
        case "tool-call": ...
      }
    }
  });
```

### After (Live Query)

```tsx
// Simple data reading
const { data: session } = useQuery(
  client.getSession({ id: sessionId })
);

// Direct field access - all auto-updated!
const isStreaming = session?.streamingStatus === "streaming";
const text = session?.textContent;
const tool = session?.currentTool;
const question = session?.askQuestion;
```

## Field Selection

```typescript
// Select only needed fields
const { data: session } = useQuery(
  client.getSession({ id: sessionId }).select({
    totalTokens: true,
    streamingStatus: true,
    // messages: false ← Not selected, not transmitted
  })
);
```

## Transport Options

### InProcessTransport (TUI)
- Zero overhead - direct function call
- No serialization needed
- Used for embedded server (TUI)

### HTTPTransport (Web)
- REST-like API over HTTP
- WebSocket for subscriptions
- Used for remote server (Web UI)

## LensProvider Setup

```tsx
import { LensProvider } from "@sylphx/code-client";

function App() {
  return (
    <LensProvider server={lensServer}>
      <YourApp />
    </LensProvider>
  );
}
```

## Hooks Summary

| Hook | Use Case |
|------|----------|
| `useQuery(client.queryName(input))` | Subscribe to any query - data updates automatically |
| `useLensClient()` | Get client for mutations |
| `useCurrentSessionId()` | Get current session ID from URL |

## Key Benefits

1. **No Manual Event Handling**
   - Server handles all event types
   - Client just reads data

2. **Type Safety**
   - Full TypeScript inference
   - Autocomplete for fields
   - Compile-time validation

3. **Minimal Bundle Size**
   - No heavy GraphQL runtime
   - Tree-shakeable
   - ~90KB gzipped (entire TUI)

4. **Automatic Sync**
   - Reconnection handled
   - Diff optimization
   - No state conflicts

## Lens Package Versions

Current versions:
- `@sylphx/lens-core`: ^1.2.0
- `@sylphx/lens-server`: ^1.2.0
- `@sylphx/lens-client`: ^1.0.5
- `@sylphx/lens-react`: ^1.2.2

## Summary

**Simple is powerful.**

- Server: Use emit to describe state changes
- Client: Use useQuery to read data
- Lens: Handles everything in between

---

## Lessons Learned & Best Practices

### 1. Single Source of Truth: Server

**Principle**: Server is the ONLY source of truth. Client ONLY reads via `useQuery`.

❌ **Anti-Pattern**: Dual state management
```typescript
// WRONG: Two sources for same data
const currentSession = zen<Session | null>(null);  // zen signal
const { data: session } = useQuery(client.getSession({ id }));  // useQuery

// This creates conflicts and infinite loops!
```

✅ **Correct**: Server-driven state only
```typescript
// RIGHT: Single source via useQuery
const { data: session } = useQuery(client.getSession({ id }));
// session.textContent, session.currentTool, etc. all come from server
```

### 2. No Client-Side Event Handling

**Principle**: Event type handling belongs on SERVER, not client.

❌ **Anti-Pattern**: Client processes events
```typescript
// WRONG: Client handling events
eventBus.on("streaming:started", () => setIsStreaming(true));
eventBus.on("text-delta", (text) => setContent(c => c + text));
```

✅ **Correct**: Server emits, client reads
```typescript
// SERVER: Handles event → emits update
case "text-delta":
  emit.delta("textContent", [{ position: Infinity, insert: event.text }]);
  break;

// CLIENT: Just reads
const text = session?.textContent; // Auto-updated!
```

### 3. Flat Namespace API

**Principle**: Use Lens flat namespace, not tRPC-style nested routes.

❌ **Anti-Pattern**: tRPC-style API
```typescript
// WRONG: Old tRPC nested structure
await client.session.create.mutate({ ... });
await client.message.triggerStream.mutate({ ... });
```

✅ **Correct**: Flat Lens namespace
```typescript
// RIGHT: Flat namespace
await client.createSession({ ... });
await client.triggerStream({ ... });
```

### 4. useQuery for All Data Fetching

**Principle**: Never manually fetch + setState. Always useQuery.

❌ **Anti-Pattern**: Manual fetching
```typescript
// WRONG: Manual fetch + state
const loadSessions = async () => {
  const sessions = await client.listSessions.query();
  setRecentSessions(sessions);  // Manual state update
};
```

✅ **Correct**: useQuery handles everything
```typescript
// RIGHT: useQuery auto-updates
const { data: sessions } = useQuery(client.listSessions({ limit: 20 }));
// No manual setState needed!
```

### 5. Conditional Queries

**Principle**: Pass `null` to skip query, not conditional hooks.

❌ **Anti-Pattern**: Conditional hooks
```typescript
// WRONG: Violates rules of hooks
if (sessionId) {
  const { data } = useQuery(client.getSession({ id: sessionId }));
}
```

✅ **Correct**: Null query
```typescript
// RIGHT: Pass null to skip
const { data: session } = useQuery(
  sessionId ? client.getSession({ id: sessionId }) : null
);
```

### 6. Optimistic Updates via Mutation

**Principle**: For instant feedback, use mutation's optimistic update, not manual state.

❌ **Anti-Pattern**: Manual optimistic state
```typescript
// WRONG: Manual signal update
setCurrentSession({ ...session, messages: [...messages, newMessage] });
await client.addMessage({ ... });
```

✅ **Correct**: Mutation optimistic options
```typescript
// RIGHT: Let Lens handle optimistic updates
const mutation = useMutation(client.addMessage, {
  optimistic: (input) => ({
    // Lens applies this optimistically, rolls back on error
  })
});
```

---

## Current Migration Status

### ✅ Completed
- Server emit API in `getSession` query
- Title streaming via emit.delta on `title` field
- Removed callback-based event handling (useEventStreamCallbacks, streamEventHandlers)
- `useCurrentSession` uses `useQuery`
- **Removed `currentSession` zen signal** - navigation only via `currentSessionId`
- **Removed dual state sources** - server data comes from useQuery only
- **Updated to flat namespace API** - `client.createSession()`, `client.triggerStream()`
- **Simplified subscriptionAdapter** - no optimistic signals, trusts server emit
- **Deleted deprecated files** - utils.ts, refetch-session.ts, event handlers
- **Removed client-side streaming setters** - `setIsStreaming`, `setIsTitleStreaming`, etc.
- **useStreamingState derives from useQuery** - all streaming state comes from session
- **Deleted obsolete type files** - types.ts, eventContextBuilder.ts from streaming/

### 🔄 Remaining (Minor)
- code-web package needs proper Preact + Lens integration (has TODO comments)
- Legacy tRPC-style API still exists in compat.ts (backward compat, can remove later)

### Architecture Achievement
```
BEFORE: Client signals + useQuery + Callbacks (dual source of truth)
AFTER:  useQuery only for server data (single source of truth)
```

---

## Debugging Tips

### Issue: Infinite Re-renders
**Cause**: Usually dual state sources (signal + useQuery) fighting.
**Fix**: Remove the signal, use only useQuery.

### Issue: Data Not Updating
**Cause**: Usually client not subscribed, or emit not being called.
**Debug**:
1. Check server emit is being called (add logging)
2. Check useQuery is active (not null input)
3. Check transport is connected

### Issue: Stale Data
**Cause**: Reading from signal instead of useQuery.
**Fix**: Always read from useQuery result, never from zen signals for server data.
