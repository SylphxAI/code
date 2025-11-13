# Keyboard Shortcuts

**Part**: 9 of 14
**User Stories**: UC73-77
**Related**: [Messages](./04-messages.md), [Commands](./08-commands.md)

---

## Problem Statement

Users need efficient keyboard navigation for productivity. Shortcuts should be:
1. **Discoverable** (help documentation)
2. **Consistent** (Emacs-style conventions)
3. **Non-conflicting** (with system/terminal shortcuts)
4. **Cross-platform** (macOS, Linux, Windows)

---

## User Stories

### UC73: Text Editing Shortcuts

**As a** user
**I want** Emacs-style text editing shortcuts
**So that** I can edit input efficiently

**Shortcuts**:
- `Ctrl+A` / `Home`: Move to start of line
- `Ctrl+E` / `End`: Move to end of line
- `Ctrl+B` / `←`: Move left
- `Ctrl+F` / `→`: Move right
- `Meta+B` / `Ctrl+←`: Move word left
- `Meta+F` / `Ctrl+→`: Move word right
- `Ctrl+H` / `Backspace`: Delete char left
- `Ctrl+D` / `Delete`: Delete char right
- `Ctrl+W` / `Meta+Backspace`: Delete word left
- `Meta+D`: Delete word right
- `Ctrl+U`: Delete to start of line
- `Ctrl+K`: Delete to end of line
- `Ctrl+T`: Transpose characters
- `Ctrl+Y`: Yank (paste from kill buffer)

**Priority**: P1 (High)

---

### UC74: Multiline Input Shortcuts

**As a** user
**I want to** insert newlines in my input
**So that** I can write multiline messages

**Shortcuts**:
- `Ctrl+J`: Insert newline
- `Shift+Enter`: Insert newline
- `Meta+Enter`: Insert newline
- `Enter` (alone): Submit message

**Priority**: P0 (Critical)

---

### UC75: Navigation Shortcuts

**As a** user
**I want** keyboard navigation in lists and menus
**So that** I don't need to use mouse

**Shortcuts**:
- `↑` / `↓`: Navigate options
- `Enter`: Confirm selection
- `Esc`: Cancel / Exit
- `Tab`: Autocomplete / Next option
- `Space`: Toggle checkbox (multi-select)

**Priority**: P0 (Critical)

---

### UC76: Message History Navigation

**As a** user
**I want to** navigate through my previous messages
**So that** I can quickly resend or edit past input

**Shortcuts**:
- `↑`: Previous message (when at start of empty input)
- `↓`: Next message (when navigating history)

**Priority**: P2 (Medium)

**Related**: See [UC28: View Message History](./04-messages.md#uc28-view-message-history)

---

### UC77: Streaming Control Shortcuts

**As a** user
**I want to** control AI streaming with keyboard
**So that** I can abort unwanted responses

**Shortcuts**:
- `Ctrl+C`: Abort streaming (when active)
- `Esc`: Abort streaming (when active)

**Priority**: P0 (Critical)

**Related**: See [UC27: Abort Streaming Response](./04-messages.md#uc27-abort-streaming-response)

---

## Shortcut Categories

### Text Editing (UC73)
Emacs-style line and word navigation/editing

### Input Control (UC74, UC77)
- Multiline input (UC74)
- Streaming control (UC77)

### Navigation (UC75, UC76)
- List/menu navigation (UC75)
- Message history navigation (UC76)

---

## Cross-Platform Considerations

- **Meta Key**:
  - macOS: `Option` key
  - Linux/Windows: `Alt` key

- **Terminal Compatibility**:
  - Some terminals may intercept certain shortcuts
  - iTerm2, Alacritty, and modern terminals generally support all shortcuts

- **Conflict Avoidance**:
  - Avoid system shortcuts (e.g., `Cmd+W` on macOS)
  - Prefer Emacs-style conventions (widely supported)

---

## Related Sections

- [Messages](./04-messages.md) - Message history (UC28), abort streaming (UC27)
- [Commands](./08-commands.md) - Command invocation via keyboard
