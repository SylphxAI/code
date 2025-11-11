# @sylphx/code-core

**Headless SDK for Sylphx Code**

Complete business logic layer with AI providers, tools, and session management.

---

## 🎯 Overview

The core SDK provides all business logic for Sylphx Code, packaged as a headless library. Use it to build custom AI assistants, integrate into existing tools, or create new interfaces.

**Zero UI dependencies** - Pure TypeScript business logic that runs anywhere.

---

## 📦 Installation

```bash
# Using bun
bun add @sylphx/code-core

# Using npm
npm install @sylphx/code-core

# Using pnpm
pnpm add @sylphx/code-core
```

---

## ✨ Features

### AI Provider Support
- **OpenRouter** - 200+ models (GPT-4, Claude, Gemini, Llama)
- **Anthropic** - Direct Claude API access
- **OpenAI** - GPT-4, GPT-3.5, embeddings
- **Google** - Gemini Pro, Gemini Ultra
- **Custom providers** - Extend with your own

### Tool System
- **10+ built-in tools** - File ops, search, shell, user input
- **Dynamic loading** - Tools loaded on-demand
- **Category organization** - File ops, search, shell, user input, project
- **Full type safety** - TypeScript inference for tool inputs/outputs

### Session Management
- **libSQL database** - Embedded SQLite with auto-migration
- **Message persistence** - Full conversation history
- **Drizzle ORM** - Type-safe database queries
- **Session metadata** - Rules, agent, timestamps

### Agent System
- **Multiple agents** - Coder, planner, explorer
- **Custom agents** - Define your own agent behaviors
- **Rule-based customization** - Enable/disable agent capabilities

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { createAIConfig, streamAIResponse } from '@sylphx/code-core';

// 1. Configure AI provider
const config = createAIConfig({
  provider: 'openrouter',
  apiKey: 'YOUR_API_KEY',
  model: 'anthropic/claude-3-5-sonnet',
});

// 2. Stream AI response
const stream = await streamAIResponse({
  config,
  messages: [
    { role: 'user', content: 'Write a function to validate emails' }
  ],
  tools: [], // Optional: Enable specific tools
});

// 3. Handle streaming events
for await (const event of stream) {
  if (event.type === 'text-delta') {
    process.stdout.write(event.textDelta);
  }

  if (event.type === 'tool-call') {
    console.log('Tool:', event.toolName, event.args);
  }
}
```

### With Session Persistence

```typescript
import { getDatabase, SessionRepository } from '@sylphx/code-core';

// 1. Initialize database
const db = await getDatabase('./sessions.db');
const sessionRepo = new SessionRepository(db);

// 2. Create session
const session = await sessionRepo.createSession({
  agentId: 'coder',
  enabledRuleIds: ['rule1', 'rule2'],
  cwd: process.cwd(),
});

// 3. Add messages
await sessionRepo.addMessage(session.id, {
  role: 'user',
  content: 'Hello',
});

// 4. Load session later
const loaded = await sessionRepo.getSession(session.id);
console.log(loaded.messages); // All messages persisted
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│  @sylphx/code-core              │
├─────────────────────────────────┤
│  ai/                            │
│  ├── providers/                 │  ← OpenRouter, Anthropic, OpenAI, Google
│  ├── streaming/                 │  ← AsyncIterator, Observable adapters
│  └── agents/                    │  ← Agent definitions & rules
├─────────────────────────────────┤
│  database/                      │
│  ├── schema.ts                  │  ← Drizzle schema
│  ├── repositories/              │  ← Session, Message CRUD
│  └── migrations/                │  ← Auto-migration system
├─────────────────────────────────┤
│  tools/                         │
│  ├── file/                      │  ← read, write, edit
│  ├── search/                    │  ← glob, grep
│  ├── shell/                     │  ← bash, bash-output, kill-bash
│  ├── user-input/                │  ← ask-user-selection
│  └── project/                   │  ← todo, notification
├─────────────────────────────────┤
│  config/                        │
│  ├── config.ts                  │  ← Multi-tier configuration
│  └── validation.ts              │  ← Zod schemas
└─────────────────────────────────┘
```

---

## 📚 Core Concepts

### AI Providers

Each provider implements the standard interface:

```typescript
interface AIProvider {
  streamText(options: StreamTextOptions): AsyncIterableIterator<StreamEvent>;
  generateText(options: GenerateTextOptions): Promise<GenerateResult>;
}
```

Switch providers without code changes:

```typescript
// OpenRouter
const config1 = { provider: 'openrouter', model: 'anthropic/claude-3-5-sonnet' };

// Anthropic Direct
const config2 = { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };

