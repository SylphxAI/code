# Advanced Features

**Part**: 13 of 14
**User Stories**: UC90-92
**Related**: [Tools](./09-tools.md), [Admin & Debug](./13-admin.md)

---

## Problem Statement

Advanced users need:
1. **MCP server integration** for custom tools
2. **Rate limiting** to prevent abuse
3. **Context warnings** for token management
4. **Custom hooks** for extensibility

---

## User Stories

### UC90: MCP Server Support

**As a** power user
**I want to** connect to MCP servers
**So that** I can extend the AI with custom tools

**Acceptance Criteria**:
- Configure MCP servers in config
- Tools from MCP servers available to AI
- Multiple MCP servers supported
- Server lifecycle management (start/stop)
- Error handling for server failures

**Priority**: P2 (Medium)

---

### UC91: Rate Limiting

**As the** system
**I want to** rate-limit API requests
**So that** I can prevent abuse and ensure fair usage

**Limits**:
- Strict: 10 req/min (create/delete operations)
- Moderate: 30 req/min (update operations)
- Streaming: 5 concurrent streams

**Acceptance Criteria**:
- Per-user limits (future: per-IP)
- 429 status code on limit exceeded
- Retry-After header
- Configurable limits

**Priority**: P1 (High)

---

### UC92: System Message Triggers

**As the** system
**I want to** inject system messages at appropriate times
**So that** the AI can respond to system events

**Triggers**:
- Context warning (80%, 90% usage)
- Resource warnings (memory, CPU)
- Error notifications

**Acceptance Criteria**:
- Hook-based trigger system
- Bidirectional (enter/exit states)
- Flag-based to avoid duplicates
- User-visible in message history

**Priority**: P2 (Medium)

**Related**: See [UC49: Context Warning System Messages](./07-tokens.md#uc49-context-warning-system-messages)

---

## MCP Server Integration

### Configuration

**File**: `.sylphx-code/ai.json`

```json
{
  "mcpServers": [
    {
      "id": "custom-tools",
      "command": "npx",
      "args": ["-y", "@my-org/custom-mcp-server"],
      "env": {
        "API_KEY": "..."
      }
    },
    {
      "id": "database-tools",
      "command": "python",
      "args": ["mcp_servers/database.py"],
      "env": {}
    }
  ]
}
```

### Tool Discovery

1. Server starts on application startup
2. System queries available tools via MCP protocol
3. Tools registered in tool registry
4. AI can call tools like built-in tools

### Tool Execution

```
AI calls MCP tool
  → System routes call to MCP server
  → MCP server executes tool
  → Result returned to AI
  → Display to user (same as built-in tools)
```

### Error Handling

- **Server not responding**: Show error to user, continue with built-in tools
- **Tool execution failure**: Return error to AI, allow retry
- **Server crash**: Auto-restart (with backoff), notify user

---

## Rate Limiting

### Rate Limit Tiers

| Tier | Operations | Limit | Window |
|------|-----------|-------|--------|
| **Strict** | Create session, Delete session, Delete all | 10 req/min | 60s |
| **Moderate** | Update session, Send message, Compact | 30 req/min | 60s |
| **Streaming** | Concurrent streams | 5 concurrent | N/A |

### Rate Limit Response

**HTTP Status**: 429 Too Many Requests

**Headers**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642176000
Retry-After: 45
```

**Body**:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 45 seconds."
  }
}
```

### Implementation

- **Algorithm**: Token bucket or sliding window
- **Storage**: In-memory (Redis for distributed systems)
- **Bypass**: Admin users can bypass (optional)

---

## System Message Triggers

### Context Warning Trigger

**Trigger Condition**: Token usage reaches 80% or 90% of context limit

**System Message**:
```
⚠️ Context usage is at 85% (170,000 / 200,000 tokens).
Consider using /compact to reduce token usage while preserving context.
```

**Implementation**:
- Flag-based: `context_warning_80` and `context_warning_90`
- Bidirectional: Warning added when entering state, removed when exiting
- AI-visible: Injected as system message before API call

**Related**: See [UC49: Context Warning System Messages](./07-tokens.md#uc49-context-warning-system-messages)

---

### Resource Warning Trigger

**Trigger Condition**: System resources (memory, CPU) exceed threshold

**System Message**:
```
⚠️ System memory usage is high (90%). Performance may be degraded.
```

**Implementation**:
- Monitor system resources in background
- Trigger when threshold exceeded
- Clear when resources return to normal

---

### Error Notification Trigger

**Trigger Condition**: Tool execution fails repeatedly

**System Message**:
```
⚠️ Tool execution failed 3 times. There may be an issue with the environment.
```

**Implementation**:
- Track tool execution failures
- Trigger after N consecutive failures
- Clear on successful execution

---

## Hook System (Future)

### Hook Types

1. **Pre-message hooks**: Run before sending message to AI
2. **Post-message hooks**: Run after receiving AI response
3. **Tool execution hooks**: Run before/after tool execution
4. **Session lifecycle hooks**: Run on session create/delete

### Hook Configuration

**File**: `.sylphx-code/hooks.json`

```json
{
  "preMessage": [
    {
      "id": "context-warning",
      "enabled": true
    }
  ],
  "postMessage": [
    {
      "id": "auto-title",
      "enabled": true
    }
  ]
}
```

### Hook Execution

```
User sends message
  → Run pre-message hooks
    → Check context usage (add warning if needed)
    → Check resource usage (add warning if needed)
  → Send message to AI
  → Receive AI response
  → Run post-message hooks
    → Generate title (if first message)
    → Send notifications (if enabled)
  → Display response to user
```

---

## Open Questions

### Q4: MCP Server Discovery

**Question**: Should MCP servers be auto-discovered or manually configured?

**Options**:
- Auto-discover from standard locations
- Manual configuration only ✅ (current)
- Hybrid (discover + override)

**Trade-offs**: Convenience vs security

---

### Q5: Notification Sound Customization

**Question**: Should users be able to customize notification sounds?

**Options**:
- Built-in sounds only ✅ (current)
- User-provided sound files
- No sound (visual only)

**Trade-offs**: Flexibility vs complexity

---

## Related Sections

- [Tools](./09-tools.md) - Built-in tools (UC64-72)
- [Admin & Debug](./13-admin.md) - System monitoring (UC86-87)
- [Token Calculation](./07-tokens.md) - Context warnings (UC49)
- [Overview](./01-overview.md) - Open questions
