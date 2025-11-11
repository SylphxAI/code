# @sylphx/code

**Terminal UI for Sylphx Code**

Beautiful Ink-based interface with vim-inspired navigation.

---

## 🎯 Overview

The Terminal UI (TUI) provides a powerful command-line interface for Sylphx Code. Built with Ink (React for CLIs), it offers a modern terminal experience with real-time AI streaming, multi-session management, and intuitive keyboard controls.

---

## 📦 Installation

```bash
# Using bun (monorepo)
bun install
bun build:code

# Run from monorepo root
bun dev:code

# Or from package
cd packages/code
bun dev
```

---

## ✨ Features

### Vim-Inspired Navigation
- **`j/k`** - Navigate up/down in lists
- **`h/l`** - Navigate left/right in tabs
- **`/`** - Start search/filter
- **`Esc`** - Cancel input, close modals
- **`Enter`** - Select item, submit input
- **`Ctrl+C`** - Quit application

### Real-time Streaming
- **Live AI responses** - See tokens as they arrive
- **Tool execution feedback** - Watch bash commands run
- **Markdown rendering** - Syntax-highlighted code blocks
- **Progress indicators** - Spinners for loading states

### Multi-Session Management
- **Session switching** - Quick session selector (`Ctrl+S`)
- **Session persistence** - All conversations saved to DB
- **Session history** - Browse previous chats
- **Session metadata** - View agent, rules, timestamps

### Slash Commands
- **`/new`** - Create new session
- **`/switch`** - Switch session
- **`/settings`** - Configure agent/rules
- **`/provider`** - Set AI provider
- **`/help`** - Show command list
- **`/quit`** - Exit application

---

## 🚀 Quick Start

### First Run

```bash
# 1. Build packages
bun run build

# 2. Start TUI
bun dev:code

# 3. Configure AI provider
> /provider set openrouter YOUR_API_KEY

# 4. Start chatting
> Write a function that validates email addresses
```

### Configuration

The TUI reads configuration from:
1. Environment variables (`SYLPHX_API_KEY`, `SYLPHX_PROVIDER`)
2. Config file (`~/.sylphxrc`)
3. Interactive prompts (first run)

Example `~/.sylphxrc`:

```json
{
  "provider": "openrouter",
  "apiKey": "sk-or-...",
  "model": "anthropic/claude-3-5-sonnet",
  "defaultAgentId": "coder",
  "defaultEnabledRuleIds": ["rule1", "rule2"]
}
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│  Ink Components (React)         │
│  ├── ChatScreen                 │  ← Main chat interface
│  ├── SettingsScreen             │  ← Agent/rule config
│  └── SessionSelector            │  ← Session management
├─────────────────────────────────┤
│  @sylphx/code-client            │  ← Shared hooks & stores
│  - Event-driven state           │
│  - tRPC client (in-process)     │
│  - Zustand stores               │
├─────────────────────────────────┤
│  @sylphx/code-server            │  ← Embedded server
│  - tRPC router                  │
│  - Business logic               │
│  - Streaming service            │
├─────────────────────────────────┤
│  @sylphx/code-core              │  ← Headless SDK
│  - AI providers                 │
│  - Tool execution               │
│  - Session persistence          │
└─────────────────────────────────┘
```

### In-Process Communication

The TUI embeds the server for **zero-overhead communication**:

```typescript
// Traditional CLI (HTTP localhost)
CLI → HTTP → Server → Business Logic
(~3ms per call)

// Sylphx Code TUI (in-process)
CLI → Direct Function Call → Business Logic
(~0.1ms, 30x faster)
```

---

## 📁 Project Structure

```
src/
├── screens/             # Main UI screens
│   ├── chat/           # Chat interface
│   │   ├── ChatScreen.tsx
│   │   ├── MessageList.tsx
│   │   ├── ChatInput.tsx
│   │   └── streaming/  # Streaming logic
│   ├── settings/       # Settings UI
│   └── dashboard/      # Session dashboard
├── components/         # Reusable components
│   ├── SessionSelector.tsx
│   ├── AgentSelector.tsx
│   ├── RuleSelector.tsx
│   └── Spinner.tsx
├── commands/           # Slash commands
│   ├── new.ts          # /new
│   ├── switch.ts       # /switch
│   ├── settings.ts     # /settings
│   └── provider.ts     # /provider
├── utils/              # Utilities
│   ├── markdown.ts     # Markdown rendering
│   └── keybindings.ts  # Keyboard shortcuts
└── index.ts            # Entry point
```

---

## 🎨 Customization

### Custom Theme

```typescript
import { Text } from 'ink';

// Use chalk for colors
import chalk from 'chalk';

<Text color="cyan">AI Response:</Text>
<Text color={chalk.green}>Success!</Text>
```

### Custom Commands

Add to `src/commands/`:

```typescript
// src/commands/custom.ts
export async function customCommand(args: string[]) {
  console.log('Custom command:', args);
  // Your logic here
}

// Register in src/commands/index.ts
export const commands = {
  custom: customCommand,
  // ...
};
```

---

## 🔧 Development

### Debug Mode

```bash
# Enable debug logs
DEBUG=sylphx:* bun dev:code

# Specific namespaces
DEBUG=sylphx:streaming:* bun dev:code
DEBUG=sylphx:trpc:* bun dev:code
```

### Watch Mode

```bash
# Auto-rebuild on changes
bun --cwd packages/code dev
```

### Testing

```bash
# Run tests
bun test

# Watch mode
bun test:watch
```

---

## 📊 Performance

- **~0.1ms** in-process tRPC calls (30x faster than HTTP)
- **39ms build time** with bunup
- **Instant hot reload** in development
- **Zero network latency** - no HTTP overhead

---

## 🎯 Use Cases

### Daily Coding Assistant

```bash
# Start session
bun dev:code

# Ask questions
> How do I implement JWT authentication in Express?

# Execute code
> Write a middleware function for JWT validation

# Save session (automatic)
# Resume later with /switch
```

### Rapid Prototyping

```bash
# Create new session
> /new

# Quick iterations
> Write a REST API for user management
> Add authentication
> Add tests

# All code saved in chat history
```

### Learning Tool

```bash
# Ask for explanations
> Explain how React hooks work

# Request examples
> Show me examples of useEffect cleanup

# Get best practices
> What are common React anti-patterns?
```

---

## 🔗 Related Packages

- **[@sylphx/code-client](../code-client)** - Shared React hooks and stores
- **[@sylphx/code-server](../code-server)** - Embedded tRPC server
- **[@sylphx/code-core](../code-core)** - Headless SDK
- **[@sylphx/code-web](../code-web)** - Web UI (alternative interface)

---

## 📄 License

MIT © 2024 Sylphx Ltd

---

## 🔗 Links

- **GitHub**: [github.com/SylphxAI/code](https://github.com/SylphxAI/code)
- **Documentation**: [Root README](../../README.md)
- **Architecture**: [ARCHITECTURE_OPTIMIZATION.md](../../ARCHITECTURE_OPTIMIZATION.md)
- **Issues**: [Report bugs](https://github.com/SylphxAI/code/issues)

---

**v0.1.0** - Pure UI Client Architecture

*Fast. Beautiful. Terminal-native.*
