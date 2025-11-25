# Lens Perfect Refactor - Execution Plan

**Status**: 🚧 In Progress
**Started**: 2025-01-25
**Principle**: Frontend-Driven, No Workarounds, Perfect Architecture Only

---

## Overview

Complete rewrite to embrace Lens frontend-driven architecture:
- ❌ Delete all Signals (23 files)
- ❌ Delete all composable hooks (useCurrentSession, useEventStream, etc.)
- ❌ Delete all manual subscription management
- ✅ Components directly use `useQuery(client.op().select({ ... }))`
- ✅ Lens handles everything: state, subscription, optimistic updates, cleanup

---

## Phase 1: Analysis & Preparation

### 1.1 Inventory Current Architecture

**Signals to Delete** (packages/code-client/src/signals/):
- domain/session/
- domain/queue/
- domain/settings/
- domain/mcp/
- domain/ui/
- domain/bash/
- domain/models/
- domain/providers/
- domain/files/
- domain/theme/
- domain/ai/
- react-bridge.ts
- persistence/
- effects/
- computed/

**Hooks to Delete/Refactor**:
- useCurrentSession → Direct useQuery in components
- useEventStream → Direct useQuery(client.subscribeToSession())
- useChat → Direct useMutation in components
- useBackgroundBashCount → Direct useQuery
- useTotalTokens → Direct useQuery
- useMCPStatus → Direct useQuery
- useModelDetails → Direct useQuery
- useQueuedMessages → Direct useQuery
- useProviders → Direct useQuery
- useModels → Direct useQuery
- useAIConfig → Direct useQuery

**Components to Refactor**:
- Chat.tsx
- StatusBar.tsx
- ChatMessages.tsx
- TodoList.tsx
- All other components using signals/hooks

---

## Phase 2: Create Minimal Infrastructure

### 2.1 Verify Lens React Hooks

Check that these are available:
- ✅ `useQuery` from `@lens/react`
- ✅ `useMutation` from `@lens/react`
- ✅ `useLensClient` from `@sylphx/code-client`

### 2.2 Create Migration Helpers (Temporary)

Create temporary helpers to ease migration:

```typescript
// packages/code/src/utils/lens-helpers.ts
import { useLensClient } from "@sylphx/code-client";
import { useQuery } from "@lens/react";

/**
 * Temporary helper - will be deleted after migration
 * Shows correct pattern for session queries
 */
export function exampleSessionQuery() {
  const client = useLensClient();
  const sessionId = "...";

  const { data: session } = useQuery(
    client.getSession({ id: sessionId }).select({
      title: true,
      status: true,
    })
  );

  return session;
}
```

---

## Phase 3: Refactor Core Components (One by One)

### 3.1 StatusBar Component

**Current** (uses many hooks):
```typescript
function StatusBar() {
  const totalTokens = useTotalTokens();  // Signal
  const bashCount = useBackgroundBashCount();  // Manual subscription
  const mcpStatus = useMCPStatus();  // Signal
  const modelDetails = useModelDetails(provider, model);  // tRPC
}
```

**Target**:
```typescript
function StatusBar() {
  const client = useLensClient();
  const sessionId = useCurrentSessionId();

  // Direct query for session data
  const { data: session } = useQuery(
    client.getSession({ id: sessionId }).select({
      totalTokens: true,
      provider: true,
      model: true,
    })
  );

  // Direct query for bash processes
  const { data: bashProcesses } = useQuery(
    client.listBash()
  );
  const bashCount = bashProcesses?.filter(p => !p.isActive && p.status === 'running').length || 0;

  // Direct query for MCP status
  const { data: mcpServers } = useQuery(
    client.listMCPServers()
  );
  const mcpStatus = mcpServers?.length || 0;
}
```

### 3.2 Chat Component

**Current** (uses useChatState + useChatEffects):
```typescript
function Chat() {
  const state = useChatState();  // Many signals
  const effects = useChatEffects(state);  // Manual subscriptions
}
```

