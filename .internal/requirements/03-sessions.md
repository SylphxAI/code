# Session Management

**Part**: 2 of 14
**User Stories**: UC15-21
**Related**: [Streaming](./02-streaming.md), [Messages](./04-messages.md), [Commands](./08-commands.md)

---

## Problem Statement

Users need to manage multiple chat sessions, each with different configurations and conversation history. Sessions should support:
1. **Creation** with specific settings
2. **Switching** between sessions
3. **Deletion** to clean up old sessions
4. **Compaction** to reduce token usage
5. **Auto-titling** for easy identification
6. **Multi-client sync** for session lists

---

## User Stories

### UC15: Create New Session

**As a** user
**I want to** create a new chat session
**So that** I can start a fresh conversation with specific settings

**Acceptance Criteria**:
- Can create via `/new` command or UI action
- Can specify provider, model, agent, rules at creation
- Global defaults applied if not specified
- Session auto-created on first message (lazy sessions)
- New session event broadcasts to all clients

**Priority**: P0 (Critical)

---

### UC16: List and Switch Sessions

**As a** user
**I want to** view and switch between my chat sessions
**So that** I can continue previous conversations

**Acceptance Criteria**:
- `/sessions` command shows session list
- Sessions sorted by last updated (most recent first)
- Can search sessions by title (fuzzy search)
- Cursor-based pagination for 100+ sessions
- Shows session title, creation date, message count
- Arrow keys to navigate, Enter to select

**Priority**: P0 (Critical)

---

### UC17: Delete Session

**As a** user
**I want to** delete old sessions
**So that** I can clean up my workspace

**Acceptance Criteria**:
- Deletes session and all associated data (cascade)
- Emits session-deleted event for multi-client sync
- Cannot undo (permanent deletion)
- Confirmation prompt to prevent accidents

**Priority**: P1 (High)

---

### UC18: Compact Session (Summarize & Continue)

**As a** user
**I want to** compact a long session
**So that** I can reduce token usage while preserving context

**Acceptance Criteria**:
- `/compact` command triggers compaction
- AI generates summary of conversation
- Creates new session with summary as system message
- Auto-triggers AI response in new session (streaming)
- Old session preserved (not deleted)
- Multi-client event sync for compact operation

**Priority**: P1 (High)

**Related**: See [UC2: Command with Auto-Response](./02-streaming.md#uc2-command-with-auto-response-compact-with-streaming)

---

### UC19: Session Title Auto-Generation

**As a** user
**I want** sessions to get descriptive titles automatically
**So that** I can identify conversations easily

**Acceptance Criteria**:
- Title generated after first user message + AI response
- Streaming title updates (delta events)
- Shows in session list immediately
- Can manually update title later (future feature)
- Multi-client sync: All clients see title updates

**Priority**: P1 (High)

---

### UC20: Session Model Availability Check

**As a** user
**I want to** know if a session's model is unavailable
**So that** I can switch to a compatible model

**Acceptance Criteria**:
- TTL cache (1 hour) prevents excessive API calls
- Shows model status: available | unavailable | unknown
- Warns user before resuming unavailable model session
- Suggests switching to available model

**Priority**: P2 (Medium)

---

### UC21: Session List Multi-Client Sync

**As a** user with multiple clients
**I want** my session list to stay synchronized
**So that** I see the same sessions everywhere

**Acceptance Criteria**:
- Session created/deleted events to all clients
- Session title updates propagate
- Session list auto-refreshes
- No manual reload needed

**Priority**: P1 (High)

**Related**: See [UC5: Selective Event Delivery](./02-streaming.md#uc5-selective-event-delivery)

---

## Related Sections

- [Slash Commands](./08-commands.md) - `/new`, `/sessions`, `/compact` commands (UC57-58, UC56)
- [Token Calculation](./07-tokens.md) - Impact of session state changes (UC43-45)
- [Configuration](./12-configuration.md) - Global defaults (UC81)
- [Admin & Debug](./13-admin.md) - Delete all sessions (UC85)
