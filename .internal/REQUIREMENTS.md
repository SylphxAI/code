# System Requirements & User Stories

**Document Type**: Specification (WHAT, not HOW)
**Last Updated**: 2025-01-XX
**Status**: Living Document

---

## 🎯 Overview

This document defines the **requirements and user stories** for the entire system. It focuses on WHAT the system should do, not HOW it should be implemented.

**Key Principles**:
- Architecture-agnostic (implementation can evolve)
- User-centric (based on real use cases)
- Testable (clear acceptance criteria)
- Living document (updates as requirements evolve)

---

# Part 1: Real-Time Streaming & Event System

## 📋 Problem Statement

Users interact with the system through multiple clients (TUI, Web GUI) and need:
1. **Real-time streaming responses** from AI
2. **Multi-client synchronization** (same session across devices)
3. **Resumable streaming** (join ongoing streaming)
4. **Selective event delivery** (right events to right clients)

---

## 🎯 Core Requirements

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

## 👤 User Stories - Streaming

### UC1: Normal Streaming (用戶發送消息)

**As a** user
**I want to** send a message and see AI response stream in real-time
**So that** I get immediate feedback and can monitor progress

**Flow**:
```
User 輸入 "hi"
  → Client 調用 subscription: caller.message.streamResponse.subscribe()
  → Server: streamAIResponse() 返回 Observable
  → Server emit events (text-delta, tool-call, tool-result, etc.)
  → Client onData callback 接收 events
  → Client 顯示 streaming response
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

### UC7: Command with Auto-Response (Compact with Streaming)

**As a** user
**I want to** execute commands that trigger AI responses
**So that** the system can automate workflows

**Example**: `/compact` command

**Flow**:
```
User 執行 /compact
  → Client 調用 mutation: caller.session.compact.mutate()
  → Server: 生成 summary，創建新 session with system message
  → Server: 自動觸發 AI streaming (業務邏輯內部)
  → Server streaming AI response via event stream
  → Client 接收 streaming events (必須透過 event subscription)
  → Client 顯示 AI response
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

### UC8: Multi-Client Real-Time Sync

**As a** user with multiple clients open
**I want to** see actions in one client reflected immediately in other clients
**So that** I can work seamlessly across devices

**Scenario**:
```
User A (TUI) 發送消息
  → Server streaming
  → User A (TUI) 看到 streaming ✅
  → User B (GUI, same session) 實時看到 streaming ✅
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

### UC9: Resumable Streaming (跨 Client 同步進行中的 Streaming)

**As a** user
**I want to** join an ongoing streaming session from a different client
**So that** I can monitor progress from any device

**Scenario**:
```
GUI 在 session A 發送 "hi"
  → Server streaming AI response
  → GUI 看到 streaming ✅

TUI 從 session B 切換到 session A (mid-stream)
  → TUI 應該看到正在進行的 streaming ✅
  → TUI 實時同步 remaining text-delta, tool-call, etc.
  → TUI joins stream mid-flight (不會錯過後續 events)
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

### UC10: Selective Event Delivery (事件選擇性送達)

**As the** system
**I want to** send events only to relevant clients
**So that** clients don't receive unnecessary data

**Scenario 1 - Session-Specific Events**:
```
TUI 在 session A
GUI 在 session B

Session A streaming (text-delta, tool-call):
  → TUI 收到 ✅ (subscribed to session:A)
  → GUI 不收到 ✅ (subscribed to session:B, not session:A)
```

