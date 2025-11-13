# Configuration & Settings

**Part**: 11 of 14
**User Stories**: UC81-84
**Related**: [Providers & Models](./06-providers-models.md), [Agents & Rules](./05-agents-rules.md), [Commands](./08-commands.md)

---

## Problem Statement

Users need persistent configuration for:
1. **Global defaults** (provider, model, agent, rules)
2. **Tool display** preferences
3. **Notification** preferences
4. **Security** (credential management)

---

## User Stories

### UC81: Global AI Configuration

**As a** user
**I want** global defaults for AI settings
**So that** new sessions use my preferences

**Configuration File**: `.sylphx-code/ai.json`

**Settings**:
- `defaultProvider`: Default AI provider
- `defaultModel`: Default model
- `defaultAgentId`: Default agent
- `defaultEnabledRuleIds`: Default rules
- Provider configs (without secrets)

**Acceptance Criteria**:
- Auto-created on first run
- JSON format (human-editable)
- Validated on load
- Reloaded on file change

**Priority**: P0 (Critical)

---

### UC82: Credential Storage

**As a** user
**I want** secure storage for API keys
**So that** my credentials are protected

**Storage Locations**:
- Global: `~/.sylphx-code/credentials.json`
- Project: `.sylphx-code/credentials.local.json` (gitignored)

**Acceptance Criteria**:
- File permissions 600 (read/write owner only)
- Multiple credentials per provider
- Label and expiration tracking
- Default credential selection

**Priority**: P0 (Critical)

**Related**: See [UC38: Provider Credential Management](./06-providers-models.md#uc38-provider-credential-management), [UC39: Zero-Knowledge Secret Management](./06-providers-models.md#uc39-zero-knowledge-secret-management)

---

### UC83: Tool Display Settings

**As a** user
**I want to** configure how tool results appear
**So that** I can control output verbosity

**Settings**:
- Show/hide tool inputs
- Show/hide tool outputs
- Collapse/expand by default

**Acceptance Criteria**:
- Stored in ai.json
- Applied to all sessions
- Can override per tool type

**Priority**: P2 (Medium)

**Related**: See [UC59: `/settings` Command](./08-commands.md#uc59-settings---tool-display-settings)

---

### UC84: Notification Preferences

**As a** user
**I want to** control notification behavior
**So that** I'm not disturbed unnecessarily

**Settings**:
- Enable OS notifications
- Enable terminal bell
- Enable sound effects
- Notify on completion/error only

**Acceptance Criteria**:
- Platform-specific implementation
- Test notification available
- Respects system DND mode (optional)

**Priority**: P2 (Medium)

**Related**: See [UC60: `/notifications` Command](./08-commands.md#uc60-notifications---notification-settings)

---

## Configuration File Locations

### Global Configuration

```
~/.sylphx-code/
├── credentials.json         # Global API keys (600 permissions)
└── ai.json                  # Global defaults (optional)
```

### Project Configuration

```
.sylphx-code/
├── ai.json                  # Project AI settings
├── credentials.local.json   # Project API keys (gitignored)
├── .agents/                 # Custom agents
│   └── *.md
└── .rules/                  # Custom rules
    └── *.md
```

---

## Configuration Precedence

When loading configuration, the system uses this precedence (highest to lowest):

1. **Session-specific settings** (set during session, not persisted)
2. **Project configuration** (`.sylphx-code/ai.json`)
3. **Global configuration** (`~/.sylphx-code/ai.json`)
4. **System defaults** (hardcoded fallbacks)

### Example: Model Selection

```
User creates new session
  → Check session-specific model (if set)
  → If not, check project ai.json defaultModel
  → If not, check global ai.json defaultModel
  → If not, use system default (e.g., "claude-sonnet-4-5-20250929")
```

---

## Configuration Schema

### ai.json Schema

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-5-20250929",
  "defaultAgentId": "coder",
  "defaultEnabledRuleIds": ["rule-1", "rule-2"],

  "providers": {
    "anthropic": {
      "type": "anthropic",
      "baseUrl": "https://api.anthropic.com"
    },
    "openai": {
      "type": "openai",
      "baseUrl": "https://api.openai.com"
    }
  },

  "toolDisplay": {
    "showInputs": true,
    "showOutputs": true,
    "collapseByDefault": false
  },

  "notifications": {
    "osNotifications": true,
    "terminalBell": false,
    "soundEffects": true
  }
}
```

### credentials.json Schema

```json
{
  "anthropic": [
    {
      "id": "cred-1",
      "label": "Work Account",
      "apiKey": "sk-ant-...",
      "isDefault": true,
      "lastUsed": "2025-01-15T10:30:00Z",
      "expiresAt": null
    }
  ],
  "openai": [
    {
      "id": "cred-2",
      "label": "Personal",
      "apiKey": "sk-...",
      "isDefault": true,
      "lastUsed": "2025-01-10T08:00:00Z",
      "expiresAt": null
    }
  ]
}
```

---

## Security Considerations

### Credential Protection

1. **File Permissions**: 600 (owner read/write only)
2. **Gitignore**: `credentials.local.json` always gitignored
3. **Zero-Knowledge**: Client never receives API keys
4. **No Logging**: API keys never logged or exposed in errors

**Related**: See [Principle 4: Zero-Knowledge Security](./01-overview.md#principle-4-zero-knowledge-security)

### Configuration Validation

- JSON schema validation on load
- Type checking for all fields
- Required fields enforcement
- Invalid configs show helpful error messages

---

## Related Sections

- [Providers & Models](./06-providers-models.md) - Provider configuration (UC35-39)
- [Agents & Rules](./05-agents-rules.md) - Custom agents/rules (UC32, UC34)
- [Commands](./08-commands.md) - Settings commands (UC59-60)
- [Tools](./09-tools.md) - Tool display settings (UC83)
