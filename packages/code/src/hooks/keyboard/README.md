# Keyboard Navigation Hooks

These hooks handle keyboard input for the TUI (Terminal User Interface).

## Why are these hooks in the `code` package instead of `code-client`?

**TL;DR**: Ink's `useInput` hook requires all hooks to be in the same package as the component that renders them.

### Technical Details

Ink uses React Context to manage stdin/stdout event emitters. The `useInput` hook accesses this context to register keyboard event listeners.

**The Problem**:
When `useInput` is called inside a hook that's imported from a different package (e.g., `@sylphx/code-client`), React's context propagation doesn't work across package boundaries in a monorepo setup. This causes the keyboard event listeners to never be registered, resulting in frozen/unresponsive UI.

```typescript
// ❌ DOESN'T WORK - Context boundary issue
// code-client/src/hooks/keyboard/useSelectionMode.ts
export function useSelectionMode() {
  useInput((char, key) => {
    // This listener is NEVER registered when imported from code package
  });
}

// code/src/screens/Chat.tsx
import { useSelectionMode } from "@sylphx/code-client";
useSelectionMode(); // ❌ useInput inside doesn't work
```

```typescript
// ✅ WORKS - Same package
// code/src/hooks/keyboard/useSelectionMode.ts
export function useSelectionMode() {
  useInput((char, key) => {
    // This listener IS registered correctly
  });
}

// code/src/screens/Chat.tsx
import { useSelectionMode } from "../hooks/keyboard/useSelectionMode.js";
useSelectionMode(); // ✅ Works perfectly
```

### Why doesn't this affect `code-web`?

The web client doesn't use Ink or `useInput` hooks at all. It uses standard browser DOM events (`onClick`, `onKeyDown`, etc.), which don't have this limitation.

## Architecture Decision

**Keyboard navigation hooks are TUI-specific and should live in the `code` package.**

- `code` package = TUI client (uses Ink's `useInput`)
- `code-web` package = Web client (uses browser events)
- `code-client` package = Shared logic (no `useInput` hooks)

This separation maintains clear boundaries and avoids the React Context issue entirely.

## Hooks in this directory

- **useAbortHandler** - ESC to abort streaming/compacting
- **useKeyboardShortcuts** - Global shortcuts (e.g., double-ESC to clear input)
- **useSelectionMode** - Question/option selection UI
- **usePendingCommand** - Pending command option selection
- **useFileNavigation** - @-mention file autocomplete
- **useCommandNavigation** - Slash command autocomplete

## Related Issues

- Fixed in commit: `fix(keyboard): fix import paths in local keyboard hooks`
- Root cause: Ink context boundary issue across packages
- Solution: Move all keyboard hooks to same package as rendering component
