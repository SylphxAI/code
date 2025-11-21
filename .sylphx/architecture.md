# Architecture

## System Overview

Multi-package TypeScript monorepo for AI-powered CLI development assistant.

**Key architectural decision**: Event-driven reactive state with Zen signals (preact signals wrapper) for fine-grained reactivity and optimal performance.

```
User Input → CLI (ink) → tRPC Client → Server → AI Providers
              ↑                                      ↓
           Zen Signals ← Event Stream ← Tool Execution
```

## Package Structure

### `@sylphx/code` (CLI Interface)
- **Tech**: React (ink), Zen signals
- **Role**: Terminal UI rendering
- **State**: Zen signals via `useZen()` hook

### `@sylphx/code-client` (Client Logic)
- **Tech**: Zen signals, tRPC client
- **Role**: Client-side state, server communication
- **State**: All global state in `signals/domain/`

### `@sylphx/code-server` (Backend)
- **Tech**: tRPC server, Node.js
- **Role**: AI orchestration, tool execution, event streaming
- **State**: Stateless (emits events)

### `@sylphx/code-core` (Shared Types)
- **Tech**: Pure TypeScript
- **Role**: Type definitions, utilities
- **State**: None

## State Management: Zen Signals

**WHY**: Fine-grained reactivity. Only components that read a signal re-render when it changes.

**Trade-off**: Learning curve for developers familiar with only React state vs predictable, performant updates.

### Signal Types

**Domain Signals** (`code-client/signals/domain/`)
- Session state: `currentSession`, `messages`
- AI config: `aiConfig`, `selectedProvider`
- Queue: `queuedMessages`
- UI: `currentScreen`, `selectedAgent`

**Computed Signals**
```ts
export const hasSession = computed(() => currentSession.value !== null);
```

**React Integration**
```ts
const session = useZen(currentSession); // Auto re-renders on change
```

## Event-Driven Communication

### Server → Client Events

**WHY**: Multi-client sync. Web GUI and CLI see same state in real-time.

**Architecture**:
```
Server Event Emitter → SSE Stream → Client Event Bus → Signal Updates
```

**Event Types**:
- `session-*`: Session lifecycle
- `message-*`: Message updates
- `step-*`: Streaming steps
- `tool-*`: Tool execution
- `ask-question-*`: User input requests

### Client → Server (tRPC)

Mutations for user actions:
```ts
trpc.message.sendMessage.mutate({ ... })
trpc.session.create.mutate()
```

## Component Patterns

### Pattern: Signal-Connected Component
```tsx
function MyComponent() {
  const session = useZen(currentSession); // Reactive
  return <Text>{session?.title}</Text>;
}
```

### Pattern: Computed Signal
```tsx
const title = useZen(computed(() => {
  return currentSession.value?.title || 'New Chat';
}));
```

### Pattern: Signal Actions
```tsx
import { setCurrentSession } from '@sylphx/code-client';

function switchSession(id: string) {
  setCurrentSession(sessions.find(s => s.id === id));
}
```

## Key Design Patterns

### Pattern: Event-Driven Streaming

**WHY**: Real-time updates. Server pushes events as AI generates content.

**Where**: AI message streaming
**Trade-off**: Complexity vs real-time UX

```
AI Stream → Server Orchestrator → Event Emitter → Client Handler → Signal Update
```

### Pattern: Optimistic Updates

**WHY**: Instant feedback. Don't wait for server confirmation.

**Where**: User messages, session creation
**Trade-off**: Rollback complexity vs perceived speed

```ts
// Show immediately
addOptimisticMessage(msg);

// Confirm from server
await trpc.message.send.mutate(msg);

// Update with server ID
updateMessage(tempId, { id: serverId });
```

### Pattern: Reactive Theme System

**WHY**: Runtime theme switching without full re-render.

**Where**: `utils/theme/store.ts`
**Trade-off**: Signal subscription overhead vs flexibility

```ts
export const currentTheme = signal<Theme>(initialTheme);

export function useColors() {
  const theme = useSyncExternalStore(
    subscribe,
    () => currentTheme.value.colors
  );
  return theme;
}
```

## Data Flow

### Read Path
```
Signal → useZen() → Component renders with current value
```

### Write Path
```
User action → Action function → Signal.value = X → useZen() re-renders consumers
```

### Server Sync Path
```
Server event → Event handler → Signal update → Components re-render
```

## Boundaries

**In scope:** CLI, local execution, file-based config, multi-agent orchestration

**Out of scope:** Cloud deployment, training AI models, web-first UI

## Performance Characteristics

**Signal reads**: O(1) - direct property access
**Signal writes**: O(subscribers) - notify only affected components
**React re-renders**: Minimal - only components using changed signals

**Bundle size**: Zen signals ~2KB (vs Redux ~15KB)

## SSOT References

- Dependencies: `package.json` files
- Event types: `packages/code-core/src/types/streaming-events.types.ts`
- Signal definitions: `packages/code-client/src/signals/domain/`
- tRPC routes: `packages/code-server/src/trpc/routers/`
