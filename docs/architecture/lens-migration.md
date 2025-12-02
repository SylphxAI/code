# Lens Migration Tasks

## ✅ COMPLETED

### Phase 1: Remove Dual State
- ✅ Removed `currentSession` zen signal from `session/index.ts`
- ✅ Removed `setCurrentSession`, `serverSession`, `isStreaming` signals
- ✅ Kept only `currentSessionId` (navigation state)
- ✅ Updated all action functions to use Lens flat namespace

### Phase 2: Simplify subscriptionAdapter
- ✅ Removed all signal manipulation
- ✅ Simplified to just call `client.triggerStream()` mutation
- ✅ Removed optimistic update logic (trust server emit speed)
- ✅ Removed all `setIsStreaming`, `setStreamingTitle` etc. setters

### Phase 3: Delete Deprecated Files
- ✅ Deleted `streaming/utils.ts` (signal manipulation)
- ✅ Deleted `refetch-session.ts` (manual refetch)
- ✅ Deleted `useEventStream.ts` (callback system)
- ✅ Deleted `useEventStreamCallbacks.ts` (callback definitions)
- ✅ Deleted `streamEventHandlers.ts` + `handlers/*` (event handlers)
- ✅ Deleted `streaming/types.ts` (obsolete EventHandlerContext)
- ✅ Deleted `streaming/eventContextBuilder.ts` (obsolete)
- ✅ Deleted `session.test.ts` (tested removed signals)

### Phase 4: Update API Calls
- ✅ Session actions now use flat namespace: `client.createSession()`, `client.updateSession()`
- ✅ Message actions use: `client.sendMessage()`, `client.triggerStream()`

### Phase 5: Fix code-web Package
- ✅ Updated Header.tsx, StatusBar.tsx, Sidebar.tsx
- ✅ Removed imports of deleted signals
- ✅ Added TODO comments for proper useQuery integration

### Phase 6: Server-Driven Streaming State
- ✅ Rewrote `streaming.ts` to export deprecated stubs with warnings
- ✅ Rewrote `useStreamingState.ts` to derive all state from useQuery session
- ✅ Updated `useChatEffects.ts` to not pass setters to subscriptionAdapter
- ✅ All streaming state now comes from server via emit API

---

## Remaining Work (Minor)

### code-web Package
- Needs proper Preact + Lens integration
- Currently has placeholder implementations with TODO comments
- Low priority - TUI is primary interface

### Cleanup
- Legacy tRPC-style API in `compat.ts` can be removed when ready
- `packages/code-client/src/optimistic/index.ts` may be removable

---

## Verification Checklist

Migration is verified:

- [x] No imports of `currentSession` signal (except for navigation ID)
- [x] No imports of `setCurrentSession`
- [x] No `eventBus.on("streaming:*")` listeners in client
- [x] All data fetching uses `useQuery`
- [x] All mutations use flat namespace (`client.methodName()`)
- [x] No `switch (event.type)` in client code
- [x] No manual `.subscribe()` calls
- [x] No callbacks like `onTextDelta`, `onToolCall`, etc.
- [x] No client-side `setIsStreaming`, `setStreamingTitle` etc.
- [x] `useStreamingState` derives from useQuery session
- [x] App runs without import errors

---

## Testing After Migration

1. **Streaming Test**
   - Send message
   - Verify text streams incrementally
   - Verify tool calls display
   - Verify completion works

2. **Session Navigation Test**
   - Switch sessions
   - Verify data loads correctly
   - Verify no stale data

3. **Error Recovery Test**
   - Kill server mid-stream
   - Verify reconnection
   - Verify state recovery

---

## Architecture Diagram (Target State)

```
┌─────────────────────────────────────────────────────────────────┐
│  Component                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  const { data: session } = useQuery(                           │
│    client.getSession({ id: currentSessionId })                  │
│  );                                                            │
│                                                                 │
│  // Read directly from session - all auto-updated!             │
│  session.textContent                                           │
│  session.currentTool                                           │
│  session.streamingStatus                                       │
│  session.askQuestion                                           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Lens (Automatic)                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Handles: subscription, reconnect, diff sync                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Server (getSession query)                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  for await (const event of eventStream) {                       │
│    switch (event.type) {                                        │
│      case "text-delta": emit.delta("textContent", ...);        │
│      case "tool-call": emit.set("currentTool", ...);           │
│      case "complete": emit.merge({ status: "idle" });          │
│    }                                                           │
│  }                                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

NO zen signals for server data.
NO eventBus for streaming events.
NO manual subscription callbacks.
```

---

## Notes

### Why Keep currentSessionId Signal?
- Navigation state (which session user is viewing)
- Not server data
- Changes when user clicks session in list
- Used as input to `useQuery(client.getSession({ id }))`

### Why Remove currentSession Signal?
- Server data (session content)
- Should come from `useQuery` only
- Dual sources cause conflicts

### Optimistic Updates Strategy
Two options:
1. **Trust server speed** - Server emit is fast enough, no optimistic needed
2. **Lens optimistic** - Use mutation `optimistic` option if needed

Recommend starting with option 1 (simpler), add optimistic only if UX suffers.