**Scenario 2 - Global Events**:
```
Session A title 更新 (AI generated title):
  → TUI 收到 ✅ (in session A, needs to update header)
  → GUI 收到 ✅ (needs to update sidebar session list)
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

## 🧪 Testing Acceptance Criteria - Streaming

### Test Case S1: Normal Streaming
**Steps**:
1. User sends message "hi"
2. Observe streaming in client

**Expected**:
- Text appears progressively
- Tool calls appear when executed
- Tool results appear when completed
- Final message saved correctly

**Priority**: P0

---

### Test Case S2: Multi-Client Streaming
**Steps**:
1. Open session in 2 clients
2. Send message in Client 1
3. Observe both clients

**Expected**:
- Both clients show streaming simultaneously
- Both clients show identical content
- No desync or missing events

**Priority**: P0

---

### Test Case S3: Resumable Streaming
**Steps**:
1. Start streaming in Client 1
2. Open session in Client 2 mid-stream
3. Observe Client 2

**Expected**:
- Client 2 shows current state
- Client 2 receives remaining events
- No errors or crashes

**Priority**: P1

---

### Test Case S4: Command Auto-Response
**Steps**:
1. Execute `/compact` command
2. Observe streaming response

**Expected**:
- Command executes successfully
- AI response streams in real-time
- Client shows streaming events
- New session created correctly

**Priority**: P0

---

### Test Case S5: Selective Delivery
**Steps**:
1. Open Client 1 in session A
2. Open Client 2 in session B
3. Send message in session A
4. Update title in session A

**Expected**:
- Streaming events: Only Client 1 receives
- Title update: Both clients receive
- Client 2 doesn't get session A streaming

**Priority**: P1

---

# Part 2: Token Calculation System

## 📋 Problem Statement

Users need to see accurate token usage counts throughout their session, but token counts are NOT static:

1. **Agent changes mid-session** → System prompt changes → Base context changes
2. **Rules change mid-session** → System prompt changes → Base context changes
3. **Model changes mid-session** → Tokenizer changes → ALL historical counts change

**User Quote** (Original Requirements):
> "你唔可以咁樣，因為session 去到一半都可以轉agent, 轉system prompt 甚至轉tools"
>
> Translation: "You can't cache tokens, because mid-session you can change agent, system prompt, even tools"

> "甚至歷史用量都唔係固定，轉model就會轉tokenizer (auto tokenizer會根據model去推斷用咩tokenizer)"
>
> Translation: "Even historical usage is not fixed. Changing model changes tokenizer (auto tokenizer infers which tokenizer based on model)"

> "所以全部歷史都唔係固定"
>
> Translation: "So all history is not fixed"

---

## 🎯 Core Requirements

### R2.1: SSOT (Single Source of Truth)
**Requirement**: All token displays MUST show identical numbers for the same state.

**Acceptance Criteria**:
- StatusBar shows: "443 / 256k (0%)"
- `/context` command shows: "Total: 443 tokens"
- ✅ Numbers MUST match exactly

**Why**:
- User confusion if different parts of UI show different numbers
- Loss of trust in the system
- Debugging nightmares

---

### R2.2: Real-Time Updates
**Requirement**: Token counts MUST update immediately when session state changes.

**State Changes That Affect Tokens**:
- Message sent/received
- Agent switched
- Model switched
- Rules toggled on/off

**Acceptance Criteria**:
- User switches agent → StatusBar updates within 1 second
- User sends message → StatusBar shows optimistic update during streaming
- User toggles rule → StatusBar reflects new count immediately

**Why**:
- User needs to monitor context usage to avoid hitting limits
- Real-time feedback improves UX

---

### R2.3: Multi-Client Synchronization
**Requirement**: Multiple clients viewing the same session MUST see synchronized token counts.

**Scenario**:
- User has 2 browser tabs open
- User sends message in Tab 1
- Both Tab 1 and Tab 2 MUST show same token count

**Acceptance Criteria**:
- During streaming: Both tabs update in real-time
- After message: Both tabs show identical final count
- No polling required (event-driven)

**Why**:
- Common workflow: Multiple devices/tabs
- Prevents confusion about session state

---

### R2.4: Volatile State Handling
**Requirement**: System MUST handle the fact that token counts are volatile (not cacheable).

**Volatile Factors**:
1. **Agent Change**: Different agents have different system prompts
   - Coder agent: 250 tokens
   - Planner agent: 350 tokens
   - Same session, different base context

2. **Rules Change**: Toggling rules changes system prompt length
   - 5 rules enabled: 450 tokens
   - 3 rules enabled: 380 tokens
   - Same session, different base context

3. **Model Change**: Different tokenizers count differently
   - Claude tokenizer: "Hello world" = 3 tokens
   - GPT-4 tokenizer: "Hello world" = 2 tokens
   - Same text, different count

**Acceptance Criteria**:
- System MUST recalculate when any volatile factor changes
- Cached values MUST NOT cause stale data
- User MUST see accurate count for current state

**Why**:
- Incorrect counts can cause:
  - User hitting context limits unexpectedly
  - User avoiding limits unnecessarily
  - Loss of trust in the system

---

## 👤 User Stories - Token Calculation

### UC6: View Current Context Usage
**As a** user
**I want to** see how many tokens I'm currently using
**So that** I can monitor my usage and avoid hitting context limits

**Acceptance Criteria**:
- StatusBar displays: `[used] / [limit] ([percentage]%)`
- Example: "1,250 / 200,000 (1%)"
- Updates in real-time as I interact with the system
- Always accurate for current session state

**Priority**: P0 (Critical)

---

### UC7: See Token Breakdown
**As a** user
**I want to** see a detailed breakdown of where my tokens are used
**So that** I can understand what's consuming my context

**Acceptance Criteria**:
- `/context` command shows:
  ```
  System: 250 tokens
  Tools: 193 tokens
  Messages: 807 tokens
  ────────────────
  Total: 1,250 tokens
  ```
- Breakdown MUST match StatusBar total
- Updates when I run the command (not cached)

**Priority**: P0 (Critical)

---

### UC8: Switch Agent Mid-Session
**As a** user
**I want to** switch to a different agent mid-session
**So that** I can use different agent capabilities without starting over

**Scenario**:
1. User is using "coder" agent
2. StatusBar shows: "443 / 200k (0%)"
3. User types: `/agent planner`
4. StatusBar updates to: "560 / 200k (0%)" (planner has longer prompt)

**Acceptance Criteria**:
- Token count updates immediately after agent switch
- New count reflects new agent's system prompt
- Session history preserved
- No weird glitches or incorrect counts

**Priority**: P0 (Critical)

---

### UC9: Switch Model Mid-Session
**As a** user
**I want to** switch to a different model mid-session
**So that** I can try different models without losing my conversation

**Scenario**:
1. User is using Claude Sonnet
2. StatusBar shows: "1,250 / 200k (1%)"
3. User types: `/model gpt-4`
4. StatusBar recalculates: "1,180 / 128k (1%)" (different tokenizer + limit)

**Acceptance Criteria**:
- Token count recalculates with new model's tokenizer
- ALL historical messages recounted (not just new ones)
- Model's context limit updates in display
- User can switch back and forth without issues

**Priority**: P0 (Critical)

---

### UC10: Toggle Rules Mid-Session
**As a** user
**I want to** enable/disable rules mid-session
**So that** I can control which rules apply without restarting

**Scenario**:
1. User has 5 rules enabled
2. StatusBar shows: "850 / 200k (0%)"
3. User types: `/rules` and disables 2 rules
4. StatusBar updates: "720 / 200k (0%)" (less prompt text)

**Acceptance Criteria**:
- Token count updates after toggling rules
- System prompt recalculates with new rule set
- Can toggle rules multiple times
- Each toggle updates count immediately

**Priority**: P1 (High)

---

### UC11: Real-Time Streaming Updates
**As a** user
**I want to** see token count update while AI is responding
**So that** I can monitor usage in real-time

**Scenario**:
1. User sends message
2. AI starts responding
3. StatusBar updates continuously: 1,250 → 1,300 → 1,350 → ...
4. AI finishes
5. StatusBar shows final accurate count

**Acceptance Criteria**:
- Optimistic updates during streaming (fast, approximate)
- Checkpoint updates on step completion (accurate)
- Final update after response complete (accurate)
- No jarring jumps in count (smooth progression)

**Priority**: P1 (High)

**Performance Requirement**:
- User requirement: "反正有任何異動都要即刻通知client去實時更新"
  - Translation: "Any changes must immediately notify client for real-time updates"

---

### UC12: Multi-Tab Sync
**As a** user
**I want to** open the same session in multiple tabs
**So that** I can work across devices/windows

**Scenario**:
1. User opens session in Tab 1
2. User opens same session in Tab 2
3. User sends message in Tab 1
4. Both tabs show real-time streaming updates
5. Both tabs show identical final counts

**Acceptance Criteria**:
- Both tabs display identical token counts
- Updates propagate to all tabs in real-time
- No tab-specific cached values
- Works across devices (not just tabs)

**Priority**: P1 (High)

---

### UC13: Start Without Session (Lazy Session)
**As a** user
**I want to** see token usage before I send my first message
**So that** I know my base context size

**Scenario**:
1. User opens app (no session yet)
2. User selects provider and model
3. StatusBar shows: "443 / 200k (0%)" (base context only)
4. User hasn't sent any messages yet

**Acceptance Criteria**:
- StatusBar shows base context before session exists
- Count includes: system prompt + tools
- Updates if user changes agent/rules before first message
- Seamlessly transitions when session created

**Priority**: P2 (Medium)

---

### UC14: Understand Why Counts Change
**As a** user
**I want to** understand why my token count changed
**So that** I can make informed decisions

**Scenarios**:
- "Why did my count jump from 450 to 600?" → Switched to agent with longer prompt
- "Why did my count drop from 1,250 to 1,180?" → Switched to model with more efficient tokenizer
- "Why did my count drop from 850 to 720?" → Disabled 2 rules

**Acceptance Criteria**:
- System provides clear feedback on state changes
- User can correlate count changes to their actions
- `/context` breakdown helps understand composition

**Priority**: P2 (Medium)

---

## ⚡ Performance Requirements

### PR-1: Calculation Speed
**Requirement**: Token calculations MUST complete fast enough for real-time UX.

**Targets**:
- StatusBar initial render: < 100ms
- StatusBar update after state change: < 100ms
- `/context` command response: < 200ms
- Streaming delta update: < 50ms

**Why**:
- Anything slower feels laggy
- User workflow interrupted

**User Feedback**:
> "base context 可以實時計，tokenizer其實好快，因為native code 黎，wasm黎"
>
> Translation: "base context can be calculated in real-time, tokenizer is actually fast, because it's native code, WASM"

---

### PR-2: Multi-Client Event Latency
**Requirement**: Events MUST propagate to all clients within acceptable time.

**Target**: < 500ms from event publish to client update

**Why**:
- Real-time collaboration feels broken if delayed
- 500ms is perceptible but acceptable

---

### PR-3: Token Calculation Caching Strategy
**Requirement**: System MUST cache calculations intelligently to avoid redundant work while maintaining accuracy.

**User Feedback**:
> "TTL 好唔準確，應該係按實際內容有無變而係決定會唔會再計算"
>
> Translation: "TTL is very inaccurate, should decide whether to recalculate based on whether actual content changed"

**Problem Analysis**:
- Each model switch recalculates ALL messages (100+ messages × 30ms = 3-5 seconds)
- Concurrent requests (StatusBar + /context) duplicate calculations
- Base context (system + tools) rarely changes but recalculated every time
- No caching = poor performance with large sessions

**Cache Strategy - Content-Based Invalidation**:

1. **Base Context Cache** (System Prompt + Tools)
   - Cache key: `${model}:${contentHash}`
   - Content hash: SHA256 of (agent + rules + tools definitions)
   - Invalidation: Automatic when content changes
   - Why: Agent/rules/tools rarely change during session
   - Hit rate: ~90%
   - Performance gain: 700ms → <1ms

2. **Message Token Cache** (Individual Messages)
   - Cache key: `${model}:${messageHash}`
   - Content hash: SHA256 of message content
   - Invalidation: Automatic (messages immutable once created)
   - Why: Historical messages never change
   - Hit rate: ~95%
   - Performance gain: 3000ms → 100ms (only new messages calculated)

3. **Request Deduplication** (Concurrent Requests)
   - Detect identical in-flight requests
   - Share result instead of duplicate calculation
   - Why: StatusBar + /context often call simultaneously
   - Performance gain: 5000ms → 2500ms (50% reduction)

**Anti-Pattern - TTL-Based Caching**:
```
❌ Cache with TTL (5 minutes)
   → User edits agent file at minute 3
   → Cache still valid (not expired)
   → Returns stale token count ❌ WRONG

