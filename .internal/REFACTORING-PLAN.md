# Deep Refactoring Plan

**Created**: 2025-01-XX
**Status**: In Progress
**Goal**: Improve code quality, maintainability, and architectural consistency

---

## 🎯 Refactoring Goals

1. **Single Responsibility**: Each module has one clear purpose
2. **Type Safety**: Remove all `any` types, use strict TypeScript
3. **Consistency**: Unified patterns across codebase
4. **Performance**: Optimize hot paths, unified caching
5. **Maintainability**: Clear structure, minimal duplication

---

## 📊 Current State Analysis

### Issues Identified

#### 1. Massive Service File ⚠️ CRITICAL
**File**: `code-server/src/services/streaming.service.ts` (1450 lines)

**Problems**:
- Violates Single Responsibility Principle
- Mixes multiple concerns (session, tokens, streaming, persistence)
- Hard to test in isolation
- Inline imports scattered throughout
- 78+ `any` type usages across codebase

**Impact**: HIGH - Core streaming logic is brittle

---

#### 2. Empty Legacy Files 📁
**Files**:
- `code-core/src/ai/agent-manager.ts` (11 lines, empty stub)
- `code-core/src/ai/rule-manager.ts` (11 lines, empty stub)

**Problems**:
- Confusing for new developers
- Pollute search results
- False positive in dependency analysis

**Impact**: LOW - Annoying but not breaking

---

#### 3. Session Concept Confusion 🤔
**Files**:
- `code-core/src/utils/session-manager.ts` - File-based sessions
- `code-core/src/database/session-repository.ts` - Database sessions
- `code-server/src/services/streaming/session-manager.ts` - Another manager

**Problems**:
- Unclear which to use when
- Naming collision (all called "session-manager")
- Different data models

**Impact**: MEDIUM - Developer confusion, potential bugs

---

#### 4. Type Safety Issues 🔴
**Stats**:
- 78 occurrences of `: any` across 26 files
- Multiple `any[]` usages
- Loose type assertions

**Top Offenders**:
- `target-utils.ts`: 10 usages
- `service.interface.ts`: 4 usages
- `auto-migrate.ts`: 4 usages
- `config/ai-config.ts`: 5 usages

**Impact**: MEDIUM - Runtime errors, poor IDE support

---

#### 5. TODO Comments (15 files) 📝
**Sample TODOs**:
- `model-message-token-calculator.ts`: Image token calculation
- `session.router.ts`: Missing implementation
- `streaming.service.ts`: Track duration
- Several "TODO: Implement" stubs

**Impact**: LOW - Technical debt markers

---

#### 6. Inconsistent Naming 📛
**Patterns Found**:
- `SessionRepository` vs `session-manager.ts`
- `AgentManagerService` vs `agent-loader.ts`
- `streamAIResponse` vs `streaming.service.ts`

**Impact**: LOW - Developer confusion

---

#### 7. Scattered Cache Management 💾
**Caches**:
- `token-counter.ts` - Tokenizer cache
- `session-tokens.ts` - Base context cache
- `model-message-token-calculator.ts` - Message cache
- Provider capabilities cache (in-memory, no management)

**Problems**:
- No unified cache stats
- No unified cache clearing
- Different eviction strategies

**Impact**: MEDIUM - Performance debugging difficulty

---

#### 8. Error Handling Inconsistency ⚠️
**Patterns Found**:
- Some: `try-catch → return null`
- Some: `try-catch → throw error`
- Some: `try-catch → console.error + continue`
- Some: `try-catch → emit error event`

**Impact**: MEDIUM - Unpredictable error behavior

---

## 🔧 Refactoring Phases

### Phase 1: Documentation & Analysis ✅ DONE
**Tasks**:
- [x] Create ARCHITECTURE.md
- [x] Create this REFACTORING-PLAN.md
- [x] Analyze codebase issues
- [x] Identify anti-patterns

**Outcome**: Clear understanding of current state

---

### Phase 2: Quick Wins 🎯 NEXT
**Tasks**:
1. [x] Delete empty files:
   - `code-core/src/ai/agent-manager.ts`
   - `code-core/src/ai/rule-manager.ts`

2. [ ] Update index exports to remove deleted files

3. [ ] Add ESLint rule to warn on `any`:
   ```json
   {
     "@typescript-eslint/no-explicit-any": "warn"
   }
   ```

4. [ ] Document Session types in ARCHITECTURE.md:
   - File-based: Headless mode sessions (legacy)
   - Database: Main application sessions
   - Clarify when to use which

**Duration**: 1-2 hours
**Impact**: Immediate clarity improvement

---

### Phase 3: Streaming Service Refactoring 🔨 CORE
**Current**: `streaming.service.ts` (1450 lines, monolithic)

**Target**: Modular services with clear boundaries

#### 3.1: Extract Token Tracking
**New File**: `services/token-tracking.service.ts`

**Responsibilities**:
- Initialize token tracker
- Update tokens from delta
- Emit token update events
- Checkpoint recalculation

**Extracted Code**: Lines 760-837 from streaming.service.ts

