# 003. Migrate to Preact Signals (Zen) for State Management

**Status:** 🚧 In Progress
**Date:** 2025-01-15

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

### Phase 1: Global State (✅ Partial)
- [x] Theme system (`theme/store.ts` - using preact signals directly)
- [ ] Migrate to Zen wrapper for consistency
- [ ] Session state (already in zen)
- [ ] AI config (already in zen)

### Phase 2: Feature State
- [ ] Command state (`useCommandState`)
- [ ] Input state (`useInputState`)
- [ ] Selection state (`useSelectionState`)
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
- [ ] Create UI signals directory structure
- [ ] Document patterns

### State Categories

**Global (Priority 1)**
- [x] Theme (done, but using raw preact signals)
- [ ] Session (already zen)
- [ ] AI Config (already zen)

**Feature (Priority 2)**
- [ ] Command state (12 useState)
- [ ] Input state (6 useState)
- [ ] Selection state (10 useState)
- [ ] Streaming state (6 useState)

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
