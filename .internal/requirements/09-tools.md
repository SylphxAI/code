# AI Tools (Tool Execution)

**Part**: 8 of 14
**User Stories**: UC64-72
**Related**: [Messages](./04-messages.md), [Commands](./08-commands.md), [Configuration](./12-configuration.md)

---

## Problem Statement

The AI needs to interact with the user's system to complete tasks. Tools should be:
1. **Safe** (proper sandboxing, timeouts)
2. **Fast** (minimal overhead)
3. **Reliable** (error handling, retries)
4. **Visible** (user sees what AI is doing)

---

## User Stories

### UC64: File Read Tool

**As the** AI
**I want to** read file contents
**So that** I can analyze code and provide context-aware responses

**Acceptance Criteria**:
- Reads files up to 10MB
- Supports offset/limit for large files
- Returns content with line numbers
- Handles binary files gracefully
- Shows "Reading..." indicator to user

**Priority**: P0 (Critical)

---

### UC65: File Write Tool

**As the** AI
**I want to** write files to disk
**So that** I can create new files or modify existing ones

**Acceptance Criteria**:
- Writes files with specified content
- Auto-creates parent directories
- Overwrites existing files (with warning)
- Handles file permissions properly
- Shows "Writing..." indicator to user

**Priority**: P0 (Critical)

---

### UC66: File Edit Tool

**As the** AI
**I want to** make line-based edits to files
**So that** I can modify specific sections without rewriting entire files

**Acceptance Criteria**:
- SEARCH/REPLACE block syntax
- Validates search string exists
- Applies replacement atomically
- Supports replace-all mode
- Shows diff to user before applying

**Priority**: P0 (Critical)

---

### UC67: Bash Command Execution

**As the** AI
**I want to** run shell commands
**So that** I can automate tasks and gather system information

**Acceptance Criteria**:
- Executes commands with timeout (2min default, 10min max)
- Supports background execution
- Proper quoting for paths with spaces
- Working directory preservation
- Shows command output to user in real-time

**Priority**: P0 (Critical)

---

### UC68: Background Shell Management

**As the** AI
**I want to** manage background shell processes
**So that** I can monitor long-running tasks

**Tools**:
- `BashOutput`: Read output from background shell
- `KillShell`: Terminate background shell

**Acceptance Criteria**:
- Background shells persist across messages
- Can read output incrementally
- Can filter output with regex
- Can kill shells cleanly
- User notified of background processes

**Priority**: P1 (High)

**Related**: See [UC61: `/bashes` Command](./08-commands.md#uc61-bashes---view-background-shells)

---

### UC69: File Pattern Matching (Glob)

**As the** AI
**I want to** find files by pattern
**So that** I can locate relevant files quickly

**Acceptance Criteria**:
- Supports glob patterns (e.g., `**/*.ts`)
- Returns sorted file paths
- Fast (doesn't read file contents)
- Respects .gitignore (optional)
- Shows "Searching..." indicator

**Priority**: P0 (Critical)

---

### UC70: Content Search (Grep)

**As the** AI
**I want to** search file contents by pattern
**So that** I can find specific code or text

**Acceptance Criteria**:
- Supports regex patterns
- Can filter by file type/glob
- Shows line numbers and context
- Fast (uses ripgrep under the hood)
- Supports multiline mode

**Priority**: P0 (Critical)

---

### UC71: Ask User Questions

**As the** AI
**I want to** ask the user questions
**So that** I can gather input for complex workflows

**Acceptance Criteria**:
- Single-select or multi-select questions
- Supports free-text input option
- Shows in inline selection UI
- Queue system for multiple questions
- Timeout if user doesn't respond

**Priority**: P1 (High)

---

### UC72: Todo Management

**As the** AI
**I want to** create and manage todos
**So that** I can track tasks in long conversations

**Acceptance Criteria**:
- Create todos with status (pending/in_progress/completed)
- Update todo status
- Delete todos
- Todos displayed in sidebar
- Persisted per session

**Priority**: P1 (High)

---

## Tool Categories

### File Operations
- File Read (UC64)
- File Write (UC65)
- File Edit (UC66)
- Glob Pattern Matching (UC69)
- Content Search/Grep (UC70)

### Shell Operations
- Bash Command Execution (UC67)
- Background Shell Management (UC68)

### User Interaction
- Ask User Questions (UC71)

### Task Management
- Todo Management (UC72)

---

## Tool Display Configuration

See [UC59: `/settings` Command](./08-commands.md#uc59-settings---tool-display-settings) and [UC83: Tool Display Settings](./12-configuration.md#uc83-tool-display-settings) for configuration options:
- Show/hide tool inputs
- Show/hide tool outputs
- Collapse/expand tool details

---

## Related Sections

- [Messages](./04-messages.md) - Tool calls in messages (UC30)
- [Commands](./08-commands.md) - `/bashes` command (UC61), `/settings` command (UC59)
- [Configuration](./12-configuration.md) - Tool display settings (UC83)
