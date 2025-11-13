# Slash Commands

**Part**: 7 of 14
**User Stories**: UC50-63
**Related**: [Sessions](./03-sessions.md), [Agents & Rules](./05-agents-rules.md), [Providers & Models](./06-providers-models.md), [Token Calculation](./07-tokens.md)

---

## Problem Statement

Users need quick access to system functions through slash commands in the chat interface. Commands should be:
1. **Discoverable** (help system)
2. **Consistent** (similar syntax/behavior)
3. **Interactive** (TUI selection when applicable)
4. **Fast** (no unnecessary round-trips)

---

## User Stories

### UC50: `/help` - Command Help

**As a** user
**I want to** view list of all commands with descriptions
**So that** I can discover available features

**Acceptance Criteria**:
- Lists all available commands
- Shows brief description for each
- Shows command syntax/arguments
- Can search/filter commands (optional)

**Priority**: P1 (High)

---

### UC51: `/provider` - Provider Management

**As a** user
**I want to** manage AI providers via command
**So that** I can configure and switch providers quickly

**Sub-commands**:
- `/provider` - Show current provider
- `/provider use` - Select provider from list
- `/provider use <name>` - Switch to specific provider
- `/provider configure <name>` - Configure provider settings

**Acceptance Criteria**:
- Interactive selection UI when no args
- Direct switch with provider name
- Configuration UI for API keys and settings
- Validation before switching

**Priority**: P0 (Critical)

**Related**: See [UC35-36: Configure/Switch Provider](./06-providers-models.md)

---

### UC52: `/model` - Model Selection

**As a** user
**I want to** switch AI models via command
**So that** I can use different model capabilities

**Sub-commands**:
- `/model` - Show current model and select from list
- `/model <name>` - Switch to specific model

**Acceptance Criteria**:
- Fetches available models from current provider
- Shows model capabilities (vision, tools, etc.)
- Updates token calculations after switch
- TTL cache (1 hour) to avoid API spam

**Priority**: P0 (Critical)

