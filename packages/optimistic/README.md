# Optimistic Update System

Framework-agnostic optimistic update system with self-healing reconciliation.

## Architecture

### Core Concepts

**Operation-Based Mutations**
- Each state change defined as forward + inverse operation
- Apply operations optimistically (instant UI feedback)
- Rollback on server rejection or timeout
- Confirm when server acknowledges

**Self-Healing Reconciliation**
- Server state is source of truth
- Client reconciles pending operations with server events
- Automatic rollback when client prediction differs from server reality
- Multi-client safe (all clients converge to same state)

**Timeout-Based Cleanup**
- Pending operations expire after 10 seconds
- Automatic rollback prevents stuck optimistic state
- Cleanup runs every 5 seconds

## Components

### `types.ts`
Defines operation types and session state:
- `Operation` - Union type of all possible mutations (add-message, add-to-queue, etc.)
- `ServerEvent` - Events from server for reconciliation
- `SessionState` - Server state + pending operations layer
- `PendingOperation` - Operation with timestamp for timeout

### `operations.ts`
Implements forward and inverse operations:
- `applyOperation` - Apply operation to state (forward mutation)
- `applyInverse` - Reverse operation (rollback)
- `applyPendingOperations` - Layer pending ops onto server state

### `manager.ts`
Core optimistic manager:
- `apply(sessionId, operation)` - Add optimistic update, returns ID
- `confirm(sessionId, optimisticId)` - Server confirmed operation
- `rollback(sessionId, optimisticId)` - Server rejected or timeout
- `reconcile(sessionId, event)` - Self-heal on server event mismatch
- `getState(sessionId)` - Get computed state (server + optimistic layer)

### `integration.ts`
Bridge to session signals and event handlers:
- `sendUserMessageOptimistic` - Send with optimistic update (checks streaming state)
- `confirmOptimistic` - Confirm when server acknowledges
- `rollbackOptimistic` - Rollback on error
- `reconcileWithServer` - Self-heal from server events
- Event handler wrappers for queue events

### `index.ts`
Public API exports

## Usage

### Basic Flow

```typescript
import {
  optimisticManager,
  sendUserMessageOptimistic,
  confirmOptimistic,
  rollbackOptimistic,
} from '@sylphx/code-client';

// 1. Apply optimistic update
const optimisticId = sendUserMessageOptimistic({
  sessionId: 'session-123',
  content: 'Hello AI',
});

// 2. Send to server
try {
  const result = await api.sendMessage(...);

  // 3. Server confirmed → confirm optimistic operation
  confirmOptimistic('session-123', optimisticId, result);
} catch (error) {
  // 4. Server rejected → rollback
  rollbackOptimistic('session-123', optimisticId);
}
```

### Self-Healing Example

```typescript
// Client A sends message while streaming → adds to queue
const opId = sendUserMessageOptimistic({
  sessionId: 'session-123',
  content: 'User message',
});
// Client predicted: add-to-queue operation

// Server determines session is NOT streaming → adds to messages instead
// Server emits: user-message-created event

// Reconciliation (automatic):
// 1. Client receives user-message-created event
// 2. Reconciler detects mismatch (we predicted queue, server said messages)
// 3. Rollback our add-to-queue operation
// 4. Update server state with real message
// Result: UI shows message in correct location (messages, not queue)
```

### Event Handler Integration

Queue handlers automatically use optimistic reconciliation:

```typescript
// packages/code/src/screens/chat/streaming/handlers/queueHandlers.ts

export function handleQueueMessageAddedEvent(event, context) {
  // Uses optimistic wrapper for self-healing
  handleQueueMessageAddedWithOptimistic({
    sessionId: event.sessionId,
    message: event.message,
  });
  // Automatically reconciles pending operations
}
```

## Operation Types

### add-message
Add user message to conversation (optimistic)
- **Forward**: Append message to `serverMessages`
- **Inverse**: Remove message by `optimisticId`

### add-to-queue
Add message to queue (optimistic)
- **Forward**: Append to `serverQueue`
- **Inverse**: Remove from queue by `optimisticId`

### move-to-queue
Move message from conversation to queue
- **Forward**: Remove from messages, add to queue
- **Inverse**: Remove from queue, restore to messages

### move-to-conversation
Move message from queue to conversation
- **Forward**: Remove from queue, add to messages
- **Inverse**: Remove from messages, restore to queue

### remove-from-queue
Remove from queue (server-confirmed only)
- **Forward**: Filter out by `queueId`
- **Inverse**: Cannot reverse (no data to restore)

### update-message-status
Update message status (server-confirmed only)
- **Forward**: Update status field
- **Inverse**: Cannot reverse (no previous status stored)

## Server Event Reconciliation

### queue-message-added
When server adds message to queue:
- Check for conflicting `add-message` operation (client predicted wrong location)
- Rollback conflicting operation
- Apply correct operation: `add-to-queue`

### queue-cleared
When server clears queue:
- Find all pending `add-to-queue` operations for session
- Rollback all pending queue operations
- Server state wins

### user-message-created
When server confirms user message:
- Reconcile by content match (simple)
- Future: Track optimistic ID → server ID mapping

### message-status-updated
When server updates message status:
- Update message in session signals
- Reconcile optimistic state

## State Management

### Session State Structure

```typescript
interface SessionState {
  sessionId: string;
  // Server state (source of truth)
  serverMessages: Message[];
  serverQueue: QueuedMessage[];
  // Optimistic operations (pending confirmation)
  pending: PendingOperation[];
}
```

### Computed State

```typescript
// Get state with optimistic layer applied
const state = optimisticManager.getState(sessionId);
// state.serverMessages includes:
//   - Confirmed messages from server
//   - Optimistic messages (pending confirmation)
```

## Multi-Client Safety

**Scenario**: Two clients send message simultaneously

Client A:
1. Sends message while idle → optimistically adds to messages
2. Server receives A first → adds to messages, emits user-message-created
3. Client A reconciles: optimistic matches server → confirm

Client B:
1. Sends message while idle → optimistically adds to messages
2. Server receives B second (now streaming) → adds to queue, emits queue-message-added
3. Client B reconciles: mismatch detected (predicted messages, server said queue)
4. Client B rolls back add-message, applies add-to-queue
5. Result: Both clients show same state (A in messages, B in queue)

## Performance

**Memory**: ~500 bytes per pending operation
**Cleanup**: Automatic timeout after 10 seconds
**Reconciliation**: O(n) where n = pending operations per session

## Trade-offs

**Benefits:**
- Instant UI feedback (no waiting for server)
- Multi-client consistency (auto reconciliation)
- Error recovery (automatic rollback)
- Framework-agnostic (shared between TUI/GUI)

**Costs:**
- Memory overhead (pending operations tracked)
- Complexity (operation inverses must be correct)
- Edge cases (race conditions between operations)

## Future Enhancements

1. **Optimistic ID Mapping**
   - Track optimistic ID → server ID mapping
   - More precise confirmation (avoid content matching)

2. **Conflict Resolution Strategies**
   - User-defined conflict handlers
   - Configurable reconciliation policies

3. **Computed Signals**
   - zen computed signals for optimistic messages/queue
   - Reactive updates (automatically recompute on state change)

4. **Operation Batching**
   - Batch multiple operations into single update
   - Reduce reconciliation overhead

5. **Undo/Redo**
   - Leverage operation history for undo/redo
   - User can revert accidental actions
