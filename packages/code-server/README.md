# @sylphx/code-server

**tRPC v11 Server for Sylphx Code**

Daemon-ready server with real-time streaming and multi-client synchronization.

---

## 🎯 Overview

The server package wraps `@sylphx/code-core` with a tRPC v11 API, providing:
- **HTTP/SSE endpoints** for remote clients
- **Multi-client synchronization** via server events
- **Daemon mode** - Run as background service
- **Type-safe API** - Full TypeScript inference

---

## 📦 Installation

```bash
# Using bun
bun add @sylphx/code-server

# Using npm
npm install @sylphx/code-server

# Using pnpm
pnpm add @sylphx/code-server
```

---

## ✨ Features

### Deployment Modes

**1. Embedded (In-Process)**
```typescript
import { CodeServer } from '@sylphx/code-server';

const server = new CodeServer();
await server.initialize();
const router = server.getRouter();
// Zero-overhead, direct function calls (~0.1ms)
```

**2. HTTP Server**
```bash
PORT=3000 bun --cwd packages/code-server start
# Serves HTTP + SSE on port 3000
```

**3. Daemon (Background Service)**
```bash
# systemd (Linux)
systemctl start sylphx-code-server

# launchd (macOS)
launchctl start com.sylphx.code-server

# Or basic daemon
PORT=3000 bun --cwd packages/code-server start &
```

### Multi-Client Sync

All connected clients stay synchronized via SSE events:

```
TUI Client ←──┐
              │
Web Client ←──┼── Server SSE ──→ Events broadcasted
              │
API Client ←──┘
```

Events emitted:
- `session:created` - New session
- `session:changed` - Session switched
- `streaming:started` - AI streaming begins
- `streaming:completed` - AI streaming ends
- `session:rulesUpdated` - Rules modified

---

## 🚀 Quick Start

### Run as Standalone Server

```bash
# 1. Install globally
bun install -g @sylphx/code-server

# 2. Start server
PORT=3000 sylphx-code-server

# 3. Server running at http://localhost:3000
```

### Use in Your Application

```typescript
import { CodeServer } from '@sylphx/code-server';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@sylphx/code-server';

// Create client
const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
    }),
  ],
});

// Use type-safe API
const sessions = await client.session.list.query();
const newSession = await client.session.create.mutate({
  agentId: 'coder',
  enabledRuleIds: ['rule1'],
});
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│  HTTP/SSE Server (Express)      │
├─────────────────────────────────┤
│  tRPC v11 Router                │
│  ├── session.router.ts          │  ← Session CRUD
│  ├── config.router.ts           │  ← Config management
│  ├── agent.router.ts            │  ← Agent operations
│  └── stream.router.ts           │  ← AI streaming subscriptions
├─────────────────────────────────┤
│  AppContext (DI Container)      │
│  ├── Database                   │
│  ├── SessionRepository          │
│  ├── AgentManager               │
│  └── RuleManager                │
├─────────────────────────────────┤
│  @sylphx/code-core              │  ← Business logic
└─────────────────────────────────┘
```

---

## 📚 API Reference

### Session Router

```typescript
// List all sessions
const sessions = await client.session.list.query();

// Create session
const session = await client.session.create.mutate({
  agentId: 'coder',
  enabledRuleIds: ['rule1', 'rule2'],
  cwd: process.cwd(),
});

// Get session
const loaded = await client.session.get.query({ sessionId });

// Update session
await client.session.update.mutate({
  sessionId,
  enabledRuleIds: ['rule3'],
});

// Delete session
await client.session.delete.mutate({ sessionId });

// Add message
await client.session.addMessage.mutate({
  sessionId,
  role: 'user',
  content: 'Hello',
});
```

### Config Router

```typescript
// Load config
const config = await client.config.load.query({ cwd: process.cwd() });

// Save config
await client.config.save.mutate({
  config: {
    provider: 'anthropic',
    apiKey: 'sk-ant-...',
    model: 'claude-3-5-sonnet-20241022',
  },
  cwd: process.cwd(),
});

// Update rules (server decides where to persist)
await client.config.updateRules.mutate({
  ruleIds: ['rule1', 'rule2'],
  sessionId: 'optional-session-id',
});
```

### Stream Router (Subscriptions)

```typescript
// Subscribe to AI streaming
client.stream.aiStream.subscribe(
  {
    sessionId,
    message: 'Write a function',
  },
  {
    onData: (event) => {
      if (event.type === 'text-delta') {
        process.stdout.write(event.textDelta);
      }

      if (event.type === 'tool-call') {
        console.log('Tool:', event.toolName);
      }
    },
    onError: (error) => {
      console.error('Stream error:', error);
    },
    onComplete: () => {
      console.log('Stream complete');
    },
  }
);
```

### Agent Router

```typescript
// List agents
const agents = await client.agent.list.query();

// Get agent
const agent = await client.agent.get.query({ agentId: 'coder' });

// List rules
const rules = await client.agent.listRules.query({ agentId: 'coder' });
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Server port
PORT=3000

# Database location
DATABASE_PATH=./sessions.db

# Log level
LOG_LEVEL=info

# CORS origin (for web clients)
CORS_ORIGIN=http://localhost:5173
```

### Daemon Setup

**systemd (Linux)**

Create `/etc/systemd/system/sylphx-code-server.service`:

```ini
[Unit]
Description=Sylphx Code Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser
Environment="PORT=3000"
ExecStart=/usr/bin/bun run @sylphx/code-server
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable sylphx-code-server
systemctl start sylphx-code-server
```

**launchd (macOS)**

Create `~/Library/LaunchAgents/com.sylphx.code-server.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.sylphx.code-server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/bun</string>
    <string>run</string>
    <string>@sylphx/code-server</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key>
    <string>3000</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.sylphx.code-server.plist
launchctl start com.sylphx.code-server
```

---

## 🌐 SSE Streaming

Server-Sent Events provide real-time updates:

```typescript
// Server emits events
eventBus.emit('session:created', { sessionId, enabledRuleIds });

// Clients receive via SSE
const eventSource = new EventSource('http://localhost:3000/events');
eventSource.addEventListener('session:created', (event) => {
  const data = JSON.parse(event.data);
  console.log('New session:', data.sessionId);
});
```

All events are type-safe:

```typescript
interface AppEvents {
  'session:created': { sessionId: string; enabledRuleIds: string[] };
  'session:changed': { sessionId: string | null };
  'streaming:started': { sessionId: string; messageId: string };
  'streaming:completed': { sessionId: string; messageId: string };
  'session:rulesUpdated': { sessionId: string; enabledRuleIds: string[] };
}
```

---

## 📊 Performance

- **~0.1ms** in-process communication (30x faster than HTTP)
- **23ms build time** with bunup
- **Zero overhead** when embedded
- **Instant hot reload** in development

---

## 🔗 Related Packages

- **[@sylphx/code-core](../code-core)** - Headless SDK (business logic)
- **[@sylphx/code-client](../code-client)** - React client library
- **[@sylphx/code](../code)** - Terminal UI
- **[@sylphx/code-web](../code-web)** - Web UI

---

## 📄 License

MIT © 2024 Sylphx Ltd

---

## 🔗 Links

- **GitHub**: [github.com/sylphxltd/code](https://github.com/sylphxltd/code)
- **Documentation**: [Root README](../../README.md)
- **Daemon Guide**: [DAEMON_VERIFICATION.md](../../DAEMON_VERIFICATION.md)
- **Issues**: [Report bugs](https://github.com/sylphxltd/code/issues)

---

**v0.1.0** - Daemon Ready

*Type-safe. Real-time. Multi-client.*
