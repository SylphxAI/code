# Message Operations

**Part**: 3 of 14
**User Stories**: UC22-30
**Related**: [Streaming](./02-streaming.md), [Sessions](./03-sessions.md), [Tools](./09-tools.md)

---

## Problem Statement

Users interact with AI through messages, which can contain:
1. **Text content** from user or AI
2. **File attachments** (code, images, documents)
3. **Tool calls** and results
4. **Reasoning** (extended thinking)
5. **Errors** from tool execution

Messages should support:
- Real-time streaming
- File attachments with frozen storage
- Abort mid-stream
- History preservation
- Multi-step interactions

---

## User Stories

### UC22: Send User Message with Text

**As a** user
**I want to** send text messages to the AI
**So that** I can communicate my requests

**Acceptance Criteria**:
- Type message in input field
- Press Enter to send
- Message saved immediately
- Streaming response begins
- Message appears in chat history

**Priority**: P0 (Critical)

**Note**: Covered by [UC1: Normal Streaming](./02-streaming.md#uc1-normal-streaming-user-sends-message)

---

### UC23: Attach Files to Messages

**As a** user
**I want to** attach files to my messages
**So that** the AI can read and analyze them

**Acceptance Criteria**:
- Type `@` to trigger file autocomplete
- Fuzzy search file paths
- Arrow keys to navigate, Enter to select
- Multiple files attachable
- Shows token count per file
- Files frozen as immutable content (prompt cache friendly)

**Priority**: P0 (Critical)

---

### UC24: File Autocomplete

**As a** user
**I want** fast file search when attaching files
**So that** I can quickly find relevant files

**Acceptance Criteria**:
- Type `@` + partial path triggers autocomplete
- Fuzzy matching (e.g., "sct" matches "src/components/Chat.tsx")
- Real-time filtering as user types
- Shows relative paths
- Arrow keys navigate, Enter selects, Esc cancels

**Priority**: P1 (High)

---

### UC25: Frozen File Storage

**As a** user
**I want** attached files to be preserved exactly as they were
**So that** message history shows accurate context

**Acceptance Criteria**:
- Files stored as BLOB (not base64) - 33% smaller
- Immutable storage (prompt cache friendly)
- Text files indexed for FTS5 search (future)
- SHA256 deduplication possible
- Rewind/checkpoint support (restore files)

**Priority**: P1 (High)

---

### UC26: Image File Display

**As a** user
**I want** attached images to display inline
**So that** I can see visual context

**Acceptance Criteria**:
- Images render in terminal (iTerm2 protocol)
- Images render in web GUI
- Base64 encoding for transmission
- Supports common formats (PNG, JPG, GIF)

**Priority**: P2 (Medium)

---

### UC27: Abort Streaming Response

**As a** user
**I want to** abort long-running AI responses
**So that** I can stop unwanted or incorrect generation

**Acceptance Criteria**:
- Keyboard shortcut (Ctrl+C / Esc) aborts stream
- Server-side abort via AbortController
- Pending tool executions cancelled
- Active message parts marked as 'abort' status
- Event published to all clients
- Can send new message after abort

**Priority**: P0 (Critical)

**Related**: See [UC77: Streaming Control Shortcuts](./10-keyboard.md#uc77-streaming-control-shortcuts)

---

### UC28: View Message History

**As a** user
**I want to** scroll through past messages in current session
**So that** I can review conversation context

**Acceptance Criteria**:
- All messages displayed in chronological order
- Scroll with arrow keys or mouse
- User messages aligned left
- AI messages aligned right (or visually distinct)
- Supports large history (100+ messages)

**Priority**: P1 (High)

---

### UC29: Message Step Architecture

**As a** user
**I want** the AI to use tools iteratively
**So that** complex tasks can be completed in one response

**Acceptance Criteria**:
- User message = 1 step
- Assistant message = 1+ steps (tool execution loops)
- Each step has own metadata (system status snapshot)
- Step usage tracked separately
- Streaming shows all steps in real-time
- Tool results feed into next step

**Priority**: P1 (High)

---

### UC30: Message Parts (Text, Reasoning, Tools, Errors)

**As a** user
**I want to** see different types of content in AI responses
**So that** I understand what the AI is doing

**Acceptance Criteria**:
- Text parts: Normal AI response text
- Reasoning parts: Extended thinking (if model supports)
- Tool parts: Tool calls with input/output
- Error parts: Tool execution errors
- All parts have unified status field
- Visual distinction between part types

**Priority**: P1 (High)

---

## Related Sections

- [Streaming](./02-streaming.md) - Real-time message streaming (UC1-5)
- [Tools](./09-tools.md) - AI tool execution (UC64-72)
- [Keyboard Shortcuts](./10-keyboard.md) - Message history navigation (UC76)
- [Token Calculation](./07-tokens.md) - Message token counts (UC42)