**Benefits**:
- ✅ Testable in isolation
- ✅ Reusable across streaming contexts
- ✅ Clear performance optimization point

---

#### 3.2: Extract Step Lifecycle
**New File**: `services/step-lifecycle.service.ts`

**Responsibilities**:
- Create message steps
- Track step state
- Complete steps
- Emit step events

**Extracted Code**:
- `prepareStep` hook (lines 543-669)
- `onStepFinish` hook (lines 426-540)

**Benefits**:
- ✅ Single Responsibility (step management)
- ✅ Easier to understand step flow
- ✅ Centralized step logic

---

#### 3.3: Extract Stream Processing
**New File**: `services/stream-processor.service.ts`

**Responsibilities**:
- Process AI SDK stream chunks
- Handle chunk types (text, tool, file, etc.)
- Maintain active parts state
- Emit streaming events

**Extracted Code**: Lines 839-1190 (chunk processing loop)

**Benefits**:
- ✅ Isolated streaming logic
- ✅ Easier to add new chunk types
- ✅ Testable chunk handling

---

#### 3.4: Extract Message Persistence
**New File**: `services/message-persistence.service.ts`

**Responsibilities**:
- Create user/assistant messages
- Update message status
- Save message steps
- Handle message-related DB operations

**Extracted Code**:
- Message creation (lines 306-328, 390-402)
- Status updates (lines 1262-1283)
- System message creation (lines 1285-1321)

**Benefits**:
- ✅ Centralized persistence logic
- ✅ Transaction management
- ✅ Easier to optimize DB calls

---

#### 3.5: Orchestrator (Remaining)
**Refactored File**: `services/streaming-orchestrator.service.ts`

**Responsibilities**:
- Compose services
- Coordinate streaming flow
- Handle high-level errors
- Emit top-level events

**Remaining Code**: High-level flow coordination (~300 lines)

**Benefits**:
- ✅ Clear entry point
- ✅ Thin orchestration layer
- ✅ Easy to understand flow

---

**Phase 3 Timeline**:
- Step 1: Extract TokenTracking (2 hours)
- Step 2: Extract StepLifecycle (3 hours)
- Step 3: Extract StreamProcessor (4 hours)
- Step 4: Extract MessagePersistence (2 hours)
- Step 5: Refactor Orchestrator (2 hours)
- Step 6: Testing & Integration (4 hours)

**Total**: ~17 hours (2-3 days)

---

### Phase 4: Unified Cache Management 💾
**Goal**: Single cache management system

#### 4.1: Create CacheManager Service
**New File**: `code-core/src/cache/cache-manager.ts`

```typescript
interface CacheManager {
  // Registration
  registerCache<K, V>(name: string, cache: LRUCache<K, V>): void;

  // Stats
  getStats(): CacheStats[];
  getCacheStats(name: string): CacheStats | null;

  // Management
  clear(name: string): void;
  clearAll(): void;

  // Monitoring
  onEvict(name: string, callback: (key: K) => void): void;
}

interface CacheStats {
  name: string;
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
}
```

#### 4.2: Migrate Existing Caches
**Caches to Migrate**:
1. Base context cache (session-tokens.ts)
2. Message token cache (model-message-token-calculator.ts)
3. Tokenizer cache (token-counter.ts)
4. Provider capabilities cache (providers)

**Benefits**:
- ✅ Unified stats (/cache-stats command)
- ✅ Unified clearing (/clear-cache command)
- ✅ Performance monitoring
- ✅ Memory usage tracking

**Timeline**: 4-6 hours

---

### Phase 5: Type Safety Improvements 🔒
**Goal**: Remove all `any` types

#### 5.1: High-Impact Files First
**Priority Order** (by usage count):
1. `target-utils.ts` (10 usages)
2. `service.interface.ts` (6 usages)
3. `ai-config.ts` (5 usages)
4. `auto-migrate.ts` (4 usages)
5. `message-converter.ts` (4 usages)

#### 5.2: Strategy
**Approach**:
1. Identify actual type from usage
2. Create proper interface/type
3. Replace `any` with specific type
4. Add type guards where needed
5. Test thoroughly

**Timeline**: 1-2 hours per file, ~10 hours total

---

### Phase 6: Error Handling Standardization ⚠️
**Goal**: Consistent error handling across codebase

#### 6.1: Create Error Handler Service
**New File**: `code-core/src/utils/error-handler.ts`

```typescript
interface ErrorHandler {
  // Standard handling
  handle(error: unknown, context: ErrorContext): ErrorResult;

  // Specialized handlers
  handleDatabaseError(error: unknown): ErrorResult;
  handleNetworkError(error: unknown): ErrorResult;
  handleValidationError(error: unknown): ErrorResult;
}

type ErrorResult =
  | { type: 'throw', error: Error }
  | { type: 'return', value: null }
  | { type: 'emit', event: ErrorEvent }
  | { type: 'log', message: string };
```

#### 6.2: Apply Patterns
**Patterns to Use**:
- **Database errors**: Log + return null (graceful degradation)
- **Validation errors**: Throw (caller handles)
- **Network errors**: Emit event (UI notification)
- **Programming errors**: Throw (fail fast)

