# System Requirements Documentation

**Version**: 3.0
**Last Updated**: 2025-01-XX
**Total User Stories**: 92
**Status**: Living Document

---

## Overview

This directory contains the complete requirements specification for the system, organized into logical sections for easy navigation and maintenance. Each section focuses on a specific feature area and includes user stories, acceptance criteria, and cross-references.

**Key Principles**:
- Architecture-agnostic (WHAT, not HOW)
- User-centric (based on real use cases)
- Testable (clear acceptance criteria)
- Living document (updates as requirements evolve)

---

## Quick Navigation

### Core Features (P0 - Critical)
- [Real-Time Streaming](./02-streaming.md) - UC1-5 - Event-driven real-time AI responses
- [Session Management](./03-sessions.md) - UC15-21 - Create, switch, manage chat sessions
- [Message Operations](./04-messages.md) - UC22-30 - Send messages, attach files, view history
- [Token Calculation](./07-tokens.md) - UC41-49 - Dynamic token usage tracking

### Configuration & Management (P0-P1)
- [Agents & Rules](./05-agents-rules.md) - UC31-34 - System prompts and behavior customization
- [Providers & Models](./06-providers-models.md) - UC35-40 - AI provider configuration
- [Configuration](./12-configuration.md) - UC81-84 - Global settings and credentials

### User Interface (P0-P2)
- [Slash Commands](./08-commands.md) - UC50-63 - Command-line interface
- [Keyboard Shortcuts](./10-keyboard.md) - UC73-77 - Efficient keyboard navigation
- [AI Tools](./09-tools.md) - UC64-72 - Tool execution for AI actions

### Advanced Features (P1-P3)
- [Multi-Client Advanced](./11-multi-client.md) - UC78-80 - Event replay, persistence
- [Admin & Debug](./13-admin.md) - UC85-89 - System monitoring and debugging
- [Advanced Features](./14-advanced.md) - UC90-92 - MCP, rate limiting, hooks

### Quality & Testing
- [Testing Strategy](./99-testing.md) - Performance requirements, test cases

---

## Document Structure

### [01 - Overview & Principles](./01-overview.md)
**Purpose**: System overview, design principles, priority summary

**Key Sections**:
- Overview and key principles
- Feature priority summary (P0-P3)
- Summary statistics
- Related documents

**Read this first** to understand the overall system design and priorities.

---

### [02 - Real-Time Streaming](./02-streaming.md)
**User Stories**: UC1-5 | **Priority**: P0 (Critical)

**Features**:
- Normal streaming (UC1)
- Command with auto-response (UC2)
- Multi-client real-time sync (UC3)
- Resumable streaming (UC4)
- Selective event delivery (UC5)

**Key Requirements**:
- R1.1: Real-Time Streaming
- R1.2: Multi-Client Support
- R1.3: Event-Driven Architecture

**Related**: Multi-Client Advanced, Token Calculation, Commands

---

### [03 - Session Management](./03-sessions.md)
**User Stories**: UC15-21 | **Priority**: P0-P2

**Features**:
- Create new session (UC15)
- List and switch sessions (UC16)
- Delete session (UC17)
- Compact session (UC18)
- Session title auto-generation (UC19)
- Model availability check (UC20)
- Session list multi-client sync (UC21)

**Related**: Streaming, Commands, Token Calculation

---

### [04 - Message Operations](./04-messages.md)
**User Stories**: UC22-30 | **Priority**: P0-P2

**Features**:
- Send user message (UC22)
- Attach files to messages (UC23)
- File autocomplete (UC24)
- Frozen file storage (UC25)
- Image file display (UC26)
- Abort streaming response (UC27)
- View message history (UC28)
- Message step architecture (UC29)
- Message parts (text, reasoning, tools, errors) (UC30)

**Related**: Streaming, Tools, Keyboard Shortcuts

---

### [05 - Agents & Rules](./05-agents-rules.md)
**User Stories**: UC31-34 | **Priority**: P0-P1

**Features**:
- Switch agent (UC31)
- Custom agents (UC32)
- Enable/disable rules (UC33)
- Custom rules (UC34)

**Related**: Token Calculation, Configuration, Commands

---

### [06 - Providers & Models](./06-providers-models.md)
**User Stories**: UC35-40 | **Priority**: P0-P2

**Features**:
- Configure provider (UC35)
- Switch provider (UC36)
- Switch model (UC37)
- Provider credential management (UC38)
- Zero-knowledge secret management (UC39)
- Model availability cache (UC40)

