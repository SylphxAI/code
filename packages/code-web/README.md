# @sylphx/code-web

**Modern Web UI for Sylphx Code**

Built with React 19, Vite, and real-time SSE streaming.

---

## 🎯 Overview

The web interface for Sylphx Code provides a modern, responsive UI for interacting with AI assistants. It connects to the `@sylphx/code-server` daemon via HTTP and receives real-time updates through Server-Sent Events (SSE).

### Architecture

```
┌─────────────────────────────┐
│   React 19 + Vite           │
├─────────────────────────────┤
│   @sylphx/code-client       │  ← Shared stores & hooks
│   - Event-driven state      │
│   - tRPC client             │
│   - Zustand stores          │
├─────────────────────────────┤
│   HTTP + SSE                │  ← Real-time connection
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│   @sylphx/code-server       │  ← Daemon server
│   - tRPC v11 endpoints      │
│   - SSE streaming           │
│   - Multi-client sync       │
└─────────────────────────────┘
```

---

## 🚀 Quick Start

### Development Mode

```bash
# From monorepo root
bun dev:web

# Or from this package
bun dev
```

The dev server starts at `http://localhost:5173`

### Production Build

```bash
# Build optimized bundle
bun build

# Preview production build
bun preview
```

---

## ✨ Features

### Real-time Streaming
- **Server-Sent Events (SSE)** - Live AI response streaming
- **Multi-tab sync** - All browser tabs stay synchronized
- **Optimistic updates** - Instant UI feedback

### Modern UI
- **React 19** - Latest React features
- **Tailwind CSS** - Utility-first styling
- **Responsive design** - Mobile-friendly layout
- **Markdown rendering** - `react-markdown` with GitHub Flavored Markdown

### Type-safe API
- **tRPC v11** - End-to-end type safety
- **React Query** - Automatic caching and refetching
- **Zustand stores** - Shared state with `@sylphx/code-client`

---

## 🏗️ Tech Stack

- **React** 19.1.1 - UI library
- **Vite** 7.1.7 - Build tool & dev server
- **TypeScript** 5.9.3 - Type safety
- **Tailwind CSS** - Styling
- **tRPC** 11.7.1 - API layer
- **React Query** 5.90.6 - Data fetching
- **react-markdown** 10.1.0 - Markdown rendering

---

## 📁 Project Structure

```
src/
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Utilities and helpers
├── App.tsx          # Root component
└── main.tsx         # Entry point
```

---

## 🔌 Connecting to Server

The web UI connects to the server daemon via environment variables:

```bash
# .env.local
VITE_SERVER_URL=http://localhost:3000
```

Default: `http://localhost:3000`

### Starting the Server

```bash
# From monorepo root
PORT=3000 bun --cwd packages/code-server start

# Or with daemon setup (systemd/launchd)
systemctl start sylphx-code-server  # Linux
launchctl start com.sylphx.code-server  # macOS
```

---

## 🎨 Development

### ESLint Configuration

This package uses ESLint 9 with TypeScript support:

```bash
# Run linter
bun lint
```

For production applications, consider enabling type-aware lint rules (see original Vite template comments in `eslint.config.js`).

### Hot Module Replacement (HMR)

Vite provides instant HMR with `@vitejs/plugin-react`:
- Fast Refresh for React components
- Preserves component state during edits
- Shows errors in browser overlay

---

## 🔧 Scripts

```bash
bun dev       # Start dev server (http://localhost:5173)
bun build     # Build for production (output: dist/)
bun preview   # Preview production build
bun lint      # Run ESLint
```

---

## 🌐 Multi-Client Sync

The web UI supports multiple simultaneous connections:

```
Browser Tab 1 ←──┐
                 │
Browser Tab 2 ←──┼── Server SSE Events ──→ All clients synchronized
                 │
TUI Client    ←──┘
```

All clients receive the same events:
- `session:created` - New session
- `session:changed` - Session switched
- `streaming:started` - AI streaming begins
- `streaming:completed` - AI streaming ends
- `session:rulesUpdated` - Rules modified

---

## 📚 Related Packages

- **[@sylphx/code-client](../code-client)** - Shared React hooks and stores
- **[@sylphx/code-server](../code-server)** - tRPC server daemon
- **[@sylphx/code-core](../code-core)** - Headless SDK
- **[@sylphx/code](../code)** - Terminal UI

---

## 📄 License

MIT © 2024 Sylphx Ltd

---

## 🔗 Links

- **Main Repo**: [github.com/SylphxAI/code](https://github.com/SylphxAI/code)
- **Documentation**: [Root README](../../README.md)
- **Architecture**: [ARCHITECTURE_OPTIMIZATION.md](../../ARCHITECTURE_OPTIMIZATION.md)
- **Issues**: [Report bugs](https://github.com/SylphxAI/code/issues)

---

**v0.1.0** - Pure UI Client Architecture

*Event-driven. Real-time. Type-safe.*
