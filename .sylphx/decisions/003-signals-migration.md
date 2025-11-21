# 003. Migrate to Preact Signals (Zen) for State Management

**Status:** 🚧 In Progress (Phase 2 Complete)
**Date:** 2025-01-15
**Updated:** 2025-01-15

## Context

Currently using mixed state management:
- **Zen signals** (preact signals wrapper) in `code-client` for global state
- **React useState** in `code` (UI layer) for component-local state
- 175 useState calls across 41 files

Problem: Theme changes don't trigger re-renders in memoized components because signals aren't wired through React tree.

## Decision

Standardize on **Zen signals** for ALL state management (global + local).

## Architecture

### Current State
```
code-client (signals)     code (React)
    ├─ session            ├─ useState x175
    ├─ ai config          ├─ useEffect
    ├─ queue              └─ React.memo
    └─ ui
```

### Target State
```
All state → Zen signals
React components → useZen() hook for reactivity
No useState/useReducer for state (only for derived/transient UI)
```

## Migration Strategy

### Phase 1: Theme System (✅ Complete)
- [x] Migrated theme system to Zen signals (`domain/theme/`)
- [x] Created useThemeColors() hook
- [x] Updated 46+ components to use new hook
- [x] Removed old theme directory
- [x] Verified reactivity in memoized components

### Phase 2: UI State Hooks (✅ Complete)
- [x] Created UI domain signals structure
  - `domain/ui/input.ts` - Input field state
  - `domain/ui/selection.ts` - Selection/multi-select state
  - `domain/ui/command.ts` - Command menu state
- [x] Migrated useInputState to Zen signals (6 useState eliminated)
- [x] Migrated useSelectionState to Zen signals (9 useState eliminated)
- [x] Migrated useCommandState to Zen signals (10 useState eliminated)
- [x] Maintained backwards compatibility (functional update wrappers)
- [x] Kept refs as React refs (no reactivity needed)

### Phase 3: Streaming State (Pending)
- [ ] Streaming state (`useStreamingState`)

### Phase 3: Component State
- [ ] Transient UI (loading, hover, focus) → keep useState
- [ ] Persistent UI (theme, selected index) → signals
- [ ] Form state → signals or useState (case-by-case)

## Implementation Patterns

### Pattern 1: Global Signal
```ts
// Define signal
export const myState = zen<T>(initialValue);

// React hook
export function useMyState() {
  return useZen(myState);
}

// Actions
export function setMyState(value: T) {
  myState.value = value;
}
```

### Pattern 2: Computed Signal
```ts
export const derived = computed(() => {
  return someSignal.value + otherSignal.value;
});
```

### Pattern 3: Effects
```ts
import { effect } from '@sylphx/zen';

effect(() => {
  console.log('State changed:', myState.value);
});
```

## File Structure

```
code-client/
  signals/
    domain/        # Domain signals (session, ai, queue, ui)
    computed/      # Computed signals
    effects/       # Side effects
    react-bridge.ts  # useZen hook

code/
  hooks/
    signals/       # New: UI-specific signals
      theme.ts
      command.ts
      input.ts
      ...
```

## Migration Checklist

### Infrastructure
- [x] Zen already installed (`@sylphx/zen`)
- [x] React bridge exists (`useZen`)
- [x] UI signals directory structure created
- [x] Patterns documented (architecture.md)

### State Categories

**Global (Priority 1)**
- [x] Theme (migrated to Zen wrapper)
- [x] Session (already Zen)
- [x] AI Config (already Zen)
- [x] UI state (screen, loading, error) (already Zen)

**Feature (Priority 2)**
- [x] Command state (10 useState eliminated)
- [x] Input state (6 useState eliminated)
- [x] Selection state (9 useState eliminated)
- [ ] Streaming state (6 useState remaining)

**Component (Priority 3)**
- [ ] File attachments
- [ ] Project files
- [ ] MCP management
- [ ] Provider management

### Testing Strategy
- Test each migrated signal independently
- Verify React re-renders on signal changes
- Check memo'd components re-render correctly
- Verify no stale closures

## Benefits

**Performance:**
- Fine-grained reactivity (only affected components re-render)
- No unnecessary React tree traversals
- Smaller bundle (less React state machinery)

**Developer Experience:**
- Single source of truth for ALL state
- No prop drilling
- Easier to debug (centralized state)
- Better TypeScript inference

**Consistency:**
- Same patterns everywhere (no useState vs signals confusion)
- Predictable re-render behavior
- Easier onboarding

## Risks

**Migration Cost:**
- 175 useState calls to migrate
- Testing overhead

**Mitigation:**
- Incremental migration (feature by feature)
- Keep useState for truly transient UI (hover, focus)
- Automated tests for each migration

## References

- Implementation: `packages/code-client/src/signals/`
- React bridge: `packages/code-client/src/signals/react-bridge.ts`
- Zen docs: `@sylphx/zen` package
- Example: `domain/session/index.ts`
