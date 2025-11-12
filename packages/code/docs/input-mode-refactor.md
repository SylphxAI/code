# Input Mode Management Refactoring

## Problem Statement

Current keyboard input handling is fragmented across multiple hooks, each with its own `isActive` condition. This leads to:

- **Fragile coordination**: Hooks must manually coordinate through `isActive` conditions
- **Difficult debugging**: Input conflicts require checking all hooks
- **Easy to break**: Adding new hooks can accidentally create conflicts
- **No visibility**: Hard to see which mode is currently active

## Current Architecture

```
Multiple useInput hooks (all potentially active):
├── useSelectionMode     { isActive: !!pendingInput && pendingInput.type === "selection" }
├── useCommandNavigation { isActive: !pendingInput }
├── usePendingCommand    { isActive: !pendingInput }
├── useFileNavigation    { isActive: !pendingInput }
└── useKeyboardShortcuts { isActive: true }
```

**Issues:**
- No central state machine
- Implicit mode transitions
- Distributed arrow key handling
- Hard to audit all key bindings

## Proposed Architecture: Centralized Input Mode Manager

### Core Concept: Explicit Modes

Define explicit input modes as an enum:

```typescript
enum InputMode {
  NORMAL = "normal",           // Default: typing in input field
  SELECTION = "selection",     // Question/option selection (waitForInput)
  COMMAND_AUTOCOMPLETE = "command_autocomplete",  // Slash command dropdown
  FILE_NAVIGATION = "file_navigation",           // @-mention file picker
  PENDING_COMMAND = "pending_command",           // Command argument selection
}
```

### State Machine

```
┌─────────────┐
│   NORMAL    │ ◄─────────────────────────────┐
└─────────────┘                                │
      │                                        │
      ├──(pendingInput: selection)──► SELECTION
      ├──(input starts with /)──► COMMAND_AUTOCOMPLETE
      ├──(input contains @)──► FILE_NAVIGATION
      └──(pendingCommand)──► PENDING_COMMAND
                                                │
(All modes) ──(Escape/Complete)────────────────┘
```

### New File Structure

```
packages/code/src/hooks/input-manager/
├── types.ts                    # InputMode enum, types
├── useInputMode.ts            # Central mode state hook
├── InputModeManager.tsx       # Central input router component
└── handlers/
    ├── NormalModeHandler.ts
    ├── SelectionModeHandler.ts
    ├── CommandAutocompleteModeHandler.ts
    ├── FileNavigationModeHandler.ts
    └── PendingCommandModeHandler.ts
```

## Implementation Plan

### Phase 1: Create Core Infrastructure

**File: `packages/code/src/hooks/input-manager/types.ts`**

```typescript
export enum InputMode {
  NORMAL = "normal",
  SELECTION = "selection",
  COMMAND_AUTOCOMPLETE = "command_autocomplete",
  FILE_NAVIGATION = "file_navigation",
  PENDING_COMMAND = "pending_command",
}

export interface InputModeContext {
  mode: InputMode;
  setMode: (mode: InputMode) => void;

  // Mode-specific data
  pendingInput?: WaitForInputOptions | null;
  input?: string;
  pendingCommand?: any;
  // ... other context data
}

export interface InputHandler {
  mode: InputMode;
  isActive: (context: InputModeContext) => boolean;
  handleInput: (char: string, key: Key, context: InputModeContext) => boolean;
  priority?: number; // For conflict resolution
}
```

**File: `packages/code/src/hooks/input-manager/useInputMode.ts`**

```typescript
export function useInputMode(deps: {
  pendingInput: WaitForInputOptions | null;
  input: string;
  pendingCommand: any;
}): InputModeContext {
  const [mode, setMode] = useState<InputMode>(InputMode.NORMAL);

  // Auto-detect mode transitions based on state
  useEffect(() => {
    if (deps.pendingInput?.type === "selection") {
      setMode(InputMode.SELECTION);
    } else if (deps.pendingCommand) {
      setMode(InputMode.PENDING_COMMAND);
    } else if (deps.input.startsWith("/")) {
      setMode(InputMode.COMMAND_AUTOCOMPLETE);
    } else if (deps.input.includes("@")) {
      setMode(InputMode.FILE_NAVIGATION);
    } else {
      setMode(InputMode.NORMAL);
    }
  }, [deps.pendingInput, deps.input, deps.pendingCommand]);

  return {
    mode,
    setMode,
    ...deps,
  };
}
```

