# Overview & Principles

**Document Type**: Specification (WHAT, not HOW)
**Last Updated**: 2025-01-XX
**Status**: Living Document - Complete Version

---

## Overview

This document defines the **complete requirements and user stories** for the entire system. It focuses on WHAT the system should do, not HOW it should be implemented.

**Key Principles**:
- Architecture-agnostic (implementation can evolve)
- User-centric (based on real use cases)
- Testable (clear acceptance criteria)
- Living document (updates as requirements evolve)

**Coverage**: This document covers ~90 user stories across all major features discovered in the codebase.

---

## Key Design Principles

### Principle 1: Volatility Over Caching

**User Quote**:
> "All other usages are dynamic"

**Meaning**: Token counts are fundamentally volatile, not cacheable.

---

### Principle 2: Real-Time Notifications

**User Quote**:
> "Any changes must immediately notify client for real-time updates"

**Meaning**: Event-driven architecture, not polling.

---

### Principle 3: Tokenizer Dependency

**User Quote**:
> "Changing model changes tokenizer (auto tokenizer infers which tokenizer based on model)"

**Meaning**: Model = Tokenizer = Token counts are coupled.

---

### Principle 4: Zero-Knowledge Security

**Principle**: Client must NEVER have access to API keys.

**Rationale**: Prevents XSS attacks, credential theft, accidental exposure.

---

### Principle 5: Multi-Client First

**Principle**: All features must work correctly with multiple concurrent clients.

**Rationale**: Common workflow, prevents race conditions and stale data.

---

## Feature Priority Summary

### P0 (Critical) - 42 features
Must work correctly for basic functionality:
- All streaming features (UC1-5)
- Session management core (UC15-16, UC21)
- Message operations core (UC22-23, UC27)
- Agent & rules management (UC31, UC33)
- Provider & model (UC35-37, UC39)
- Token calculation core (UC41-44)
- Key slash commands (UC51-56)
- File operations tools (UC64-67, UC69-70)
- Text editing (UC74-75, UC77)
- Global configuration (UC81-82)

### P1 (High) - 28 features
Important for good UX:
- Session title generation (UC19)
- Session list sync (UC21)
- File attachments (UC24-25)
- Message history (UC28-30)
- Custom agents/rules (UC32, UC34)
- Credential management (UC38)
- Token updates (UC45-47)
- Slash commands (UC50, UC57-58)
- Background shells (UC68)
- Ask tool (UC71)
- Todo management (UC72)
- Keyboard shortcuts (UC73)
- Event replay (UC78-80)
- Rate limiting (UC91)

### P2 (Medium) - 15 features
Nice to have:
- Model availability (UC20)
- Image display (UC26)
- Context warnings (UC49)
- Settings commands (UC59-60)
- Admin features (UC87, UC89-90, UC92)
- Message history nav (UC76)
- Tool display (UC83)
- Notifications (UC84)

### P3 (Low) - 7 features
Future enhancements:
- Survey (UC63)
- Logs command (UC62)
- Admin stats (UC85-86, UC88)

---

## Summary Statistics

**Total User Cases**: 92
- **Streaming**: 5 UC (UC1-5)
- **Session Management**: 7 UC (UC15-21)
- **Message Operations**: 9 UC (UC22-30)
- **Agent & Rules**: 4 UC (UC31-34)
- **Provider & Model**: 6 UC (UC35-40)
- **Token Calculation**: 9 UC (UC41-49)
- **Slash Commands**: 14 UC (UC50-63)
- **AI Tools**: 9 UC (UC64-72)
- **Keyboard Shortcuts**: 5 UC (UC73-77)
- **Multi-Client Advanced**: 3 UC (UC78-80)
- **Configuration**: 4 UC (UC81-84)
- **Admin & Debug**: 5 UC (UC85-89)
- **Advanced Features**: 3 UC (UC90-92)

**Total Requirements**: 7 (R1.1-1.3, R2.1-2.4)
**Total Performance Requirements**: 4 (PR-1 to PR-4)

---

## Related Documents

- [Real-Time Streaming](./02-streaming.md) - UC1-5
- [Session Management](./03-sessions.md) - UC15-21
- [Message Operations](./04-messages.md) - UC22-30
- [Agents & Rules](./05-agents-rules.md) - UC31-34
- [Providers & Models](./06-providers-models.md) - UC35-40
- [Token Calculation](./07-tokens.md) - UC41-49
- [Slash Commands](./08-commands.md) - UC50-63
- [AI Tools](./09-tools.md) - UC64-72
- [Keyboard Shortcuts](./10-keyboard.md) - UC73-77
- [Multi-Client Advanced](./11-multi-client.md) - UC78-80
- [Configuration](./12-configuration.md) - UC81-84
- [Admin & Debug](./13-admin.md) - UC85-89
- [Advanced Features](./14-advanced.md) - UC90-92
- [Testing Strategy](./99-testing.md) - Performance & quality requirements

---

## Revision History

- **v1.0** (2025-01-XX): Initial token calculation specification
- **v2.0** (2025-01-XX): Complete system coverage - 92 user stories across all features
- **v3.0** (2025-01-XX): Split into logical sections for better organization
