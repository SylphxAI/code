# Lens Perfect Architecture

**Status**: 🚧 In Progress - Complete Refactoring
**Created**: 2025-01-25
**Principle**: Frontend-Driven, No Workarounds, Perfect Architecture Only

---

## Current Problems

### 1. Mixed Architecture (Signals + Manual Subscriptions)

```typescript
// ❌ Current: Complex multi-layer architecture
Signals (global state)
  ↑
  Manual setXXX (from events)
  ↑
  useXXX hooks (React bridge)
  ↓
  Components

// Manual API calls
lensClient.getSession().then(session => setCurrentSession(session))

// Manual subscriptions
const subscription = client.subscribe({ ... }).subscribe({
  next: (data) => setState(data),
  error: (err) => setError(err),
})
```

**Problems**:
- ❌ Signals = Redundant state (Lens already manages state)
- ❌ Manual API calls (should use useQuery)
- ❌ Manual subscriptions (should use useQuery)
- ❌ Manual lifecycle management (refs, cleanup)
- ❌ Event-driven updates (should be reactive)

### 2. Incorrect Lens Usage

All these hooks use WRONG pattern:
- `useCurrentSession` - manual `lensClient.getSession().then()`
- `useChat` - manual `.subscribe()` + refs
- `useEventStream` - manual `.subscribe()` + refs
- `useBackgroundBashCount` - manual API call

---

## Perfect Architecture

### Frontend-Driven Principle

**Components directly declare what data they need. Lens handles everything else.**

```typescript
// ✅ Perfect: Single-layer, declarative
Components
  ↓
  useQuery(client.operation().select({ ... }))
  ↓
  Lens (automatic: state, subscription, optimistic updates, cleanup)
```

**Benefits**:
- ✅ No global state needed (Lens manages internally)
- ✅ No manual API calls (useQuery automatic)
- ✅ No manual subscriptions (useQuery automatic)
- ✅ No manual lifecycle (Lens automatic)
- ✅ Declarative (specify WHAT, Lens handles HOW)

---

## Implementation Plan

### Phase 1: Delete Signals Layer

**Remove**:
- `packages/code-client/src/signals/**/*` - All signals
- `currentSession`, `setCurrentSession`, etc.
- All `useXXX` hooks that bridge signals to React

**Why**: Lens already manages state. Signals are redundant.

### Phase 2: Refactor Core Hooks

#### 2.1 useCurrentSession → useQuery

**Before**:
```typescript
// ❌ Manual API call + signals
export function useCurrentSession() {
  const currentSessionId = useCurrentSessionId();

  useEffect(() => {
    lensClient.getSession({ id }).then(session => {
      setCurrentSession(session);  // Manual state update
    });
  }, [currentSessionId]);

  return useOptimisticSession();  // From signal
}
```

**After**:
```typescript
// ✅ Direct useQuery - declare what you need
export function useCurrentSession() {
  const client = useLensClient();
  const sessionId = useCurrentSessionId();

  const { data: session, isLoading, error } = useQuery(() =>
    client.getSession({ id: sessionId }).select({
      id: true,
      title: true,
      status: true,
      messages: {
        select: {
          id: true,
          role: true,
          content: true,
          // Select only what THIS component needs
        }
      }
    })
  );

  return { session, isLoading, error };
}
```

**Lens automatically**:
- Manages state
- Handles subscription
- Applies optimistic updates
- Cleans up on unmount

#### 2.2 useChat → useMutation

**Before**:
```typescript
// ❌ Manual subscription + callbacks
const sendMessage = async (message, options) => {
  const subscription = client.sendMessage({ ... }).subscribe({
    next: (event) => {
      // Manual event handling
      switch (event.type) {
        case 'text-delta': options.onTextDelta?.(event.text); break;
        // ...
      }
    },
    error: (err) => options.onError?.(err),
  });

  return () => subscription.unsubscribe();  // Manual cleanup
};
```

**After**:
```typescript
// ✅ useMutation - declarative
export function useChat() {
  const client = useLensClient();

  const { mutate: sendMessage, isLoading } = useMutation(() =>
    client.triggerStream({
      sessionId,
      content,
    }).optimistic({
      // Lens handles optimistic updates automatically
    })
  );

  return { sendMessage, isLoading };
}
```

**For streaming events**: Component subscribes directly:
```typescript
// In Chat component
function Chat() {
  const client = useLensClient();

  // Subscribe to streaming events
  const { data: events } = useQuery(() =>
    client.subscribeToSession({
      sessionId,
      replayLast: 50,
    })
  );

  // Render events
  return events.map(event => <EventView event={event} />);
}
```

#### 2.3 useEventStream → useQuery

**Before**:
```typescript
// ❌ Manual subscription + callbacks
export function useEventStream(options) {
  const subscriptionRef = useRef(null);

  useEffect(() => {
    const subscription = client.subscribeToSession({ ... }).subscribe({
      next: (event) => {
        // Manual callback routing
        switch (event.type) {
          case 'text-delta': options.onTextDelta?.(event.text); break;
        }
      }
    });

    subscriptionRef.current = subscription;

    return () => subscription.unsubscribe();  // Manual cleanup
  }, [sessionId]);
}
```

**After**:
```typescript
// ✅ Direct useQuery in component
function Chat() {
  const client = useLensClient();

  const { data: events } = useQuery(() =>
    client.subscribeToSession({
      sessionId,
      replayLast: 50,
    })
  );

  // React to events directly
  useEffect(() => {
    const latest = events?.[events.length - 1];
    if (latest?.type === 'text-delta') {
      // Handle text delta
    }
  }, [events]);
}
```

**No intermediate hooks needed!**

### Phase 3: Component Migration

**All components** directly use `useQuery`:

```typescript
// ❌ Before: Abstraction layers
function Chat() {
  const { session } = useCurrentSession();  // Hook wraps signal
  const { sendMessage } = useChat();        // Hook wraps subscription
  useEventStream({ callbacks });           // Hook wraps subscription
}

// ✅ After: Direct declaration
function Chat() {
  const client = useLensClient();

  // Declare what this component needs
  const { data: session } = useQuery(() =>
    client.getSession({ id }).select({
      id: true,
      title: true,
      messages: true,  // Full messages
    })
  );

  const { data: events } = useQuery(() =>
    client.subscribeToSession({ sessionId, replayLast: 50 })
  );

  const { mutate: sendMessage } = useMutation(() =>
    client.triggerStream({ sessionId, content })
  );

  return <ChatUI session={session} events={events} onSend={sendMessage} />;
}
```

**Benefits**:
- Clear data dependencies
- No hidden state
- Lens handles caching/deduplication
- Perfect field selection

### Phase 4: Delete Obsolete Code

**Delete**:
- All signals (`packages/code-client/src/signals/`)
- All signal-bridge hooks (`useCurrentSession`, `useEventStream`, etc.)
- All manual subscription management (refs, cleanup)
- All event-driven state updates (`setCurrentSession`, etc.)

**Keep**:
- Lens client setup (`LensProvider`, `useLensClient`)
- Business logic (AI streaming, tools, etc.)
- UI components (they'll use useQuery directly)

---

## Migration Examples

### Example 1: Session Display

**Before**:
```typescript
function StatusBar() {
  const { currentSession } = useCurrentSession();  // Signal bridge
  return <div>{currentSession?.title}</div>;
}
```

**After**:
```typescript
function StatusBar() {
  const client = useLensClient();
  const sessionId = useCurrentSessionId();

  const { data: session } = useQuery(() =>
    client.getSession({ id: sessionId }).select({
      title: true,  // Only need title for status bar
    })
  );

  return <div>{session?.title}</div>;
}
```

### Example 2: Token Count

**Before**:
```typescript
function TokenDisplay() {
  const session = useCurrentSession();  // Full session from signal
  return <div>{session.totalTokens}</div>;
}
```

**After**:
```typescript
function TokenDisplay() {
  const client = useLensClient();
  const sessionId = useCurrentSessionId();

  const { data: session } = useQuery(() =>
    client.getSession({ id: sessionId }).select({
      totalTokens: true,  // Only need totalTokens
    })
  );

  return <div>{session?.totalTokens}</div>;
}
```

**Lens deduplicates**: If 10 components query same session, only 1 fetch.

### Example 3: Message List

**Before**:
```typescript
function MessageList() {
  const { currentSession } = useCurrentSession();
  useEventStream({
    onTextDelta: (text) => {
      // Manual state update
      setStreamingText(text);
    }
  });

  return currentSession.messages.map(msg => ...);
}
```

**After**:
```typescript
function MessageList() {
  const client = useLensClient();
  const sessionId = useCurrentSessionId();

  // Get messages
  const { data: session } = useQuery(() =>
    client.getSession({ id: sessionId }).select({
      messages: {
        select: {
          id: true,
          role: true,
          content: true,
          steps: {
            select: {
              parts: true,  // Parts auto-update during streaming
            }
          }
        }
      }
    })
  );

  // No manual event handling needed!
  // Lens automatically updates parts as they stream in
  return session?.messages.map(msg => <MessageView message={msg} />);
}
```

---

## Key Principles

### 1. No Global State

**Why**: Lens manages state internally. Signals/Redux/Zustand are redundant.

**Exception**: UI-only state (input value, modal open) - use React useState.

### 2. No Manual Subscriptions

**Why**: useQuery handles subscriptions automatically.

**Pattern**:
```typescript
// ❌ Don't
const subscription = client.subscribe().subscribe({ next: ... });

// ✅ Do
const { data } = useQuery(() => client.subscribe());
```

### 3. No Intermediate Hooks

**Why**: Components should declare needs directly.

**Pattern**:
```typescript
// ❌ Don't create useCurrentSession hook
export function useCurrentSession() {
  const { data } = useQuery(() => client.getSession());
  return data;
}

// ✅ Do in component
function MyComponent() {
  const { data: session } = useQuery(() =>
    client.getSession({ id }).select({ ... })
  );
}
```

### 4. Field Selection Always

**Why**: Bandwidth optimization. Only fetch what you need.

**Pattern**:
```typescript
// ❌ Don't fetch everything
const { data } = useQuery(() => client.getSession({ id }));

// ✅ Do select specific fields
const { data } = useQuery(() =>
  client.getSession({ id }).select({
    title: true,      // delta (57% savings)
    status: true,     // patch (99% savings)
    totalTokens: true // value (simple)
  })
);
```

---

## Testing Strategy

### Unit Tests
- Test Lens queries/mutations in isolation
- Mock Lens client
- Verify correct field selection

### Integration Tests
- Test components with real Lens client
- Verify data flows correctly
- Check optimistic updates work

### E2E Tests
- Test full user flows
- Verify streaming works
- Check multi-component sync

---

## Success Criteria

✅ Zero signals
✅ Zero manual subscriptions
✅ Zero intermediate hooks (useCurrentSession, etc.)
✅ All components use useQuery/useMutation directly
✅ All tests passing
✅ Streaming works perfectly
✅ Optimistic updates automatic
✅ Multi-component sync works

---

## Next Steps

1. Create Phase 1 tasks: Delete signals
2. Create Phase 2 tasks: Refactor core hooks
3. Create Phase 3 tasks: Migrate components
4. Execute phases sequentially
5. Test thoroughly
6. Document new patterns
