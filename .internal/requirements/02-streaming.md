# Real-Time Streaming & Event System

**Part**: 1 of 14
**User Stories**: UC1-5
**Related**: [Multi-Client Advanced](./11-multi-client.md), [Testing](./99-testing.md)

---

## Problem Statement

Users interact with the system through multiple clients (TUI, Web GUI) and need:
1. **Real-time streaming responses** from AI
2. **Multi-client synchronization** (same session across devices)
3. **Resumable streaming** (join ongoing streaming)
4. **Selective event delivery** (right events to right clients)

---

## Core Requirements

### R1.1: Real-Time Streaming
**Requirement**: Users MUST see AI responses stream in real-time, not wait for complete response.

**Acceptance Criteria**:
- User sends message
- AI response appears word-by-word (streaming)
- Tool calls appear as they execute
- User can see progress in real-time

**Why**: Better UX, feels responsive

---

### R1.2: Multi-Client Support
**Requirement**: Multiple clients MUST be able to interact with same session simultaneously.

**Acceptance Criteria**:
- User opens session in TUI and GUI
- Message sent from TUI appears in GUI immediately
- AI response streams to both clients in real-time
- Both clients stay synchronized

**Why**: Common workflow (desktop + mobile, multiple tabs)

---

### R1.3: Event-Driven Architecture
**Requirement**: System MUST use events for real-time updates, not polling.

**Acceptance Criteria**:
- State changes publish events
- Clients subscribe to relevant events
- Events delivered within 500ms
- No client-side polling

**Why**: Efficient, scalable, real-time

---

## User Stories

### UC1: Normal Streaming (User Sends Message)

**As a** user
**I want to** send a message and see AI response stream in real-time
**So that** I get immediate feedback and can monitor progress

**Flow**:
```
User types "hi"
  → Client calls subscription: caller.message.streamResponse.subscribe()
  → Server: streamAIResponse() returns Observable
  → Server emit events (text-delta, tool-call, tool-result, etc.)
  → Client onData callback receives events
  → Client displays streaming response
```

**Acceptance Criteria**:
- Text appears word-by-word as AI generates it
- Tool calls appear when they execute
- Tool results appear when they complete
- User can see "thinking" state (reasoning, if supported)
- Final message saved to session after completion

**Current Status**: ✅ Working

**Priority**: P0 (Critical)

---

### UC2: Command with Auto-Response (Compact with Streaming)

**As a** user
**I want to** execute commands that trigger AI responses
**So that** the system can automate workflows

**Example**: `/compact` command

**Flow**:
```
User executes /compact
  → Client calls mutation: caller.session.compact.mutate()
  → Server: generates summary, creates new session with system message
  → Server: automatically triggers AI streaming (internal business logic)
  → Server streaming AI response via event stream
  → Client receives streaming events (must through event subscription)
  → Client displays AI response
```

**Acceptance Criteria**:
- Command executes successfully
- AI response streams in real-time
- User sees streaming events (not just final result)
- New session created with correct state
- Client receives events without explicit subscription call

**Current Status**: ❌ Not working (client doesn't receive streaming events)

**Priority**: P0 (Critical)

**Technical Challenge**: How does client receive streaming events when mutation (not subscription) initiated the stream?

---

### UC3: Multi-Client Real-Time Sync

**As a** user with multiple clients open
**I want to** see actions in one client reflected immediately in other clients
**So that** I can work seamlessly across devices

**Scenario**:
```
User A (TUI) sends message
  → Server streaming
  → User A (TUI) sees streaming ✅
  → User B (GUI, same session) sees streaming in real-time ✅
  → Both clients synchronized
```

**Acceptance Criteria**:
- Message sent in one client appears in all clients
- AI response streams to all clients simultaneously
- Tool calls/results appear in all clients
- No client falls behind or misses events
- Works across device types (TUI ↔ GUI)

**Current Status**: ✅ Working (via event stream)

**Priority**: P0 (Critical)

---

### UC4: Resumable Streaming (Join Ongoing Stream)

**As a** user
**I want to** join an ongoing streaming session from a different client
**So that** I can monitor progress from any device

**Scenario**:
```
GUI in session A sends "hi"
  → Server streaming AI response
  → GUI sees streaming ✅

TUI switches from session B to session A (mid-stream)
  → TUI should see ongoing streaming ✅
  → TUI syncs in real-time: remaining text-delta, tool-call, etc.
  → TUI joins stream mid-flight (doesn't miss subsequent events)
```

**Acceptance Criteria**:
- User switches to session with active streaming
- Client receives remaining streaming events
- Client displays correct state (current text + new deltas)
- No missed events
- Seamless join experience

**Current Status**: ✅ Working (client subscribes to session channel)

**Priority**: P1 (High)

---

### UC5: Selective Event Delivery

**As the** system
**I want to** send events only to relevant clients
**So that** clients don't receive unnecessary data

**Scenario 1 - Session-Specific Events**:
```
TUI in session A
GUI in session B

Session A streaming (text-delta, tool-call):
  → TUI receives ✅ (subscribed to session:A)
  → GUI doesn't receive ✅ (subscribed to session:B, not session:A)
```

**Scenario 2 - Global Events**:
```
Session A title updates (AI generated title):
  → TUI receives ✅ (in session A, needs to update header)
  → GUI receives ✅ (needs to update sidebar session list)
  → Both clients update their UI appropriately
```

**Acceptance Criteria**:
- Session-specific events only go to clients in that session
- Global events go to all relevant clients
- Clients can subscribe to multiple event channels
- Event routing is efficient (no broadcast overhead)

**Event Channel Types**:
- `session:{sessionId}` - Session-specific events (streaming, messages, etc.)
- `session-events` - Global session events (created, deleted, title-updated)
- `global` - System-wide events (if needed)

**Current Status**: ✅ Working (event stream with channels)

**Priority**: P1 (High)

---

## Testing Acceptance Criteria

See [Testing Strategy](./99-testing.md#streaming-tests) for detailed test cases:
- Test Case S1: Normal Streaming
- Test Case S2: Multi-Client Streaming
- Test Case S3: Resumable Streaming
- Test Case S4: Command Auto-Response
- Test Case S5: Selective Delivery

---

## Related Sections

- [Message Operations](./04-messages.md#uc27-abort-streaming-response) - Abort streaming (UC27)
- [Multi-Client Advanced](./11-multi-client.md) - Event replay, persistence (UC78-80)
- [Token Calculation](./07-tokens.md#uc46-real-time-streaming-token-updates) - Token updates during streaming (UC46)
- [Slash Commands](./08-commands.md#uc58-compact---session-compaction) - `/compact` command (UC58)