// Same streaming code works for both
```

### Tool Execution

Tools are executed by the AI during streaming:

```typescript
const stream = await streamAIResponse({
  config,
  messages,
  tools: [
    { name: 'read', execute: async ({ file_path }) => readFile(file_path) },
    { name: 'write', execute: async ({ file_path, content }) => writeFile(file_path, content) },
  ],
});

// AI decides when to call tools
// Results fed back into AI context
// Full type safety with Zod schemas
```

### Session Persistence

Sessions store conversation history:

```typescript
interface Session {
  id: string;
  agentId: string;
  enabledRuleIds: string[];
  cwd: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  status: 'active' | 'complete';
}
```

---

## 🔧 API Reference

### Configuration

```typescript
import { loadAIConfig, saveAIConfig } from '@sylphx/code-core';

// Load config (searches: env vars, .sylphxrc, defaults)
const config = await loadAIConfig(process.cwd());

// Save config
await saveAIConfig({
  provider: 'anthropic',
  apiKey: 'sk-ant-...',
  model: 'claude-3-5-sonnet-20241022',
}, process.cwd());
```

### Streaming

```typescript
import { streamAIResponse } from '@sylphx/code-core';

const stream = await streamAIResponse({
  config,
  messages: [...],
  tools: [...],
  onEvent: (event) => {
    // Optional: Handle events synchronously
  },
});

// Async iteration
for await (const event of stream) {
  switch (event.type) {
    case 'text-delta':
      // Incremental text
      break;
    case 'tool-call':
      // Tool execution
      break;
    case 'finish':
      // Stream complete
      break;
  }
}
```

### Database

```typescript
import { getDatabase, SessionRepository, runMigrations } from '@sylphx/code-core';

// Initialize
const db = await getDatabase('./sessions.db');
await runMigrations(db);

// Use repository
const sessionRepo = new SessionRepository(db);

// CRUD operations
const session = await sessionRepo.createSession({...});
const loaded = await sessionRepo.getSession(sessionId);
await sessionRepo.updateSession(sessionId, {...});
await sessionRepo.deleteSession(sessionId);

// Messages
await sessionRepo.addMessage(sessionId, {...});
const messages = await sessionRepo.getMessages(sessionId);
```

---

## 🎯 Use Cases

### Custom CLI Tool

```typescript
#!/usr/bin/env node
import { streamAIResponse } from '@sylphx/code-core';

const response = await streamAIResponse({
  config: { provider: 'openrouter', model: 'anthropic/claude-3-5-sonnet' },
  messages: [{ role: 'user', content: process.argv[2] }],
});

for await (const event of response) {
  if (event.type === 'text-delta') {
    process.stdout.write(event.textDelta);
  }
}
```

### Integration with Existing App

```typescript
import { createAIConfig, streamAIResponse } from '@sylphx/code-core';

async function askAI(question: string) {
  const stream = await streamAIResponse({
    config: createAIConfig({ provider: 'anthropic' }),
    messages: [{ role: 'user', content: question }],
  });

  let answer = '';
  for await (const event of stream) {
    if (event.type === 'text-delta') {
      answer += event.textDelta;
    }
  }
  return answer;
}
```

### Custom Interface

Build your own TUI, GUI, or web interface:

```typescript
import { SessionRepository, streamAIResponse } from '@sylphx/code-core';

// Your custom UI framework
class MyCustomUI {
  async chat(message: string) {
    const session = await this.sessionRepo.createSession({...});
    await this.sessionRepo.addMessage(session.id, {
      role: 'user',
      content: message,
    });

    const stream = await streamAIResponse({...});

    for await (const event of stream) {
      this.renderEvent(event); // Your custom rendering
    }
  }
}
```

---

## 📊 Performance

- **75ms build time** - Fast compilation with bunup
- **~8,000 lines of code** - Comprehensive yet focused
- **Zero dependencies on UI** - Pure TypeScript business logic
- **Optimized streaming** - AsyncIterator with minimal overhead

---

## 🔗 Related Packages

- **[@sylphx/code-server](../code-server)** - tRPC server wrapper
- **[@sylphx/code-client](../code-client)** - React hooks and stores
- **[@sylphx/code](../code)** - Terminal UI using this SDK
- **[@sylphx/code-web](../code-web)** - Web UI using this SDK

---

## 📄 License

MIT © 2024 Sylphx Ltd

---

## 🔗 Links

- **GitHub**: [github.com/SylphxAI/code](https://github.com/SylphxAI/code)
- **Documentation**: [Root README](../../README.md)
- **Issues**: [Report bugs](https://github.com/SylphxAI/code/issues)

---

**v0.1.0** - Production Ready

*Headless. Type-safe. Extensible.*
