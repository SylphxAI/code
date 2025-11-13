# Event Stream Architecture Proposal

## Current State

**Hybrid Model:**
- Streaming events (text-delta, title-delta) → Event Stream ✅
- CRUD operations (create session, update title) → Direct tRPC calls ❌

**Problem:** Multi-client not fully synced
- TUI session A + GUI session A
- GUI sends message → TUI sees it immediately ✅ (event stream)
- GUI creates session → TUI doesn't see it ❌ (direct call)

## Proposed Architecture

### 1. Full Event-Driven Model

**All mutations go through event stream:**

```typescript
// Session operations
eventStream.publish('session:*', {
  type: 'session-created',
  sessionId: 'xxx',
  provider: 'anthropic',
  model: 'claude-3-5-sonnet',
})

eventStream.publish('session:*', {
  type: 'session-title-updated',
  sessionId: 'xxx',
  title: 'New Title',
})

eventStream.publish('session:*', {
  type: 'session-deleted',
  sessionId: 'xxx',
})

// Config operations
eventStream.publish('config:ai', {
  type: 'provider-added',
  provider: 'anthropic',
  config: { ... },
})

eventStream.publish('config:ai', {
  type: 'model-selected',
  provider: 'anthropic',
  model: 'claude-3-5-sonnet',
})
```

### 2. Client Subscription Strategy

**Each client subscribes to multiple channels:**

```typescript
// Subscribe to app-level events
useEventStream({ channel: 'app:*', callbacks: { ... } })

// Subscribe to current session
useEventStream({ channel: `session:${sessionId}`, callbacks: { ... } })

// Subscribe to all sessions (for session list)
useEventStream({ channel: 'session:*', callbacks: { ... } })

// Subscribe to config changes
useEventStream({ channel: 'config:*', callbacks: { ... } })
```

### 3. Event Channel Design

```
app:*              - App-level events (startup, shutdown)
session:*          - All session events (for session list sync)
session:{id}       - Specific session events (current session)
config:ai          - AI config changes
config:rules       - Rule toggles
config:agents      - Agent changes
```

### 4. Implementation Plan

#### Phase 1: Session CRUD Events
- [ ] session-created
- [ ] session-deleted
- [ ] session-title-updated
- [ ] session-model-updated
- [ ] session-provider-updated

#### Phase 2: Multi-Client Session List Sync
- [ ] Subscribe to `session:*` in Dashboard/SessionList
- [ ] Real-time session list updates
- [ ] TUI + GUI session lists always in sync

#### Phase 3: Config Sync
- [ ] provider-added/updated/removed
- [ ] model-selected
- [ ] rule-toggled
- [ ] agent-selected

#### Phase 4: Collaborative Features
- [ ] Multiple users can view same session
- [ ] Presence indicators ("User X is viewing")
- [ ] Conflict resolution

## Benefits

### 1. Complete Real-Time Sync
- All clients see all changes immediately
- No polling, no manual refresh
- Works across TUI, GUI, and future clients

### 2. Event Sourcing
- Complete audit trail of all operations
- Can replay any sequence of events
- Easy debugging (see exactly what happened)

### 3. Offline Support
- Queue events when offline
- Replay when back online
- Conflict resolution built-in

### 4. Scalability
- Horizontal scaling (multiple servers)
- Load balancing (distribute subscriptions)
- Works with Redis/Kafka for production

## Migration Strategy

### Step 1: Dual Write (Backwards Compatible)
```typescript
// Write to both old (tRPC direct) and new (event stream)
await trpc.session.updateTitle({ sessionId, title })
await eventStream.publish(`session:${sessionId}`, { type: 'session-title-updated', title })
```

### Step 2: Gradual Migration
- Enable event stream for new features
- Migrate existing features one by one
- Keep old API for backwards compatibility

### Step 3: Full Cutover
- Remove direct tRPC calls
- All mutations go through event stream
- tRPC queries remain (read-only)

## Alternative: Keep Hybrid (Not Recommended)

If you want to keep current hybrid model:

**Pros:**
- Less refactoring
- Simpler mental model (CRUD vs streams)

**Cons:**
- ❌ Multi-client not fully synced
- ❌ Need manual polling for session list
- ❌ More complex codebase (two patterns)

## Recommendation

**Go full event-driven.** Here's why:

1. You already built the infrastructure (EventPersistence, AppEventStream)
2. You already handle streaming events (title-delta, text-delta)
3. You explicitly want multi-client sync
4. Event sourcing gives you powerful debugging + replay capabilities

The refactoring is straightforward:
- Move mutations from tRPC calls to event publishes
- Add subscriptions in UI components
- Event handlers already exist (subscriptionAdapter.ts)

## Next Steps

1. Decide: Full event-driven vs keep hybrid
2. If full: Start with Phase 1 (session CRUD events)
3. Update todos accordingly
4. Implement session-created event first (smallest change)
5. Test TUI + GUI sync

Let me know your decision and I'll implement it! 🚀
