# Agent & Rules Management

**Part**: 4 of 14
**User Stories**: UC31-34
**Related**: [Configuration](./12-configuration.md), [Token Calculation](./07-tokens.md), [Commands](./08-commands.md)

---

## Problem Statement

Users need different AI behaviors for different tasks. The system provides:
1. **Built-in agents** with specialized prompts (coder, planner, etc.)
2. **Custom agents** defined in project files
3. **System prompt rules** that can be enabled/disabled
4. **Custom rules** for project-specific guidelines

---

## User Stories

### UC31: Switch Agent

**As a** user
**I want to** switch between different AI agents
**So that** I can use specialized system prompts for different tasks

**Acceptance Criteria**:
- `/agent` command shows agent selection UI
- `/agent <name>` switches directly
- Updates global default and current session
- Token count updates to reflect new system prompt
- Built-in agents: coder, planner, etc.
- Visual feedback on current agent

**Priority**: P0 (Critical)

**Related**: See [UC43: Switch Agent Mid-Session](./07-tokens.md#uc43-switch-agent-mid-session)

---

### UC32: Custom Agents

**As a** user
**I want to** create custom agents
**So that** I can define specialized system prompts

**Acceptance Criteria**:
- Place .md files in `.sylphx-code/.agents/`
- Frontmatter metadata: name, description
- Markdown body = system prompt
- Auto-loaded on startup
- Mixed with built-in agents in `/agent` UI
- Hot reload when files change (optional)

**Priority**: P1 (High)

---

### UC33: Enable/Disable Rules

**As a** user
**I want to** enable/disable system prompt rules
**So that** I can customize AI behavior

**Acceptance Criteria**:
- `/rules` shows multi-select checkbox UI
- Pre-selects currently enabled rules
- Can toggle multiple rules at once
- Updates global default or session-specific
- Token count updates immediately
- Visual indication of enabled/disabled rules

**Priority**: P0 (Critical)

**Related**: See [UC45: Toggle Rules Mid-Session](./07-tokens.md#uc45-toggle-rules-mid-session)

---

### UC34: Custom Rules

**As a** user
**I want to** create custom system prompt rules
**So that** I can enforce project-specific guidelines

**Acceptance Criteria**:
- Place .md files in `.sylphx-code/.rules/`
- Frontmatter metadata: name, description, enabled (default)
- Markdown body = rule content
- Auto-loaded on startup
- Mixed with built-in rules in `/rules` UI
- Hot reload when files change (optional)

**Priority**: P1 (High)

---

## Related Sections

- [Slash Commands](./08-commands.md) - `/agent`, `/rules` commands (UC53-54)
- [Token Calculation](./07-tokens.md) - Agent/rules impact on tokens (UC43, UC45)
- [Configuration](./12-configuration.md) - Global defaults (UC81)