✅ Cache with content hash
   → User edits agent file
   → Content hash changes
   → Cache miss, recalculates ✅ CORRECT
```

**Implementation Requirements**:
- Use crypto.createHash('sha256') for content hashing
- Use LRU cache with size limits (prevent memory leak)
  - Base context cache: Max 100 entries
  - Message cache: Max 1000 entries
- Cache is in-memory only (process-level, not shared across restarts)
- No TTL - content hash provides perfect invalidation

**Performance Targets with Caching**:
- First calculation (cache miss): 3-5s (acceptable)
- Subsequent identical calculation (cache hit): <100ms (meets target)
- Model switch with 100 messages:
  - Before: 5000ms (recalculate all)
  - After: 100ms (base context + new messages only)

**Priority**: P0 (Critical) - Required for acceptable performance with large sessions

---

## 🔮 Future Enhancements (Optional)

### FE-1: Fast Estimation Mode (Advanced Setting)
**User Suggestion**:
> "如果都係覺得慢，我地可以提供一個settings比用戶開啟是否用專業既tokenizer去計瞞token"
>
> Translation: "If it's still too slow, we can provide a setting for users to toggle whether to use professional tokenizer to calculate tokens"

> "如果關左，我地就用一個數學去計算，即係char length * ratio 咁去計"
>
> Translation: "If disabled, we use mathematical calculation, i.e., char length * ratio"

> "咁點轉model都唔洗重新計算過，增加效能"
>
> Translation: "This way changing model doesn't require recalculation, improves performance"

**Requirement**: Provide optional fast estimation mode for power users.

**Behavior**:
- Setting: "Use fast token estimation (less accurate)"
- Default: OFF (use accurate tokenizer)
- When ON: Use `charLength * model-specific-ratio`
- Pro: Instant calculation, no tokenizer overhead
- Con: ~10% margin of error

**Priority**: P3 (Low) - Only implement if users report performance issues

---

## ❌ Anti-Requirements (What NOT to Do)

### AR-1: Database Token Caching
**MUST NOT**: Cache token counts in database

**Why**:
- Values become stale on agent/rules/model change
- Creates confusion with incorrect counts
- Violates volatile state requirement (R4)

---

### AR-2: Client-Side Token Calculation
**MUST NOT**: Calculate tokens on client side

**Why**:
- Tokenizer models are large (100MB+)
- JavaScript tokenizers are slow
- Inconsistent results across clients
- Server is SSOT (Single Source of Truth)

---

### AR-3: Separate Calculation Logic
**MUST NOT**: Use different calculation logic in different places

**Why**:
- Violates SSOT requirement (R1)
- Causes user confusion
- Debugging nightmares

**Example of What NOT to Do**:
```
❌ StatusBar: reads session.totalTokens from DB
❌ /context: calculates dynamically
❌ Result: Numbers don't match → User confusion
```

---

## 🧪 Testing Acceptance Criteria

### Test Case 1: SSOT Verification
**Steps**:
1. Open session
2. Check StatusBar value
3. Run `/context` command
4. Compare values

**Expected**: Values MUST match exactly

**Priority**: P0 (Must pass before release)

---

### Test Case 2: Agent Switch Updates
**Steps**:
1. Note current token count
2. Switch agent: `/agent planner`
3. Check StatusBar

**Expected**:
- Count updates within 1 second
- New count reflects new agent's prompt
- No errors or glitches

**Priority**: P0 (Must pass before release)

---

### Test Case 3: Model Switch Updates
**Steps**:
1. Note current token count
2. Switch model: `/model gpt-4`
3. Check StatusBar

**Expected**:
- Count recalculates with new tokenizer
- Context limit updates
- No errors or glitches

**Priority**: P0 (Must pass before release)

---

### Test Case 4: Multi-Tab Sync
**Steps**:
1. Open session in 2 tabs
2. Send message in Tab 1
3. Observe both tabs during streaming
4. Check final counts after completion

**Expected**:
- Both tabs show real-time updates
- Both tabs show identical final count
- No desync or stale data

**Priority**: P1 (Must pass before release)

---

### Test Case 5: Streaming Updates
**Steps**:
1. Send message
2. Watch StatusBar during AI response
3. Note progression of counts

**Expected**:
- Optimistic updates during streaming
- Smooth progression (no big jumps)
- Accurate final count after completion

**Priority**: P1 (Must pass before release)

---

### Test Case 6: Performance Validation
**Steps**:
1. Open session with 50+ messages
2. Switch agent
3. Measure StatusBar update time

**Expected**: < 100ms update time

**Priority**: P1 (Must pass before release)

---

## 📊 Success Metrics

### User Experience Metrics
- **Consistency**: 100% SSOT compliance (StatusBar = /context)
- **Responsiveness**: 95% of updates < 100ms
- **Reliability**: 0 stale data incidents
- **User Satisfaction**: No complaints about incorrect token counts

### Technical Metrics
- **Calculation Speed**: p95 < 100ms
- **Event Latency**: p95 < 500ms
- **Multi-Client Sync**: 100% event delivery

---

## 🎓 Key Principles (from User Requirements)

### Principle 1: Volatility Over Caching
**User Quote**:
> "所有其他usages都係動態"
>
> Translation: "All other usages are dynamic"

**Meaning**: Token counts are fundamentally volatile, not cacheable.

---

### Principle 2: Real-Time Notifications
**User Quote**:
> "反正有任何異動都要即刻通知client去實時更新"
>
> Translation: "Any changes must immediately notify client for real-time updates"

**Meaning**: Event-driven architecture, not polling.

---

### Principle 3: Tokenizer Dependency
**User Quote**:
> "轉model就會轉tokenizer (auto tokenizer會根據model去推斷用咩tokenizer)"
>
> Translation: "Changing model changes tokenizer (auto tokenizer infers which tokenizer based on model)"

**Meaning**: Model = Tokenizer = Token counts are coupled.

---

## 📝 Open Questions

### Q1: Intermediate Checkpoints
**Question**: How often should we recalculate during long streaming responses?

**Options**:
- Every step completion
- Every N seconds
- Only on final completion

**Trade-offs**: Accuracy vs performance

---

### Q2: Error Handling
**Question**: What should StatusBar show if token calculation fails?

**Options**:
- Show "Error" badge
- Show last known value with warning
- Hide token display entirely

**User Impact**: Error UX

---

### Q3: Historical Sessions
**Question**: Should we support viewing old sessions with accurate token counts?

**Context**: Old sessions might have been created with different agent/rules/model

**Options**:
- Recalculate on demand (current state)
- Store snapshot at creation time (historical state)
- Don't support historical accuracy

**Trade-offs**: Accuracy vs complexity

---

### Q4: Cache Memory Management
**Question**: Should cache be process-level or shared across server restarts?

**Options**:
1. **In-memory only** (current design)
   - Pro: Simple, no persistence complexity
   - Con: Cache lost on server restart

2. **Persist to disk**
   - Pro: Cache survives restarts
   - Con: Disk I/O overhead, cache invalidation complexity

3. **Redis/External cache**
   - Pro: Shared across instances, survives restarts
   - Con: Infrastructure dependency, network overhead

**Current Decision**: In-memory only (simplicity wins)
- Tokenizer initialization already cached to disk (./models/.cache)
- First calculation after restart: ~3-5s (acceptable)
- Subsequent calculations: <100ms (cached)

**Trade-offs**: Simplicity vs warm-start performance

---

## 🔗 Related Documents

- Implementation: (TBD - to be written after architecture solidifies)
- API Reference: (TBD)
- Testing Guide: (TBD)

---

## 📅 Revision History

- **v1.1** (2025-01-XX): Added PR-3 Token Calculation Caching Strategy
  - User feedback: TTL-based caching is inaccurate
  - Requirement: Content-based invalidation using SHA256 hashing
  - Three-tier cache: Base context, Message tokens, Request deduplication
  - Performance targets: 5000ms → 100ms for model switches

- **v1.0** (2025-01-XX): Initial specification based on user requirements
