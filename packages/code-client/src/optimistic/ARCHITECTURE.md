# Optimistic Update System - Effect Architecture

## Overview

Pure functional optimistic update system using Effect Pattern.

**Core Principles:**
- **Pure Functional**: Manager returns effects, doesn't mutate state
- **Framework Agnostic**: Works with any state system (Zen, React, Vue, etc.)
- **Testable**: Mock effect runner for testing
- **Composable**: Effects can be combined, filtered, transformed
- **Ready for extraction**: Zero coupling, can be npm package

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Consumer (subscriptionAdapter.ts)         │
│                                                               │
│  1. Call manager:  const result = manager.apply(...)         │
│  2. Run effects:   runOptimisticEffects(result.effects)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              OptimisticManagerV2 (Pure Functional)           │
│                                                               │
│  - apply(op) → EffectResult                                  │
│  - confirm(id) → EffectResult                                │
│  - rollback(id) → EffectResult                               │
│  - reconcile(event) → EffectResult                           │
│                                                               │
│  Returns effects (no side effects!)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Effect Helpers                             │
│                                                               │
│  - effectsForApply() → Effect[]                              │
│  - effectsForConfirm() → Effect[]                            │
│  - effectsForRollback() → Effect[]                           │
│                                                               │
│  Generates state patches + timeout + events                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Effect Runner                              │
│                                                               │
│  runEffects(effects, config)                                 │
│                                                               │
│  Executes:                                                    │
│  - PATCH_STATE → config.applyPatch()                         │
│  - SCHEDULE_TIMEOUT → setTimeout()                           │
│  - EMIT_EVENT → config.emitEvent()                           │
│  - LOG → config.log()                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Zen Signal Adapter                           │
│                                                               │
│  applyPatchToZenSignals(patch)                               │
│  - patch.path = "currentSession.status"                      │
│    → setCurrentSession({ ...session, status: patch.value })  │
│                                                               │
│  Framework-specific adapter                                   │
└─────────────────────────────────────────────────────────────┘
```

## Effect Types

```typescript
type Effect =
  | { type: "PATCH_STATE"; patches: StatePatch[] }
  | { type: "SCHEDULE_TIMEOUT"; timeoutId: string; ms: number; onTimeout: () => Effect[] }
  | { type: "CANCEL_TIMEOUT"; timeoutId: string }
  | { type: "EMIT_EVENT"; event: string; payload: any }
  | { type: "LOG"; level: "info" | "warn" | "error"; message: string };
```

## Usage Example

### Before (Old System - Dual State Management)

```typescript
// ❌ Direct mutation + tracking (conflict!)
setCurrentSession({ ...session, status: newStatus });
trackOptimisticSessionStatus({ sessionId, status: newStatus });

// Problems:
// 1. Optimistic system doesn't own signals
// 2. Rollback doesn't update signals
// 3. Timeout + direct update = inconsistent state
```

### After (New System - Effect-Based)

```typescript
// ✅ Pure functional
const result = optimisticManagerV2.apply(sessionId, {
  type: "update-session-status",
  sessionId,
  status: newStatus,
  previousStatus: session.status,
});

// Run effects (single source of truth)
runOptimisticEffects(result.effects);

// Effects generated:
// 1. PATCH_STATE → updates zen signal
// 2. SCHEDULE_TIMEOUT → auto-rollback if no confirmation
// 3. EMIT_EVENT → notify observers
```

## Benefits

### 1. Pure Functional
```typescript
// Manager has NO side effects
const result = manager.apply(sessionId, operation);
// result.effects describes what SHOULD happen
// Nothing executed yet!

// Execute effects separately
runEffects(result.effects, config);
```

### 2. Testable
```typescript
// Test manager without mocking signals
const result = manager.apply(sessionId, operation);
expect(result.effects).toContainEqual({
  type: "PATCH_STATE",
  patches: [{ path: "currentSession.status", value: newStatus }]
});

// Mock effect runner for integration tests
runEffects(result.effects, {
  applyPatch: mockPatch,
  emitEvent: mockEvent,
});
```

### 3. Framework Agnostic
```typescript
// Zen Signals
runEffects(effects, zenConfig);

// React State
runEffects(effects, reactConfig);

// Vue Ref
runEffects(effects, vueConfig);

// Same manager, different adapters!
```

### 4. Composable
```typescript
// Combine multiple operations
const effects1 = manager.apply(sessionId, op1).effects;
const effects2 = manager.apply(sessionId, op2).effects;
const combined = [...effects1, ...effects2];
runEffects(combined, config);

// Filter effects
const onlyPatches = effects.filter(e => e.type === "PATCH_STATE");
```

### 5. Time-Travel Debugging
```typescript
// Record all effects
const history: Effect[][] = [];
function recordEffects(effects: Effect[]) {
  history.push(effects);
  runEffects(effects, config);
}

// Replay history
for (const effects of history) {
  runEffects(effects, config);
}
```

### 6. Multi-Client Sync
```typescript
// Serialize effects
const json = JSON.stringify(effects);
ws.send(json);

// Other client receives
const effects = JSON.parse(json);
runEffects(effects, config);
```

## Migration Path

### Phase 1: V2 Coexistence
- Keep V1 manager for existing code
- Use V2 for new features (session status)
- Both systems can run side-by-side

### Phase 2: Gradual Migration
- Migrate one entity type at a time
- Messages → V2
- Queue → V2
- Status → V2

### Phase 3: Extract Package
- Move V2 to `@sylphx/optimistic`
- Zero dependencies
- Works with any framework

## Files

```
optimistic/
├── effects.ts           # Effect type definitions
├── effect-runner.ts     # Generic effect executor
├── effect-helpers.ts    # Effect generation helpers
├── manager-v2.ts        # Pure functional manager
├── zen-adapter.ts       # Zen signals integration
├── operations.ts        # Operation apply/inverse (shared)
├── types.ts             # Shared types
└── ARCHITECTURE.md      # This file

# Legacy (to be migrated)
├── manager.ts           # Old stateful manager
└── integration.ts       # Old integration layer
```

## Next Steps

1. **Update subscriptionAdapter** to use V2 + effects
2. **Update event handlers** to run effects
3. **Test end-to-end** with status bar
4. **Document patterns** for other entity types
5. **Extract as package** when stable
