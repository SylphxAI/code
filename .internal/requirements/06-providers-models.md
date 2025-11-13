# Provider & Model Configuration

**Part**: 5 of 14
**User Stories**: UC35-40
**Related**: [Configuration](./12-configuration.md), [Token Calculation](./07-tokens.md), [Commands](./08-commands.md)

---

## Problem Statement

Users need to connect to different AI providers (Anthropic, OpenAI, Google, etc.) and select appropriate models. The system supports:
1. **Multiple providers** with different capabilities
2. **Provider credentials** managed securely
3. **Model selection** from provider catalogs
4. **Zero-knowledge architecture** (client never sees API keys)

---

## User Stories

### UC35: Configure Provider

**As a** user
**I want to** configure AI providers
**So that** I can use different AI services

**Acceptance Criteria**:
- `/provider configure <provider>` opens config UI
- Provider schema defines required fields
- API keys stored securely (removed from client config)
- Zero-knowledge: client never sees keys
- `/provider configure <provider> set <key> <value>` for CLI
- Supported providers: Anthropic, OpenAI, Google, OpenRouter, Kimi, ZAI, Claude Code

**Priority**: P0 (Critical)

---

### UC36: Switch Provider

**As a** user
**I want to** switch between configured providers
**So that** I can use different AI services

**Acceptance Criteria**:
- `/provider use` shows provider list
- `/provider use <provider>` switches directly
- Updates global default and current session
- Model list refreshed for new provider
- Validates provider configuration before switch

**Priority**: P0 (Critical)

---

### UC37: Switch Model

**As a** user
**I want to** switch AI models
**So that** I can use different capabilities/pricing

**Acceptance Criteria**:
- `/model` shows model list from current provider
- `/model <name>` switches directly
- Fetches models from provider API (TTL cached 1 hour)
- Token counts recalculated with new tokenizer
- Context limit updated in display
- Shows model capabilities (vision, tools, reasoning)

**Priority**: P0 (Critical)

**Related**: See [UC44: Switch Model Mid-Session](./07-tokens.md#uc44-switch-model-mid-session)

---

### UC38: Provider Credential Management

**As a** user
**I want to** manage multiple API keys per provider
**So that** I can use different credentials for different projects

**Acceptance Criteria**:
- Global scope: `~/.sylphx-code/credentials.json`
- Project scope: `.sylphx-code/credentials.local.json` (gitignored)
- Set default credential per provider
- Label credentials for identification
- Track last used, expiration
- Secure storage (file permissions 600)

**Priority**: P1 (High)

**Related**: See [UC82: Credential Storage](./12-configuration.md#uc82-credential-storage)

---

### UC39: Zero-Knowledge Secret Management

**As a** user
**I want** my API keys to be secure
**So that** they cannot be stolen via XSS or client-side attacks

**Acceptance Criteria**:
- API keys removed before sending config to client
- Client cannot read keys (zero-knowledge)
- Server merges keys from disk during save
- Dedicated setProviderSecret endpoint for updates
- Keys never logged or exposed in errors

**Priority**: P0 (Critical)

**Design Principle**: See [Principle 4: Zero-Knowledge Security](./01-overview.md#principle-4-zero-knowledge-security)

---

### UC40: Model Availability Cache

**As a** user
**I want** fast model switching without API spam
**So that** the system feels responsive

**Acceptance Criteria**:
- TTL cache (1 hour) for model lists
- Fetches from provider API on cache miss
- Background refresh before expiration
- Error handling for provider API failures
- Shows "Loading..." during fetch

**Priority**: P2 (Medium)

---

## Related Sections

- [Slash Commands](./08-commands.md) - `/provider`, `/model` commands (UC51-52)
- [Token Calculation](./07-tokens.md) - Model changes affect tokens (UC44)
- [Configuration](./12-configuration.md) - Provider configs, credentials (UC81-82)
- [Session Management](./03-sessions.md) - Model availability check (UC20)
