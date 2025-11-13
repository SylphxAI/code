# Multi-Client Advanced Scenarios

**Part**: 10 of 14
**User Stories**: UC78-80
**Related**: [Streaming](./02-streaming.md), [Sessions](./03-sessions.md), [Token Calculation](./07-tokens.md)

---

## Problem Statement

Multi-client support requires handling:
1. **Late joins** (event replay)
2. **Selective delivery** (right events to right clients)
3. **Event persistence** (replay after restart)
4. **Conflict resolution** (rare but possible)

---

## User Stories

### UC78: Event Replay for Late Joiners

**As a** user
**I want** late-joining clients to receive recent events
**So that** they can catch up to current state

**Acceptance Criteria**:
- Replay last N events (configurable)
- Cursor-based pagination for history
- Filtered by channel subscription
- Efficient (no full event log scan)

**Priority**: P1 (High)

---

### UC79: Event Persistence

**As the** system
**I want to** persist events to database
**So that** they can be replayed after server restart

**Acceptance Criteria**:
- SQLite storage for events
- TTL-based cleanup (e.g., 24 hours)
- Efficient read by cursor
- Supports multiple channels

**Priority**: P1 (High)

---

### UC80: Session List Sync Edge Cases

**As a** user with multiple clients
**I want** session list to handle edge cases correctly
**So that** I don't see stale or duplicate data

**Edge Cases**:
- Session deleted in one client → removed from all clients
- Session title updated → propagates to all clients
- New session created → appears in all clients
- Network reconnect → resync without duplicates

**Priority**: P1 (High)

---

## Multi-Client Scenarios

### Scenario 1: Late Join During Streaming

```
Client A opens session, sends message
  → AI starts streaming
  → Client A sees streaming ✅

Client B opens same session mid-stream
  → Client B replays recent events (shows current partial message)
  → Client B joins real-time stream for remaining content
  → Both clients show identical final state
```

**Related**: See [UC4: Resumable Streaming](./02-streaming.md#uc4-resumable-streaming-join-ongoing-stream)

---

### Scenario 2: Session List Synchronization

```
Client A in sessions list
Client B in sessions list

Client A creates new session
  → Event published to session-events channel
  → Client B receives session-created event
  → Client B's list updates with new session
  → Both clients show identical session lists
```

**Related**: See [UC21: Session List Multi-Client Sync](./03-sessions.md#uc21-session-list-multi-client-sync)

---

### Scenario 3: Token Count Synchronization

```
Client A and Client B viewing same session

Client A sends message
  → AI streams response
  → Token events published during streaming
  → Both Client A and Client B receive token updates
  → Both clients show identical token counts
```

**Related**: See [UC47: Multi-Tab Token Sync](./07-tokens.md#uc47-multi-tab-token-sync)

---

## Event Channel Architecture

### Channel Types

1. **Session-Specific Channels**: `session:{sessionId}`
   - Streaming events (text-delta, tool-call, etc.)
   - Message events (created, updated)
   - Token count updates
   - Session state changes

2. **Global Channels**: `session-events`
   - Session created
   - Session deleted
   - Session title updated
   - Session list changes

3. **System Channels**: `global` (if needed)
   - System-wide announcements
   - Maintenance notifications

### Event Routing

```
Event Publisher
  ├─> Channel Router
  │   ├─> Session-Specific Channel (filtered)
  │   ├─> Global Channel (broadcast)
  │   └─> System Channel (broadcast)
  │
  ├─> Event Persistence Layer
  │   └─> SQLite Database
  │
  └─> Active Subscribers
      ├─> Client A (subscribed to session:A)
      ├─> Client B (subscribed to session:B)
      └─> Client C (subscribed to session-events)
```

---

## Event Replay Mechanism

### Replay on Subscribe

```
Client subscribes to session:{sessionId}
  → Server checks for recent events in database
  → Server sends last N events (e.g., last 50 or last 5 minutes)
  → Client reconstructs current state
  → Client joins real-time stream for new events
```

### Replay Parameters

- **Time Window**: Last 5 minutes (configurable)
- **Event Count**: Last 50 events (configurable)
- **Channel Filter**: Only events for subscribed channels
- **Cursor-Based**: Client can request older events if needed

---

## Conflict Resolution

### Race Conditions

**Scenario**: Two clients try to perform conflicting operations

**Resolution Strategies**:
1. **Last-Write-Wins**: Most recent operation wins (based on server timestamp)
2. **Optimistic Locking**: Version numbers prevent conflicts
3. **Event Sourcing**: All events preserved, conflicts resolved by replay

**Current Approach**: Last-Write-Wins with event broadcasting

---

## Performance Considerations

### Event Storage

- **Retention**: 24 hours (configurable)
- **Cleanup**: Background job removes old events
- **Indexing**: Channel + timestamp for fast queries
- **Compression**: Large events (e.g., tool outputs) may be compressed

### Network Efficiency

- **Batching**: Multiple events can be batched (optional)
- **Compression**: WebSocket compression enabled
- **Delta Encoding**: Only send changes, not full state

---

## Related Sections

- [Streaming](./02-streaming.md) - Real-time event delivery (UC1-5)
- [Sessions](./03-sessions.md) - Session list sync (UC21)
- [Token Calculation](./07-tokens.md) - Token count sync (UC47)
- [Testing](./99-testing.md) - Multi-client test cases (PR-2)