**Timeline**: 6-8 hours

---

### Phase 7: Session Architecture Clarification 📚
**Goal**: Clear separation between session types

#### 7.1: Documentation Update
**Add to ARCHITECTURE.md**:

```markdown
## Session Types

### Database Sessions (Primary)
**File**: `code-core/src/database/session-repository.ts`
**Use**: Main application sessions (TUI, Web GUI)
**Storage**: SQLite database
**Features**: Full history, multi-step, todos, file refs

### File Sessions (Legacy)
**File**: `code-core/src/utils/session-manager.ts`
**Use**: Headless mode only
**Storage**: JSON files (~/.sylphx/sessions/)
**Features**: Simple message history
**Status**: Deprecated, kept for backward compatibility
```

#### 7.2: Rename for Clarity
**Changes**:
- `utils/session-manager.ts` → `utils/legacy-session-manager.ts`
- Add deprecation notice
- Add migration guide

**Timeline**: 2 hours

---

### Phase 8: Router Refactoring 🛣️
**Goal**: Slim down large router files

**Files**:
- `session.router.ts` (705 lines)
- `config.router.ts` (704 lines)
- `message.router.ts` (693 lines)

**Strategy**:
- Extract business logic to services
- Routers only handle:
  - Input validation
  - Service invocation
  - Response formatting
- Target: <300 lines per router

**Timeline**: 8-10 hours

---

## 📈 Success Metrics

### Code Quality
- [ ] No files >500 lines (except schema.ts, types.ts)
- [ ] Zero `any` types (strict mode)
- [ ] 90%+ test coverage on core services
- [ ] <10 TODO comments (track in issues)

### Performance
- [ ] Token calculation: <100ms (p95)
- [ ] Event latency: <500ms (p95)
- [ ] Streaming: <50ms per delta

### Developer Experience
- [ ] Clear architecture documentation
- [ ] Consistent patterns across codebase
- [ ] Easy to find relevant code
- [ ] Fast feedback from tests

---

## 🗓️ Timeline

### Week 1: Foundation
- [x] Phase 1: Documentation (Day 1)
- [ ] Phase 2: Quick Wins (Day 2)
- [ ] Phase 3.1-3.2: Start Streaming Refactor (Days 3-5)

### Week 2: Core Refactoring
- [ ] Phase 3.3-3.5: Finish Streaming Refactor (Days 1-3)
- [ ] Phase 4: Cache Management (Days 4-5)

### Week 3: Polish
- [ ] Phase 5: Type Safety (Days 1-3)
- [ ] Phase 6: Error Handling (Days 4-5)

### Week 4: Cleanup
- [ ] Phase 7: Session Docs (Day 1)
- [ ] Phase 8: Router Refactor (Days 2-5)

**Total**: ~4 weeks part-time

---

## 🚨 Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation**:
- Comprehensive tests before refactor
- Incremental changes (commit after each extraction)
- Feature flags for experimental changes

### Risk 2: Performance Regression
**Mitigation**:
- Benchmark before/after each phase
- Performance tests in CI
- Rollback plan for each phase

### Risk 3: Scope Creep
**Mitigation**:
- Stick to defined phases
- Document "nice to have" separately
- Time-box each task

---

## 📚 References

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [REQUIREMENTS.md](REQUIREMENTS.md) - User requirements
- [Martin Fowler - Refactoring](https://refactoring.com/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## ✅ Completion Checklist

### Phase 1: Documentation ✅
- [x] Create ARCHITECTURE.md
- [x] Create REFACTORING-PLAN.md
- [x] Analyze current issues

### Phase 2: Quick Wins
- [ ] Delete empty files
- [ ] Update exports
- [ ] Add ESLint rules
- [ ] Document session types

### Phase 3: Streaming Refactor
- [ ] Extract TokenTracking
- [ ] Extract StepLifecycle
- [ ] Extract StreamProcessor
- [ ] Extract MessagePersistence
- [ ] Refactor Orchestrator
- [ ] Integration tests

### Phase 4: Cache Management
- [ ] Create CacheManager
- [ ] Migrate caches
- [ ] Add stats API
- [ ] Add clearing commands

### Phase 5: Type Safety
- [ ] Fix target-utils.ts
- [ ] Fix service.interface.ts
- [ ] Fix ai-config.ts
- [ ] Fix auto-migrate.ts
- [ ] Fix message-converter.ts

### Phase 6: Error Handling
- [ ] Create ErrorHandler
- [ ] Apply patterns
- [ ] Document standards

### Phase 7: Session Docs
- [ ] Update ARCHITECTURE.md
- [ ] Rename legacy files
- [ ] Add migration guide

### Phase 8: Router Refactor
- [ ] Extract session router logic
- [ ] Extract config router logic
- [ ] Extract message router logic
- [ ] Add service layer tests

---

## 🎯 Current Focus

**Now**: Phase 2 - Quick Wins
**Next**: Phase 3 - Streaming Service Refactoring

**Last Updated**: 2025-01-XX
