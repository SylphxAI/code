# @sylphx/code-web

Browser-based UI for Sylphx Code AI Development Assistant.

## Architecture

- **Framework**: Preact 10.27 (React-compatible, smaller bundle)
- **Build Tool**: Vite 6.4 (fast dev server, optimized builds)
- **State Management**: zen@3.47.0 signals (shared with TUI)
- **Client**: HTTP tRPC client connecting to code-server

## Features

- Shares zen@3.47.0 signals with TUI for consistent state management
- Preact for lightweight React-compatible rendering
- Vite for fast development and optimized production builds
- Full TypeScript support

## Development

```bash
# From monorepo root
bun run dev:web

# Or from this directory
bun run dev
```

Runs dev server at http://localhost:3000

## Architecture Notes

### State Management

Uses zen@3.47.0 signals from `@sylphx/code-client`:
- `currentSession` - Active chat session
- `messages` - Session messages
- `isStreaming` - Streaming status

Preact hooks bridge via custom `useZen` hook (compatible with Preact's reactivity).

### React Compatibility

Vite config aliases React to Preact for seamless compatibility:
```typescript
{
  resolve: {
    alias: {
      "react": "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
    }
  }
}
```

This allows `@sylphx/code-client` (which uses React types) to work with Preact runtime.

## Build

```bash
bun run build
```

**Note**: Production builds currently have JSX runtime resolution issues with workspace dependencies. Use dev server for now.

## Structure

```
src/
├── App.tsx              # Root component, tRPC provider
├── main.tsx             # Entry point
├── hooks/
│   └── useZen.ts        # Preact bridge for zen signals
├── screens/
│   └── ChatScreen.tsx   # Main chat interface
└── styles/
    └── global.css       # Global styles
```

## TODOs

- [ ] Fix production build JSX runtime resolution
- [ ] Add message input handling
- [ ] Add file attachment support
- [ ] Add command palette (/ commands)
- [ ] Add provider/model selection UI
- [ ] Add session management UI