**Target**:
```typescript
function Chat() {
  const client = useLensClient();
  const sessionId = useCurrentSessionId();

  // Direct query for session
  const { data: session } = useQuery(
    client.getSession({ id: sessionId }).select({
      id: true,
      title: true,
      status: true,
      messages: {
        select: {
          id: true,
          role: true,
          content: true,
          steps: {
            select: {
              parts: true,
            }
          }
        }
      }
    })
  );

  // Direct query for streaming events
  const { data: events } = useQuery(
    client.subscribeToSession({
      sessionId,
      replayLast: 50,
    })
  );

  // Direct mutation for sending messages
  const { mutate: sendMessage } = useMutation(
    () => client.triggerStream({ sessionId, content })
  );
}
```

### 3.3 TodoList Component

**Current**:
```typescript
function TodoList() {
  const session = useCurrentSession();  // Signal
  return session?.todos.map(todo => ...);
}
```

**Target**:
```typescript
function TodoList() {
  const client = useLensClient();
  const sessionId = useCurrentSessionId();

  const { data: session } = useQuery(
    client.getSession({ id: sessionId }).select({
      todos: true,  // Only need todos
    })
  );

  return session?.todos.map(todo => ...);
}
```

---

## Phase 4: Delete Old Infrastructure

### 4.1 Delete Signals

```bash
rm -rf packages/code-client/src/signals/
```

### 4.2 Delete Obsolete Hooks

Delete these files:
- packages/code/src/hooks/client/useCurrentSession.ts
- packages/code/src/hooks/client/useEventStream.ts
- packages/code/src/hooks/client/useChat.ts
- packages/code/src/hooks/client/useBackgroundBashCount.ts
- packages/code/src/hooks/client/useTotalTokens.ts
- packages/code/src/hooks/client/useMCPStatus.ts
- packages/code/src/hooks/client/useQueuedMessages.ts
- All other signal-based hooks

### 4.3 Update Exports

Remove signal exports from:
- packages/code-client/src/index.ts

---

## Phase 5: Testing

### 5.1 Unit Tests

Test each component in isolation:
- StatusBar renders correctly with useQuery
- Chat component fetches session correctly
- TodoList displays todos from useQuery

### 5.2 Integration Tests

Test data flows:
- Session updates propagate to all components
- Streaming events appear in Chat
- Mutations update optimistically

### 5.3 E2E Tests

Test user flows:
- Start new session
- Send message → streaming works
- Switch sessions → all components update
- Multiple components showing same data stay in sync

---

## Phase 6: Cleanup & Documentation

### 6.1 Remove Migration Helpers

Delete temporary migration helpers

### 6.2 Update Documentation

Update docs to show correct patterns:
- docs/architecture/lens.md
- README.md

### 6.3 Final Commit

Commit with comprehensive summary of refactor

---

## Execution Order

1. ✅ Create this plan
2. ⏳ Refactor StatusBar (simplest component)
3. ⏳ Test StatusBar works
4. ⏳ Refactor Chat (complex component)
5. ⏳ Test Chat works
6. ⏳ Refactor all other components
7. ⏳ Delete signals
8. ⏳ Delete obsolete hooks
9. ⏳ Full test suite
10. ⏳ Final cleanup

---

## Success Criteria

- ✅ Zero signals
- ✅ Zero composable hooks (useCurrentSession, etc.)
- ✅ All components use useQuery/useMutation directly
- ✅ All tests passing
- ✅ Streaming works perfectly
- ✅ Optimistic updates automatic
- ✅ Multi-component sync works
- ✅ No manual subscription management
- ✅ No manual state management

---

## Risks & Mitigation

**Risk**: Breaking existing functionality
**Mitigation**: Incremental refactor, test after each component

**Risk**: Lens hooks not available
**Mitigation**: Verify @lens/react exports before starting

**Risk**: Too many changes at once
**Mitigation**: One component at a time, commit frequently

---

## Notes

- No backward compatibility needed
- No workarounds allowed
- Perfect architecture only
- Frontend-driven principle
- Components declare what they need
- Lens handles everything else