### Phase 2: Create Handler Base Class

**File: `packages/code/src/hooks/input-manager/handlers/BaseHandler.ts`**

```typescript
export abstract class BaseInputHandler implements InputHandler {
  abstract mode: InputMode;

  isActive(context: InputModeContext): boolean {
    return context.mode === this.mode;
  }

  abstract handleInput(char: string, key: Key, context: InputModeContext): boolean;

  // Common utilities
  protected handleArrowUp(callback: () => void): boolean {
    callback();
    return true; // Consume event
  }

  protected handleArrowDown(callback: () => void): boolean {
    callback();
    return true;
  }
}
```

### Phase 3: Migrate Existing Hooks to Handlers

**Example: Selection Mode Handler**

```typescript
export class SelectionModeHandler extends BaseInputHandler {
  mode = InputMode.SELECTION;

  constructor(private deps: {
    setSelectedCommandIndex: Dispatch<SetStateAction<number>>;
    // ... other deps
  }) {
    super();
  }

  handleInput(char: string, key: Key, context: InputModeContext): boolean {
    if (!context.pendingInput || context.pendingInput.type !== "selection") {
      return false;
    }

    const { setSelectedCommandIndex } = this.deps;

    // Arrow down
    if (key.downArrow) {
      return this.handleArrowDown(() => {
        setSelectedCommandIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
      });
    }

    // Arrow up
    if (key.upArrow) {
      return this.handleArrowUp(() => {
        setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
      });
    }

    // ... rest of selection logic

    return false;
  }
}
```

### Phase 4: Create Input Mode Manager

**File: `packages/code/src/hooks/input-manager/InputModeManager.tsx`**

```typescript
export function useInputModeManager(context: InputModeContext) {
  const handlers = useMemo(() => [
    new SelectionModeHandler({ /* deps */ }),
    new CommandAutocompleteModeHandler({ /* deps */ }),
    new FileNavigationModeHandler({ /* deps */ }),
    new PendingCommandModeHandler({ /* deps */ }),
    new NormalModeHandler({ /* deps */ }),
  ], [/* deps */]);

  useInput((char, key) => {
    // Find active handler based on current mode
    const activeHandler = handlers.find(h => h.isActive(context));

    if (!activeHandler) {
      console.warn(`No handler for mode: ${context.mode}`);
      return false;
    }

    // Delegate to handler
    const consumed = activeHandler.handleInput(char, key, context);

    // Debug logging
    if (consumed) {
      console.debug(`[InputMode:${context.mode}] Key consumed:`, { char, key });
    }

    return consumed;
  }, { isActive: true });
}
```

### Phase 5: Integration in Chat.tsx

```typescript
export function Chat() {
  // ... existing state

  // Replace individual hooks with centralized mode manager
  const inputModeContext = useInputMode({
    pendingInput,
    input,
    pendingCommand,
  });

  useInputModeManager(inputModeContext);

  // Remove old hooks:
  // useSelectionMode(...)
  // useCommandNavigation(...)
  // usePendingCommand(...)
  // useFileNavigation(...)

  // Keep global shortcuts (they work across all modes)
  useKeyboardShortcuts({ ... });

  return (
    <>
      {/* Debug indicator */}
      <Text dimColor>Mode: {inputModeContext.mode}</Text>

      {/* ... rest of UI */}
    </>
  );
}
```

## Benefits

### 1. **Explicit State Machine**
- Clear visibility of which mode is active
- Documented transitions between modes
- Easy to add debug logging

