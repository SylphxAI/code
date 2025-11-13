# Token Calculation System

**Part**: 6 of 14
**User Stories**: UC41-49
**Related**: [Sessions](./03-sessions.md), [Agents & Rules](./05-agents-rules.md), [Providers & Models](./06-providers-models.md)

---

## Problem Statement

Users need to see accurate token usage counts throughout their session, but token counts are NOT static:

1. **Agent changes mid-session** → System prompt changes → Base context changes
2. **Rules change mid-session** → System prompt changes → Base context changes
3. **Model changes mid-session** → Tokenizer changes → ALL historical counts change

**User Quote** (Original Requirements):
> "You can't cache tokens, because mid-session you can change agent, system prompt, even tools"
>
> "Even historical usage is not fixed. Changing model changes tokenizer (auto tokenizer infers which tokenizer based on model)"
>
> "So all history is not fixed"

---

## Core Requirements

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

## User Stories

### UC41: View Current Context Usage

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

### UC42: See Token Breakdown

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

### UC43: Switch Agent Mid-Session

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

**Related**: See [UC31: Switch Agent](./05-agents-rules.md#uc31-switch-agent)

---

### UC44: Switch Model Mid-Session

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

**Related**: See [UC37: Switch Model](./06-providers-models.md#uc37-switch-model)

---

### UC45: Toggle Rules Mid-Session

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

**Related**: See [UC33: Enable/Disable Rules](./05-agents-rules.md#uc33-enabledisable-rules)

---

### UC46: Real-Time Streaming Token Updates

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
- User requirement: "Any changes must immediately notify client for real-time updates"

**Related**: See [UC1: Normal Streaming](./02-streaming.md#uc1-normal-streaming-user-sends-message)

---

### UC47: Multi-Tab Token Sync

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

**Related**: See [UC3: Multi-Client Real-Time Sync](./02-streaming.md#uc3-multi-client-real-time-sync)

---

### UC48: Start Without Session (Lazy Session)

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

### UC49: Context Warning System Messages

**As a** user
**I want** the AI to be notified when context is nearly full
**So that** it can suggest compacting or removing old messages

**Acceptance Criteria**:
- Triggers at 80%, 90% context usage
- System message injected before AI call
- Flag-based to avoid duplicate warnings
- Bidirectional (enter/exit states)
- AI can suggest compaction or summarization

**Priority**: P2 (Medium)

---

## Performance Requirements

See [Testing Strategy](./99-testing.md#performance-requirements) for:
- **PR-1**: Token Calculation Speed (< 100ms)
- **PR-2**: Multi-Client Event Latency (< 500ms)

---

## Related Sections

- [Slash Commands](./08-commands.md) - `/context` command (UC55)
- [Agents & Rules](./05-agents-rules.md) - Agent/rules changes affect tokens (UC31, UC33)
- [Providers & Models](./06-providers-models.md) - Model changes affect tokens (UC37)
- [Streaming](./02-streaming.md) - Token updates during streaming (UC1, UC3)