**Related**: Token Calculation, Configuration, Commands

---

### [07 - Token Calculation](./07-tokens.md)
**User Stories**: UC41-49 | **Priority**: P0-P2

**Features**:
- View current context usage (UC41)
- See token breakdown (UC42)
- Switch agent mid-session (UC43)
- Switch model mid-session (UC44)
- Toggle rules mid-session (UC45)
- Real-time streaming token updates (UC46)
- Multi-tab token sync (UC47)
- Start without session (UC48)
- Context warning system messages (UC49)

**Key Requirements**:
- R2.1: SSOT (Single Source of Truth)
- R2.2: Real-Time Updates
- R2.3: Multi-Client Synchronization
- R2.4: Volatile State Handling

**Related**: Sessions, Agents & Rules, Providers & Models, Streaming

---

### [08 - Slash Commands](./08-commands.md)
**User Stories**: UC50-63 | **Priority**: P0-P3

**Features**:
- `/help` - Command help (UC50)
- `/provider` - Provider management (UC51)
- `/model` - Model selection (UC52)
- `/agent` - Agent switching (UC53)
- `/rules` - Rules management (UC54)
- `/context` - Token usage breakdown (UC55)
- `/sessions` - Session switching (UC56)
- `/new` - Create new session (UC57)
- `/compact` - Session compaction (UC58)
- `/settings` - Tool display settings (UC59)
- `/notifications` - Notification settings (UC60)
- `/bashes` - View background shells (UC61)
- `/logs` - Debug logs (UC62)
- `/survey` - Feedback survey (UC63)

**Related**: All feature sections

---

### [09 - AI Tools](./09-tools.md)
**User Stories**: UC64-72 | **Priority**: P0-P1

**Features**:
- File read tool (UC64)
- File write tool (UC65)
- File edit tool (UC66)
- Bash command execution (UC67)
- Background shell management (UC68)
- File pattern matching (Glob) (UC69)
- Content search (Grep) (UC70)
- Ask user questions (UC71)
- Todo management (UC72)

**Related**: Messages, Commands, Configuration

---

### [10 - Keyboard Shortcuts](./10-keyboard.md)
**User Stories**: UC73-77 | **Priority**: P0-P2

**Features**:
- Text editing shortcuts (UC73)
- Multiline input shortcuts (UC74)
- Navigation shortcuts (UC75)
- Message history navigation (UC76)
- Streaming control shortcuts (UC77)

**Related**: Messages, Commands

---

### [11 - Multi-Client Advanced](./11-multi-client.md)
**User Stories**: UC78-80 | **Priority**: P1

**Features**:
- Event replay for late joiners (UC78)
- Event persistence (UC79)
- Session list sync edge cases (UC80)

**Related**: Streaming, Sessions, Token Calculation

---

### [12 - Configuration](./12-configuration.md)
**User Stories**: UC81-84 | **Priority**: P0-P2

**Features**:
- Global AI configuration (UC81)
- Credential storage (UC82)
- Tool display settings (UC83)
- Notification preferences (UC84)

**Related**: Providers & Models, Agents & Rules, Commands

---

### [13 - Admin & Debug](./13-admin.md)
**User Stories**: UC85-89 | **Priority**: P2-P3

**Features**:
- Delete all sessions (UC85)
- System statistics (UC86)
- Health check (UC87)
- API inventory (UC88)
- Debug logs viewer (UC89)

**Related**: Commands, Testing

---

### [14 - Advanced Features](./14-advanced.md)
**User Stories**: UC90-92 | **Priority**: P1-P2

**Features**:
- MCP server support (UC90)
- Rate limiting (UC91)
- System message triggers (UC92)

**Related**: Tools, Admin & Debug

---

### [99 - Testing & Quality](./99-testing.md)
**Purpose**: Testing strategy, performance requirements, success metrics

**Key Sections**:
- Overall testing strategy
- Streaming tests (S1-S5)
- Session management tests (M1-M2)
- Token calculation tests (T1-T4)
- Multi-client tests (MC1-MC2)
- Performance requirements (PR-1 to PR-4)
- Success metrics

**Related**: All feature sections

---

## Feature Lookup Table

Quick reference table to find specific features:

| Feature | User Story | File | Priority |
|---------|-----------|------|----------|
| **Streaming** |
| Normal streaming | UC1 | [02-streaming.md](./02-streaming.md#uc1-normal-streaming-user-sends-message) | P0 |
| Command auto-response | UC2 | [02-streaming.md](./02-streaming.md#uc2-command-with-auto-response-compact-with-streaming) | P0 |
| Multi-client sync | UC3 | [02-streaming.md](./02-streaming.md#uc3-multi-client-real-time-sync) | P0 |
| Resumable streaming | UC4 | [02-streaming.md](./02-streaming.md#uc4-resumable-streaming-join-ongoing-stream) | P1 |
| Selective event delivery | UC5 | [02-streaming.md](./02-streaming.md#uc5-selective-event-delivery) | P1 |
| **Sessions** |
| Create session | UC15 | [03-sessions.md](./03-sessions.md#uc15-create-new-session) | P0 |
| List/switch sessions | UC16 | [03-sessions.md](./03-sessions.md#uc16-list-and-switch-sessions) | P0 |
| Delete session | UC17 | [03-sessions.md](./03-sessions.md#uc17-delete-session) | P1 |
| Compact session | UC18 | [03-sessions.md](./03-sessions.md#uc18-compact-session-summarize--continue) | P1 |
| Auto-title generation | UC19 | [03-sessions.md](./03-sessions.md#uc19-session-title-auto-generation) | P1 |
| Model availability | UC20 | [03-sessions.md](./03-sessions.md#uc20-session-model-availability-check) | P2 |
| Session list sync | UC21 | [03-sessions.md](./03-sessions.md#uc21-session-list-multi-client-sync) | P1 |
| **Messages** |
| Send message | UC22 | [04-messages.md](./04-messages.md#uc22-send-user-message-with-text) | P0 |
| Attach files | UC23 | [04-messages.md](./04-messages.md#uc23-attach-files-to-messages) | P0 |
| File autocomplete | UC24 | [04-messages.md](./04-messages.md#uc24-file-autocomplete) | P1 |
| Frozen file storage | UC25 | [04-messages.md](./04-messages.md#uc25-frozen-file-storage) | P1 |
| Image display | UC26 | [04-messages.md](./04-messages.md#uc26-image-file-display) | P2 |
| Abort streaming | UC27 | [04-messages.md](./04-messages.md#uc27-abort-streaming-response) | P0 |
| Message history | UC28 | [04-messages.md](./04-messages.md#uc28-view-message-history) | P1 |
| Message steps | UC29 | [04-messages.md](./04-messages.md#uc29-message-step-architecture) | P1 |
| Message parts | UC30 | [04-messages.md](./04-messages.md#uc30-message-parts-text-reasoning-tools-errors) | P1 |
| **Agents & Rules** |
| Switch agent | UC31 | [05-agents-rules.md](./05-agents-rules.md#uc31-switch-agent) | P0 |
| Custom agents | UC32 | [05-agents-rules.md](./05-agents-rules.md#uc32-custom-agents) | P1 |
| Enable/disable rules | UC33 | [05-agents-rules.md](./05-agents-rules.md#uc33-enabledisable-rules) | P0 |
| Custom rules | UC34 | [05-agents-rules.md](./05-agents-rules.md#uc34-custom-rules) | P1 |
| **Providers & Models** |
| Configure provider | UC35 | [06-providers-models.md](./06-providers-models.md#uc35-configure-provider) | P0 |
| Switch provider | UC36 | [06-providers-models.md](./06-providers-models.md#uc36-switch-provider) | P0 |
| Switch model | UC37 | [06-providers-models.md](./06-providers-models.md#uc37-switch-model) | P0 |
| Credential management | UC38 | [06-providers-models.md](./06-providers-models.md#uc38-provider-credential-management) | P1 |
| Zero-knowledge secrets | UC39 | [06-providers-models.md](./06-providers-models.md#uc39-zero-knowledge-secret-management) | P0 |
| Model availability cache | UC40 | [06-providers-models.md](./06-providers-models.md#uc40-model-availability-cache) | P2 |
| **Token Calculation** |
| View context usage | UC41 | [07-tokens.md](./07-tokens.md#uc41-view-current-context-usage) | P0 |
| Token breakdown | UC42 | [07-tokens.md](./07-tokens.md#uc42-see-token-breakdown) | P0 |
| Switch agent mid-session | UC43 | [07-tokens.md](./07-tokens.md#uc43-switch-agent-mid-session) | P0 |
| Switch model mid-session | UC44 | [07-tokens.md](./07-tokens.md#uc44-switch-model-mid-session) | P0 |
| Toggle rules mid-session | UC45 | [07-tokens.md](./07-tokens.md#uc45-toggle-rules-mid-session) | P1 |
| Streaming token updates | UC46 | [07-tokens.md](./07-tokens.md#uc46-real-time-streaming-token-updates) | P1 |
| Multi-tab token sync | UC47 | [07-tokens.md](./07-tokens.md#uc47-multi-tab-token-sync) | P1 |
| Lazy session tokens | UC48 | [07-tokens.md](./07-tokens.md#uc48-start-without-session-lazy-session) | P2 |
| Context warnings | UC49 | [07-tokens.md](./07-tokens.md#uc49-context-warning-system-messages) | P2 |
| **Commands** |
| `/help` | UC50 | [08-commands.md](./08-commands.md#uc50-help---command-help) | P1 |
| `/provider` | UC51 | [08-commands.md](./08-commands.md#uc51-provider---provider-management) | P0 |
| `/model` | UC52 | [08-commands.md](./08-commands.md#uc52-model---model-selection) | P0 |
| `/agent` | UC53 | [08-commands.md](./08-commands.md#uc53-agent---agent-switching) | P0 |
| `/rules` | UC54 | [08-commands.md](./08-commands.md#uc54-rules---rules-management) | P0 |
| `/context` | UC55 | [08-commands.md](./08-commands.md#uc55-context---token-usage-breakdown) | P0 |
| `/sessions` | UC56 | [08-commands.md](./08-commands.md#uc56-sessions---session-switching) | P0 |
| `/new` | UC57 | [08-commands.md](./08-commands.md#uc57-new---create-new-session) | P1 |
| `/compact` | UC58 | [08-commands.md](./08-commands.md#uc58-compact---session-compaction) | P1 |
| `/settings` | UC59 | [08-commands.md](./08-commands.md#uc59-settings---tool-display-settings) | P2 |
| `/notifications` | UC60 | [08-commands.md](./08-commands.md#uc60-notifications---notification-settings) | P2 |
| `/bashes` | UC61 | [08-commands.md](./08-commands.md#uc61-bashes---view-background-shells) | P2 |
| `/logs` | UC62 | [08-commands.md](./08-commands.md#uc62-logs---debug-logs) | P3 |
| `/survey` | UC63 | [08-commands.md](./08-commands.md#uc63-survey---feedback-survey) | P3 |
| **Tools** |
| File read | UC64 | [09-tools.md](./09-tools.md#uc64-file-read-tool) | P0 |
| File write | UC65 | [09-tools.md](./09-tools.md#uc65-file-write-tool) | P0 |
| File edit | UC66 | [09-tools.md](./09-tools.md#uc66-file-edit-tool) | P0 |
| Bash execution | UC67 | [09-tools.md](./09-tools.md#uc67-bash-command-execution) | P0 |
| Background shells | UC68 | [09-tools.md](./09-tools.md#uc68-background-shell-management) | P1 |
| Glob | UC69 | [09-tools.md](./09-tools.md#uc69-file-pattern-matching-glob) | P0 |
| Grep | UC70 | [09-tools.md](./09-tools.md#uc70-content-search-grep) | P0 |
| Ask user | UC71 | [09-tools.md](./09-tools.md#uc71-ask-user-questions) | P1 |
| Todo management | UC72 | [09-tools.md](./09-tools.md#uc72-todo-management) | P1 |
| **Keyboard** |
| Text editing | UC73 | [10-keyboard.md](./10-keyboard.md#uc73-text-editing-shortcuts) | P1 |
| Multiline input | UC74 | [10-keyboard.md](./10-keyboard.md#uc74-multiline-input-shortcuts) | P0 |
| Navigation | UC75 | [10-keyboard.md](./10-keyboard.md#uc75-navigation-shortcuts) | P0 |
| History navigation | UC76 | [10-keyboard.md](./10-keyboard.md#uc76-message-history-navigation) | P2 |
| Streaming control | UC77 | [10-keyboard.md](./10-keyboard.md#uc77-streaming-control-shortcuts) | P0 |
| **Multi-Client** |
| Event replay | UC78 | [11-multi-client.md](./11-multi-client.md#uc78-event-replay-for-late-joiners) | P1 |
| Event persistence | UC79 | [11-multi-client.md](./11-multi-client.md#uc79-event-persistence) | P1 |
| Session sync edge cases | UC80 | [11-multi-client.md](./11-multi-client.md#uc80-session-list-sync-edge-cases) | P1 |
| **Configuration** |
| Global AI config | UC81 | [12-configuration.md](./12-configuration.md#uc81-global-ai-configuration) | P0 |
| Credential storage | UC82 | [12-configuration.md](./12-configuration.md#uc82-credential-storage) | P0 |
| Tool display settings | UC83 | [12-configuration.md](./12-configuration.md#uc83-tool-display-settings) | P2 |
| Notification preferences | UC84 | [12-configuration.md](./12-configuration.md#uc84-notification-preferences) | P2 |
| **Admin & Debug** |
| Delete all sessions | UC85 | [13-admin.md](./13-admin.md#uc85-delete-all-sessions) | P3 |
| System statistics | UC86 | [13-admin.md](./13-admin.md#uc86-system-statistics) | P3 |
| Health check | UC87 | [13-admin.md](./13-admin.md#uc87-health-check) | P2 |
| API inventory | UC88 | [13-admin.md](./13-admin.md#uc88-api-inventory) | P3 |
| Debug logs | UC89 | [13-admin.md](./13-admin.md#uc89-debug-logs-viewer) | P2 |
| **Advanced** |
| MCP server support | UC90 | [14-advanced.md](./14-advanced.md#uc90-mcp-server-support) | P2 |
| Rate limiting | UC91 | [14-advanced.md](./14-advanced.md#uc91-rate-limiting) | P1 |
| System message triggers | UC92 | [14-advanced.md](./14-advanced.md#uc92-system-message-triggers) | P2 |

---

## Priority Breakdown

### P0 (Critical) - 42 features
Must work correctly for basic functionality. Block release if broken.

### P1 (High) - 28 features
Important for good UX. Should be fixed before release.

### P2 (Medium) - 15 features
Nice to have. Can be fixed in patch release.

### P3 (Low) - 7 features
Future enhancements. Can be backlogged.

---

## How to Use This Documentation

### For Product Managers
1. Start with [01-overview.md](./01-overview.md) for high-level understanding
2. Review feature sections based on your area of focus
3. Use priority breakdown to plan releases
4. Reference user stories when writing tickets

### For Developers
1. Find relevant user story using Feature Lookup Table above
2. Read acceptance criteria for implementation guidance
3. Check "Related" sections for dependencies
4. Review [99-testing.md](./99-testing.md) for quality requirements
5. Remember: Focus on WHAT (requirements), not HOW (implementation)

### For QA Engineers
1. Use acceptance criteria for test case creation
2. Reference [99-testing.md](./99-testing.md) for testing strategy
3. Cross-check multi-client scenarios in [11-multi-client.md](./11-multi-client.md)
4. Validate performance requirements (PR-1 to PR-4)

### For Designers
1. Review user stories for UX context
2. Check [10-keyboard.md](./10-keyboard.md) for interaction patterns
3. Reference [08-commands.md](./08-commands.md) for command interface
4. Consider multi-client scenarios from [11-multi-client.md](./11-multi-client.md)

---

## Maintenance Guidelines

### Adding New Requirements
1. Determine which section the requirement belongs to
2. Add user story with UC number (next available)
3. Include acceptance criteria and priority
4. Update Feature Lookup Table in this README
5. Add cross-references to related sections

### Updating Existing Requirements
1. Locate user story in appropriate section
2. Update acceptance criteria or priority
3. Update cross-references if dependencies changed
4. Update Feature Lookup Table if needed
5. Add note to revision history

### Reorganizing Sections
1. Discuss with team before major restructuring
2. Update all cross-references
3. Update Feature Lookup Table
4. Update this README navigation

---

## Translation Notes

All Chinese text from the original document has been translated to English, including:
- User quotes
- Flow descriptions
- Inline comments
- Technical terms

Translations preserve the original meaning and context.

---

## Revision History

- **v1.0** (2025-01-XX): Initial token calculation specification
- **v2.0** (2025-01-XX): Complete system coverage - 92 user stories across all features
- **v3.0** (2025-01-XX): Split into logical sections (14 files) with comprehensive index

---

## Feedback

If you have questions or suggestions about these requirements:
1. Create an issue in the project tracker
2. Tag with `requirements` label
3. Reference specific user story (e.g., UC42)
4. Provide context and rationale

---

**Remember**: This is a living document. Requirements evolve based on user feedback, technical discoveries, and business priorities. When in doubt, refer back to the core principles in [01-overview.md](./01-overview.md).
