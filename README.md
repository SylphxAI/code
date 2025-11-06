<div align="center">

# Sylphx Code

**The AI code assistant that actually understands your workflow**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-orange)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![tRPC v11](https://img.shields.io/badge/tRPC-v11-2596be)](https://trpc.io/)

*Terminal UI that thinks fast. Architecture that scales. Zero compromises.*

[Quick Start](#-quick-start) · [Features](#-why-sylphx-code) · [Architecture](#-architecture) · [Documentation](#-documentation)

</div>

---

## 🚀 Why Sylphx Code?

Stop fighting with slow AI tools. Sylphx Code is built from the ground up for **speed**, **flexibility**, and **developer experience**.

### ⚡ Zero-Overhead Architecture

**30x faster than HTTP** with in-process tRPC communication:

```typescript
// Zero-overhead in-process link
Performance: ~0.1ms vs ~3ms (HTTP localhost)
```

Unlike traditional AI assistants that bottleneck on network calls, Sylphx Code uses **direct function calls** between client and server. No serialization overhead. No network latency. Just pure speed.

### 🎯 Real-time Streaming That Actually Works

Built on **tRPC v11 subscriptions** with full type safety:

- **Live AI responses** - See tokens as they stream
- **Tool execution feedback** - Watch bash commands run in real-time
- **Session state sync** - Multi-tab support with zero conflicts
- **Observable-based** - Built on battle-tested reactive primitives

### 🛠️ 10+ Built-in AI Tools

Production-ready tools that actually work:

| Category | Tools | Features |
|----------|-------|----------|
| **File Ops** | `read`, `write`, `edit` | Smart diffing, line-aware edits |
| **Search** | `glob`, `grep` | Fast file finding, regex search |
| **Shell** | `bash`, `bash-output`, `kill-bash` | Background jobs, output streaming |
| **User Input** | `ask-user-selection` | Multi-select, validation |
| **Project** | `todo`, `notification` | Task tracking, OS notifications |

### 🔌 Multi-Provider AI Support

One interface. Every model:

- **OpenRouter** - 200+ models (GPT-4, Claude, Gemini, Llama)
- **Anthropic** - Direct Claude API access
- **OpenAI** - GPT-4, GPT-3.5, embeddings
- **Google** - Gemini Pro, Gemini Ultra
- **Custom** - Bring your own provider

### 🎨 Two Interfaces, One Core

**Terminal UI (TUI)**:
- 🖥️ Beautiful Ink-based interface
- ⌨️ Vim-inspired navigation
- 🔍 Smart autocomplete for commands
- 📊 Real-time session stats
- 🎯 Zero context switching

**Web UI**:
- 🌐 Modern React interface
- 📱 Mobile-responsive
- 🔄 Multi-tab sync
- ⚡ SSE streaming

Both use the **same headless SDK** - build your own interface in minutes.

---

## 📦 Architecture

### The Stack That Makes It Possible

```
┌─────────────────────────────────────────┐
│  🖥️  Terminal UI    🌐  Web UI          │  ← React (Ink / Next.js)
├─────────────────────────────────────────┤
│  @sylphx/code-client                    │  ← React hooks, Zustand stores
│  - tRPC client with in-process link    │
│  - State management & caching           │
├─────────────────────────────────────────┤
│  @sylphx/code-server                    │  ← tRPC v11 server
│  - Subscription-based streaming         │
│  - Multi-session management             │
│  - AppContext (database, agents, rules) │
├─────────────────────────────────────────┤
│  @sylphx/code-core                      │  ← Pure headless SDK
│  - AI providers & streaming             │
│  - Tool execution engine                │
│  - Session persistence (libSQL)         │
│  - Agent & rule system                  │
└─────────────────────────────────────────┘
```

### Key Design Principles

**1. Zero-Overhead In-Process Communication**

Traditional setup:
```
Client → HTTP → JSON → Server → Business Logic
(3ms+ latency per call)
```

Sylphx Code:
```
Client → Direct Function Call → Server
(~0.1ms, 30x faster)
```

**2. Subscription-First Architecture**

Every operation that can stream, does stream:

```typescript
// Real-time AI streaming
client.ai.stream.subscribe({ sessionId }, {
  onData: (event) => {
    // Receive tokens, tool calls, completions in real-time
  }
});
```

**3. Pure Functional Core**

No global state. No singletons. Just pure functions:

```typescript
// ❌ Old way: Global state hell
export const agentManager = new AgentManager();

// ✅ New way: Pure composition
export function loadAllAgents(): Agent[] { ... }
```

**4. Headless SDK First**

Build any interface on top:

```typescript
import { createAIStream, getAISDKTools } from '@sylphx/code-core';

// Terminal, Web, CLI, VSCode extension - your choice
```

---

## 🎯 Quick Start

### Prerequisites

- **Bun** >= 1.3.1 ([Install](https://bun.sh))
- **Node.js** >= 18 (for compatibility)

### Installation

```bash
# Clone the repo
git clone https://github.com/sylphxltd/code.git
cd code

# Install dependencies (uses workspace)
bun install

# Build core packages
bun run build
```

### Run Terminal UI

```bash
# Development mode with hot reload
bun dev:code

# Or build and run
bun build:code
bun --cwd packages/code start
```

### Run Web UI

```bash
# Development mode
bun dev:web

# Build for production
bun build:web
bun --cwd packages/code-web preview
```

### First Chat

1. Configure your AI provider:
```bash
# In the TUI, type:
/provider set openrouter YOUR_API_KEY
```

2. Start chatting:
```
> Write a function that validates email addresses

✨ AI will stream the response with full tool execution
```

---

## 🏗️ Development

### Project Structure

```
packages/
├── code-core/       # Headless SDK (350+ files)
│   ├── ai/          # Providers, streaming, agents
│   ├── database/    # Session persistence (libSQL)
│   ├── tools/       # 10+ built-in AI tools
│   ├── config/      # Multi-tier configuration
│   └── types/       # Shared TypeScript types
├── code-server/     # tRPC v11 server
│   ├── trpc/        # Router, context, procedures
│   ├── services/    # Streaming service
│   └── context.ts   # AppContext (composition root)
├── code-client/     # Shared React client
│   ├── stores/      # Zustand state management
│   ├── trpc-links/  # In-process & HTTP links
│   └── hooks/       # React hooks
├── code/            # Terminal UI (Ink)
│   ├── screens/     # Chat, settings, dashboard
│   ├── commands/    # Slash commands (/help, /new)
│   └── components/  # Reusable UI components
└── code-web/        # Web UI (React + Vite)
    └── src/         # Web interface
```

### Debug Logging

Uses industry-standard [`debug`](https://www.npmjs.com/package/debug) package:

```bash
# Enable all debug logs
DEBUG=sylphx:* bun dev:code

# Enable specific namespaces
DEBUG=sylphx:subscription:* bun dev:code
DEBUG=sylphx:search:* bun dev:code
DEBUG=sylphx:trpc:* bun dev:code

# Multiple namespaces
DEBUG=sylphx:subscription:*,sylphx:stream:* bun dev:code
```

See [DEBUG.md](./DEBUG.md) for complete guide.

### Testing

```bash
# Run all tests
bun test

# Run with coverage
bun test:coverage

# Watch mode
bun test:watch

# Specific test suites
bun test:streaming      # tRPC streaming tests
bun test:adapter        # Subscription adapter tests
```

See [TESTING.md](./TESTING.md) for testing strategies.

### Build System

Uses **bunup** for blazing-fast TypeScript builds:

```bash
# Build all packages
bun run build

# Build individual packages
bun run build:core      # 75ms ⚡
bun run build:server    # 23ms ⚡
bun run build:code      # 39ms ⚡

# Watch mode during development
bun --cwd packages/code-core dev
```

### Code Quality

```bash
# Format with Biome
bun format

# Type check all packages
bun type-check

# Lint (via Turbo)
bun lint

# Clean build artifacts
bun clean
bun clean:all  # Nuclear option
```

---

## 📚 Documentation

### Core Concepts

- **[DEBUG.md](./DEBUG.md)** - Debug logging with `debug` package
- **[TESTING.md](./TESTING.md)** - Testing strategies and patterns
- **[OPTIMIZATION_REPORT.md](./OPTIMIZATION_REPORT.md)** - Performance optimization journey

### Architecture Deep-Dive

**In-Process Communication**:
- Zero serialization overhead
- Direct function calls via tRPC v11
- 30x faster than HTTP localhost

**Streaming Architecture**:
- Observable-based subscriptions
- AsyncIterator support for AI SDK
- Real-time event propagation
- Multi-tab synchronization

**State Management**:
- Zustand for client state
- Immer for immutable updates
- tRPC context for server state
- React hooks for UI integration

**Database Layer**:
- libSQL (embedded SQLite)
- Drizzle ORM for type-safe queries
- Auto-migration system
- Session persistence with message history

**Tool System**:
- 10+ built-in AI tools
- Dynamic tool loading
- Category-based organization
- Full TypeScript type inference

---

## 🎨 Key Features

### 🚀 Performance

- **~0.1ms in-process communication** vs 3ms HTTP localhost
- **75ms builds** with bunup (vs seconds with esbuild)
- **Zero overhead** when debug logging disabled
- **Instant hot reload** in development

### 🔧 Developer Experience

- **Full TypeScript** - End-to-end type safety
- **tRPC v11** - No API docs needed, just autocomplete
- **Monorepo** - Turborepo for instant incremental builds
- **Bun-native** - Fast package management and runtime

### 🎯 Production Ready

- **Session persistence** - libSQL with auto-migration
- **Multi-provider AI** - Swap models without code changes
- **Error handling** - Result types, no exceptions
- **Logging** - Industry-standard `debug` package

### 🛠️ Extensibility

- **Headless SDK** - Build any interface
- **Plugin system** - Custom tools and agents
- **MCP support** - Model Context Protocol integration
- **Provider API** - Add custom AI providers

---

## 🏆 Why We Built This

We were tired of:

❌ **Slow AI assistants** that lag on every request
❌ **Black-box tools** with no visibility into execution
❌ **Locked-in UIs** that force you into their workflow
❌ **Poor streaming** that breaks or stutters
❌ **No real-time feedback** on long-running operations

So we built Sylphx Code:

✅ **Zero-overhead architecture** - 30x faster than traditional setups
✅ **Full transparency** - See every tool call, every token
✅ **Headless SDK** - Build your own interface
✅ **Rock-solid streaming** - tRPC v11 subscriptions
✅ **Real-time everything** - Watch AI think and act

---

## 📊 Performance Benchmarks

### In-Process Link vs HTTP

| Operation | HTTP (localhost) | In-Process | Improvement |
|-----------|------------------|------------|-------------|
| Simple query | ~3ms | ~0.1ms | **30x faster** |
| Streaming start | ~5ms | ~0.2ms | **25x faster** |
| Tool execution | ~4ms | ~0.15ms | **27x faster** |

### Build Times (bunup)

| Package | Lines of Code | Build Time |
|---------|---------------|------------|
| code-core | ~8,000 | **75ms** ⚡ |
| code-server | ~2,000 | **23ms** ⚡ |
| code (TUI) | ~6,000 | **39ms** ⚡ |

### Logging Overhead

| Mode | Performance Impact |
|------|-------------------|
| Debug enabled | ~0.1ms per log |
| Debug disabled | **0ms** (compiled away) |

---

## 🤝 Contributing

We welcome contributions! Please see our [contributing guidelines](./CONTRIBUTING.md) for:

- Code style and conventions
- Testing requirements
- Commit message format
- Pull request process

---

## 📄 License

MIT © 2024 Sylphx Ltd

Built with ❤️ by developers who believe AI assistants should be **fast, transparent, and yours**.

---

## 🔗 Links

- **GitHub**: [github.com/sylphxltd/code](https://github.com/sylphxltd/code)
- **Issues**: [Report bugs](https://github.com/sylphxltd/code/issues)
- **Discussions**: [Join the conversation](https://github.com/sylphxltd/code/discussions)

---

<div align="center">

**Stop settling for slow. Choose Sylphx Code.**

[Get Started](#-quick-start) · [Read the Docs](#-documentation) · [View Architecture](#-architecture)

</div>