### 2. **Conflict Prevention by Design**
- Only ONE handler active per mode
- Impossible to have multiple arrow key handlers fighting
- New modes can't accidentally break existing ones

### 3. **Easier Testing**
- Test each handler in isolation
- Mock the InputModeContext
- Test mode transitions independently

### 4. **Better Debugging**
- Debug overlay showing current mode
- Log which handler consumed which key
- Trace mode transitions

### 5. **Centralized Documentation**
- All key bindings visible in one place
- Easy to generate keyboard shortcut reference
- Can build interactive help system

## Migration Strategy

### Step 1: Create infrastructure (non-breaking)
- Add new files without touching existing code
- Create handlers that wrap existing hook logic

### Step 2: Add parallel system
- Integrate InputModeManager alongside existing hooks
- Add feature flag to switch between old/new system
- Test thoroughly in parallel mode

### Step 3: Gradual migration
- Migrate one mode at a time
- Keep old hooks as fallback
- Monitor for regressions

### Step 4: Cleanup
- Remove old hooks once all modes migrated
- Remove feature flags
- Update documentation

## Testing Plan

### Unit Tests
```typescript
describe('SelectionModeHandler', () => {
  it('should handle arrow keys only in selection mode', () => {
    const handler = new SelectionModeHandler({ ... });
    const context = { mode: InputMode.SELECTION, ... };

    const consumed = handler.handleInput('', { downArrow: true }, context);
    expect(consumed).toBe(true);
  });

  it('should not handle keys in other modes', () => {
    const handler = new SelectionModeHandler({ ... });
    const context = { mode: InputMode.NORMAL, ... };

    const consumed = handler.handleInput('', { downArrow: true }, context);
    expect(consumed).toBe(false);
  });
});
```

### Integration Tests
- Test mode transitions
- Test that only one handler is active at a time
- Test keyboard shortcuts work across all modes

### Manual Testing Checklist
- [ ] Selection UI navigation (arrow keys)
- [ ] Command autocomplete navigation
- [ ] File picker navigation
- [ ] Escape key exits modes correctly
- [ ] Mode transitions are smooth
- [ ] No visual glitches during transitions

## Future Enhancements

### 1. **Keyboard Shortcut Registry**
```typescript
// Auto-generate help screen from registered shortcuts
const shortcuts = InputModeManager.getShortcuts(InputMode.SELECTION);
```

### 2. **Mode History**
```typescript
// Navigate back through mode history
inputModeContext.previousMode();
```

### 3. **Custom Modes**
```typescript
// Plugins can register custom input modes
registerInputMode('vim-mode', new VimModeHandler());
```

### 4. **Replay/Recording**
```typescript
// Record and replay input sequences for testing
InputModeRecorder.record();
InputModeRecorder.replay(sequence);
```

## Risks & Mitigation

### Risk: Breaking existing behavior
**Mitigation**:
- Feature flag for gradual rollout
- Extensive testing before migration
- Keep old code until fully validated

### Risk: Performance overhead
**Mitigation**:
- Handlers are memoized
- Single useInput hook (same as before)
- Profile before/after to measure impact

### Risk: Complexity increase
**Mitigation**:
- Clear documentation
- Type-safe APIs
- Examples for each handler type

## Conclusion

This refactoring will make the input handling system:
- ✅ More robust (no conflicts by design)
- ✅ Easier to debug (explicit modes)
- ✅ Easier to extend (add new modes cleanly)
- ✅ Better documented (centralized key bindings)
- ✅ More testable (isolated handlers)

The migration can be done gradually with minimal risk.

## Decision

**Recommendation**: Proceed with Phase 1-3 refactoring

**Timeline Estimate**:
- Phase 1: 2-3 hours (infrastructure)
- Phase 2: 1-2 hours (base handler)
- Phase 3: 4-6 hours (migrate handlers)
- Phase 4: 2-3 hours (manager)
- Phase 5: 1-2 hours (integration)
- Testing: 2-3 hours

**Total**: ~12-19 hours of focused work
