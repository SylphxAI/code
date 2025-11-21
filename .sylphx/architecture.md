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
- `session-*`: Session lifecycle, status updates
- `message-*`: Message updates
- `step-*`: Streaming steps
- `tool-*`: Tool execution
- `ask-question-*`: User input requests
- `session-status-updated`: Real-time session progress updates

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

## Session Status Architecture

**WHY**: Unified progress indicator controlled by backend. Displays current activity (tool execution, thinking, todo progress) with duration and token usage.

**Trade-off**: Backend complexity (status text generation) vs frontend flexibility (can display in multiple locations consistently).

### Status Data Structure
```ts
interface SessionStatus {
  text: string;         // "Implementing user auth" | "Thinking..." | "Reading files..."
  duration: number;     // Milliseconds since activity started
  tokenUsage: number;   // Cumulative tokens used
  isActive: boolean;    // true = streaming, false = completed/idle
}
```

### Backend Status Text Generation

**Current implementation**: Rule-based
```ts
// Priority order:
1. In-progress todo exists → Use todo.activeForm
2. Tool executing → "Reading files...", "Writing code...", "Running command..."
3. Default → "Thinking..."
```

**Future enhancement**: LLM-generated semantic descriptions
- Fast LLM (Haiku) analyzes context (tools used, files modified, etc.)
- Generates precise status: "Analyzing authentication flow in 3 files..."

### Event Flow (Pub-Sub Pattern)
```
Tool Execution / Token Updates / Todo Changes (Publishers)
                    ↓
        Emit tool-call, tool-result, session-tokens-updated (Raw Events)
                    ↓
        Session Status Manager (Subscriber)
          - Listens to relevant events
          - Maintains internal state (currentTool, startTime, tokenUsage)
          - Determines status text via determineStatusText()
          - Emits session-status-updated when state changes
                    ↓
        Client updates session.status signal
                    ↓
        UI components re-render (StatusIndicator, SessionList)
```

**Why Pub-Sub**: Separation of concerns. Tool execution logic doesn't know about session status. Status manager reacts to events and maintains its own state.

### Display Locations

**Chat Screen** (StatusIndicator component):
```
⠙ Implementing user authentication · 1.2s · 150 tokens (ESC to cancel)
```

**Session List** (multi-session overview):
```
📝 Fix auth bug     ⠙ Running tests · 5.2s · 1.2K tokens
📝 Add feature      ⠿ Writing code · 15s · 850 tokens
📝 Refactor DB      [Idle]
```

### Integration Points
- **Token Tracking**: Session Status Manager subscribes to `session-tokens-updated` events
- **Todo System**: Manager receives initial todos, updates when todos change
- **Tool Execution**: Manager subscribes to `tool-call` and `tool-result` events
- **Duration Tracking**: Manager tracks elapsed time since streaming started

### Implementation: Session Status Manager
**Module**: `packages/code-server/src/services/streaming/session-status-manager.ts`

**Responsibility**: React to events and emit session-status-updated

**Lifecycle**:
```typescript
// 1. Create manager at streaming start
const statusManager = createSessionStatusManager(observer, sessionId, session.todos);

// 2. Manager subscribes to events internally
// 3. Manager emits session-status-updated automatically
// 4. Cleanup at streaming end
statusManager.cleanup();
```

**Event Subscriptions**:
- `tool-call` → Update currentTool, emit status
- `tool-result` / `tool-error` → Clear currentTool, emit status
- `session-tokens-updated` → Update tokenUsage, emit status
- Todo changes → Update todos, recalculate statusText, emit status

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