**Related**: See [UC37: Switch Model](./06-providers-models.md#uc37-switch-model)

---

### UC53: `/agent` - Agent Switching

**As a** user
**I want to** switch AI agents via command
**So that** I can use different system prompts

**Sub-commands**:
- `/agent` - Show current agent and select from list
- `/agent <name>` - Switch to specific agent

**Acceptance Criteria**:
- Shows built-in and custom agents
- Displays agent description
- Updates token calculations after switch
- Visual feedback on current agent

**Priority**: P0 (Critical)

**Related**: See [UC31: Switch Agent](./05-agents-rules.md#uc31-switch-agent)

---

### UC54: `/rules` - Rules Management

**As a** user
**I want to** manage system prompt rules via command
**So that** I can customize AI behavior

**Acceptance Criteria**:
- Shows multi-select checkbox UI
- Pre-selects currently enabled rules
- Can toggle multiple rules at once
- Updates token calculations after change
- Shows rule descriptions

**Priority**: P0 (Critical)

**Related**: See [UC33: Enable/Disable Rules](./05-agents-rules.md#uc33-enabledisable-rules)

---

### UC55: `/context` - Token Usage Breakdown

**As a** user
**I want to** view detailed token usage
**So that** I understand context consumption

**Acceptance Criteria**:
- Shows breakdown: System, Tools, Messages
- Shows total and percentage
- Shows context limit
- Numbers match StatusBar display (SSOT)

**Priority**: P0 (Critical)

**Related**: See [UC42: See Token Breakdown](./07-tokens.md#uc42-see-token-breakdown)

---

### UC56: `/sessions` - Session Switching

**As a** user
**I want to** switch between sessions via command
**So that** I can navigate my conversation history

**Acceptance Criteria**:
- Shows recent sessions (paginated)
- Displays title, date, message count
- Can search by title
- Arrow keys to navigate, Enter to select
- Loads selected session

**Priority**: P0 (Critical)

**Related**: See [UC16: List and Switch Sessions](./03-sessions.md#uc16-list-and-switch-sessions)

---

### UC57: `/new` - Create New Session

**As a** user
**I want to** create new session via command
**So that** I can start fresh conversation quickly

**Acceptance Criteria**:
- Creates new session with current settings
- Switches to new session immediately
- Broadcasts session-created event
- Optional: Prompt for session name

**Priority**: P1 (High)

**Related**: See [UC15: Create New Session](./03-sessions.md#uc15-create-new-session)

---

### UC58: `/compact` - Session Compaction

**As a** user
**I want to** compact long sessions via command
**So that** I can reduce token usage

**Acceptance Criteria**:
- Generates conversation summary
- Creates new session with summary
- Auto-triggers AI response (streaming)
- Preserves old session
- Updates session list

**Priority**: P1 (High)

**Related**:
- [UC18: Compact Session](./03-sessions.md#uc18-compact-session-summarize--continue)
- [UC2: Command with Auto-Response](./02-streaming.md#uc2-command-with-auto-response-compact-with-streaming)

---

### UC59: `/settings` - Tool Display Settings

**As a** user
**I want to** configure tool display preferences
**So that** I can customize output verbosity

**Settings**:
- Show/hide tool inputs
- Show/hide tool outputs
- Collapse/expand tool details

**Acceptance Criteria**:
- Interactive settings UI
- Changes apply immediately
- Persistent (saved to config)
- Affects current and future sessions

**Priority**: P2 (Medium)

**Related**: See [UC83: Tool Display Settings](./12-configuration.md#uc83-tool-display-settings)

---

### UC60: `/notifications` - Notification Settings

**As a** user
**I want to** configure notification preferences
**So that** I can be alerted when AI completes responses

**Settings**:
- OS notifications (on/off)
- Terminal bell (on/off)
- Sound effects (on/off)

**Acceptance Criteria**:
- Interactive settings UI
- Platform-specific (macOS, Linux, Windows)
- Test notification button
- Persistent (saved to config)

**Priority**: P2 (Medium)

**Related**: See [UC84: Notification Preferences](./12-configuration.md#uc84-notification-preferences)

---

### UC61: `/bashes` - View Background Shells

**As a** user
**I want to** view and manage background bash shells
**So that** I can monitor long-running processes

**Acceptance Criteria**:
- Lists all active background shells
- Shows shell ID, command, status
- Can view output of running shells
- Can kill shells if needed
- Refreshes automatically

**Priority**: P2 (Medium)

**Related**: See [UC68: Background Shell Management](./09-tools.md#uc68-background-shell-management)

---

### UC62: `/logs` - Debug Logs

**As a** user
**I want to** view application debug logs
**So that** I can troubleshoot issues

**Acceptance Criteria**:
- Shows recent log entries
- Can filter by level (debug, info, warn, error)
- Can search log content
- Can export logs to file

**Priority**: P3 (Low)

**Related**: See [UC89: Debug Logs Viewer](./13-admin.md#uc89-debug-logs-viewer)

---

### UC63: `/survey` - Feedback Survey

**As a** user
**I want to** provide feedback about the application
**So that** I can contribute to improvements

**Acceptance Criteria**:
- Opens feedback form
- Collects structured feedback
- Submits to feedback endpoint
- Thank you message after submission

**Priority**: P3 (Low)

---

## Command Categories

### Session Management Commands
- `/new` - Create new session (UC57)
- `/sessions` - Switch sessions (UC56)
- `/compact` - Compact session (UC58)

### AI Configuration Commands
- `/provider` - Configure provider (UC51)
- `/model` - Switch model (UC52)
- `/agent` - Switch agent (UC53)
- `/rules` - Manage rules (UC54)

### Information Commands
- `/help` - Command help (UC50)
- `/context` - Token breakdown (UC55)
- `/bashes` - Background shells (UC61)
- `/logs` - Debug logs (UC62)

### Settings Commands
- `/settings` - Tool display (UC59)
- `/notifications` - Notifications (UC60)

### Feedback Commands
- `/survey` - Feedback (UC63)

---

## Related Sections

- [Sessions](./03-sessions.md) - Session commands (UC15-18)
- [Agents & Rules](./05-agents-rules.md) - Agent/rules commands (UC31, UC33)
- [Providers & Models](./06-providers-models.md) - Provider/model commands (UC35-37)
- [Token Calculation](./07-tokens.md) - Context command (UC42)
- [Tools](./09-tools.md) - Background shells (UC68)
- [Configuration](./12-configuration.md) - Settings (UC83-84)
- [Admin & Debug](./13-admin.md) - Debug logs (UC89)
