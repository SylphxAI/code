# Fine-Grained Frontend-Driven Architecture - Roadmap

## Vision: 最終目標

**Frontend 控制到最細粒度 (Fine-Grained Control)**

```typescript
// 最終理想狀態
lensClient.session.getById.subscribe(
  { sessionId: 'abc' },
  {
    // 1. FIELD-LEVEL: Frontend 控制要邊啲 fields
    select: {
      id: true,
      title: true,
      status: {          // Nested selection
        text: true,
        duration: true,
        // tokenUsage: false  ← 唔要呢個 field
      },
      // messages: false  ← 唔要成個 messages array
    },

    // 2. STRATEGY-LEVEL: Frontend 控制點樣傳輸每個 field
    updateMode: 'auto',  // 自動選擇最優策略
    // OR per-field strategies:
    fieldStrategies: {
      title: 'delta',    // Title 用 delta (incremental text)
      status: 'patch',   // Status 用 patch (JSON Patch operations)
      todos: 'value',    // Todos 用 value (full array)
    },

    // 3. FREQUENCY-LEVEL: Frontend 控制幾密更新
    throttle: 1000,      // 最多 1 秒 1 次更新
    debounce: 100,       // 100ms 內既更新 batch 埋
  }
);
```

**Benefits:**
- ✅ **No Over-Fetching** - 只傳 frontend 要既 fields
- ✅ **Optimal Transmission** - 每個 field 用最優策略
- ✅ **Bandwidth Control** - Frontend 控制傳輸量 (57%-99% savings)
- ✅ **Type-Safe** - Full TypeScript inference + autocomplete
- ✅ **GraphQL-like Flexibility** - 但無需 codegen

---

## Current State: 已完成既基礎

### ✅ Phase 1-3: Model-Level Events (Completed)

**Problem Solved:** 粒度不一致

```typescript
// BEFORE: 混亂既粒度 ❌
session-status-updated     // Field-level
session-tokens-updated     // Field-level
session-title-delta        // Field-level + incremental
message-status-updated     // Field-level

// AFTER: 統一既粒度 ✅
session-updated            // Model-level (partial model)
message-updated            // Model-level (partial model)
```

**Achievement:**
- ✅ Server 永遠 emit model-level events
- ✅ Partial models (只傳 changed fields)
- ✅ Consistent granularity (6 events → 2 events)
- ✅ Foundation for fine-grained control

**Current Limitation:**
- ❌ Backend 控制粒度 (backend decides what fields to send)
- ❌ Frontend 無得揀 (frontend receives whatever backend sends)
- ❌ Over-fetching (receives all fields even if only need 1)

---

## Roadmap: 一步步達到 Fine-Grained

### Phase 4: Lens Subscriptions (Completed ✅)

**Goal:** 用 Lens subscriptions 取代 tRPC event stream

**Step 4a:** Basic Subscription Integration - ✅ COMPLETE
```typescript
// ✅ Created and integrated: useLensSessionSubscription hook
useLensSessionSubscription({
  onSessionUpdated: (session) => {
    // Receives full session model
    // No field selection yet (Phase 5)
  }
});
```

**Status:** ✅ Integrated into useChatEffects.ts

**Completed Actions:**
1. ✅ Created useLensSessionSubscription hook
2. ✅ Integrated into Chat component (via useChatEffects.ts)
3. ✅ Split subscriptions for fine-grained control:
   - Session metadata → Lens subscription (prepares for field selection)
   - Content streaming → Event stream (inherently incremental)
4. ✅ Migrated code-web to use lensClient
5. ✅ Documented architecture decision in code comments

**Architecture Decision:**
Split subscription pattern instead of full replacement:
- **Session metadata** → useLensSessionSubscription (enables Phase 5 field selection)
- **Content streaming** → useEventStream (text-delta, tool-call, etc. are inherently incremental)

This separation is intentional and prepares for fine-grained control in Phase 5 and 6.

**Next Steps:**
- ⏳ Test session updates in real usage
- ⏳ Monitor for any regressions
- ⏳ Move to Phase 5 when ready

**Current Limitation:** Still receives full session models (over-fetching), but foundation is ready for Phase 5 field selection

---

### Phase 5: Field Selection (Planned)

**Goal:** Frontend 控制要邊啲 fields (GraphQL-like)

#### Step 5a: Transport Layer Support

**Modify:** `InProcessTransport.subscribe()`

```typescript
// BEFORE: No field selection
subscribe(request: LensRequest): Observable<T> {
  const result = this.executeRequest(request);
  return of(result);
}

// AFTER: Apply field selection
subscribe(request: LensRequest, options?: { select?: any }): Observable<T> {
  const result = this.executeRequest(request);
  const selected = this.applyFieldSelection(result, options?.select);
  return of(selected);
}
```

**Files to modify:**
- `packages/lens-core/src/transport/in-process.ts`
- `packages/lens-core/src/transport/interface.ts`

#### Step 5b: API Subscribe Signature

**Modify:** API subscribe functions to accept select parameter

```typescript
// BEFORE: No select parameter
subscribe: ({ input, ctx }): Observable<Session> => {
  return ctx.eventStream
    .subscribe(`session:${sessionId}`)
    .pipe(
      map(event => event.payload.session)
    );
}

// AFTER: Apply field selection
subscribe: ({ input, ctx, select }): Observable<Partial<Session>> => {
  return ctx.eventStream
    .subscribe(`session:${sessionId}`)
    .pipe(
      map(event => {
        const session = event.payload.session;
        return select ? applyFieldSelection(session, select) : session;
      })
    );
}
```

**Files to modify:**
- `packages/code-api/src/api.ts` (session.getById.subscribe)
- Other subscribe functions

#### Step 5c: Lens Client Integration

**Modify:** Lens client to pass select to transport

```typescript
// Lens client subscribe method should accept options
lensClient.session.getById.subscribe(
  { sessionId },
  {
    select: { id: true, title: true, status: true }  // ← Pass to transport
  }
);
```

**Files to modify:**
- `packages/lens-client/src/index.ts` (client implementation)

#### Step 5d: Hook Integration

**Update:** useLensSessionSubscription to use field selection

```typescript
useLensSessionSubscription({
  select: {
    id: true,
    title: true,
    status: true,
    totalTokens: true,
    // messages: false  ← 唔要 messages (save bandwidth)
  }
});
```

**Benefits:**
- ✅ Frontend controls exact fields
- ✅ No over-fetching
- ✅ Type-safe field selection (autocomplete)
- ✅ GraphQL-like flexibility without codegen

---

### Phase 6: Update Strategies (Planned)

**Goal:** Frontend 控制點樣傳輸 (Transmission optimization)

#### Step 6a: Strategy Selection

```typescript
useLensSessionSubscription({
  select: { id: true, title: true, status: true },
  updateMode: 'auto',  // Intelligent strategy selection
  // OR
  updateMode: 'delta', // All fields use delta
  // OR
  updateMode: 'patch', // All fields use JSON Patch
});
```

**Implementation:**
- Already exists in Lens core (ValueStrategy, DeltaStrategy, PatchStrategy, AutoStrategy)
- Need to wire up to subscription pipeline

#### Step 6b: Per-Field Strategies (Advanced)

```typescript
useLensSessionSubscription({
  select: { id: true, title: true, status: true, todos: true },
  fieldStrategies: {
    title: 'delta',    // Incremental text (57% savings)
    status: 'patch',   // JSON Patch (99% savings)
    todos: 'value',    // Full array (safest for arrays)
  }
});
```

**Benefits:**
- ✅ Optimal transmission for each field type
- ✅ 57%-99% bandwidth savings
- ✅ Frontend controls optimization strategy
- ✅ Unique to Lens (not in GraphQL/tRPC)

---

### Phase 7: Frequency Control (Future)

**Goal:** Frontend 控制更新頻率

```typescript
useLensSessionSubscription({
  select: { status: true },
  throttle: 1000,      // 最多 1 秒 1 次
  debounce: 100,       // 100ms batch
});
```

**Use Cases:**
- Status updates: 1 second throttle (smooth progress bar)
- Title streaming: No throttle (real-time typing)
- Token updates: 500ms debounce (batch rapid updates)

---

## Principles: Fine-Grained 既核心原則

### 1. **Frontend-Driven** (前端驅動)
```
❌ Backend decides what to send
✅ Frontend decides what to receive
```

### 2. **Field-Level Selection** (Field 級別選擇)
```
❌ All or nothing (full model or no model)
✅ Pick exact fields (id, title, status only)
```

### 3. **Optimal Transmission** (最優傳輸)
```
❌ Always full value (wasteful)
✅ Delta/Patch/Value per field (57%-99% savings)
```

### 4. **Type-Safe** (類型安全)
```
❌ String-based queries (GraphQL)
✅ TypeScript inference (autocomplete)
```

### 5. **Progressive Enhancement** (漸進增強)
```
❌ Big bang migration (risky)
✅ Step-by-step refinement (safe)
```

---

## Documentation Strategy: 點樣文檔化

### 1. **Architectural Decisions** (ADRs)
- **Location:** `.sylphx/decisions/`
- **When:** Major design changes (field selection, update strategies)
- **Format:** Problem → Decision → Rationale → Consequences

### 2. **Progress Tracking** (This file)
- **Location:** `FINE_GRAINED_ROADMAP.md`
- **When:** After each phase completion
- **Content:** Current state, next steps, blockers

### 3. **Migration Guides**
- **Location:** `*_MIGRATION_COMPLETE.md`
- **When:** After each major migration
- **Content:** Before/After, Benefits, Validation

### 4. **Code Comments**
- **Where:** Implementation files
- **What:** Why this approach, trade-offs, future TODOs

---

## Success Criteria: 點樣知道做完

### Phase 4: Lens Subscriptions ✅ COMPLETE
- [x] Hook created
- [x] Integrated into Chat.tsx (via useChatEffects.ts)
- [x] Architecture documented (split subscription pattern)
- [x] Code-web migrated to lensClient
- [ ] Tests passing (pending real-world testing)
- [ ] Old useEventStream kept for content streaming (intentional)

### Phase 5: Field Selection ⏳
- [ ] Transport layer supports select parameter
- [ ] API subscribe functions accept select
- [ ] Lens client passes select to transport
- [ ] Type-safe autocomplete works
- [ ] Bandwidth savings measurable

### Phase 6: Update Strategies ⏳
- [ ] Auto strategy selection works
- [ ] Per-field strategies configurable
- [ ] Delta/Patch/Value all tested
- [ ] Bandwidth savings documented (57%-99%)

### Phase 7: Frequency Control ⏳
- [ ] Throttle/debounce implemented
- [ ] Configurable per subscription
- [ ] Performance improvement measurable

---

## Risks and Mitigations: 風險同對策

### Risk 1: Too Many Changes at Once
**Mitigation:** One phase at a time, test thoroughly before next phase

### Risk 2: Breaking Changes
**Mitigation:** Backward compatibility, feature flags, gradual rollout

### Risk 3: Performance Regression
**Mitigation:** Benchmarks before/after, rollback plan

### Risk 4: Complexity Creep
**Mitigation:** Keep phases focused, document trade-offs, YAGNI principle

---

## Current Focus: Phase 4 → Phase 5 Transition

**Phase 4a Completed ✅:**
1. ✅ Created useLensSessionSubscription hook
2. ✅ Integrated into Chat.tsx (via useChatEffects.ts)
3. ✅ Split subscription pattern documented
4. ✅ Code-web migrated to lensClient
5. ⏳ Test session updates in real usage

**Next: Phase 5 Preparation**
- Monitor Phase 4 in production
- Create ADR for Phase 5 (Field Selection)
- Design field selection API
- Plan transport layer modifications
- Research GraphQL-style field selection patterns

---

## Remember: 記住核心目標

> **Fine-Grained Frontend-Driven Architecture**
>
> Frontend 控制：
> - ✅ Which resource to subscribe (session, message, etc.)
> - ⏳ Which fields to receive (id, title, status only)
> - ⏳ How to transmit each field (delta, patch, value)
> - ⏳ How often to update (throttle, debounce)
>
> 所有野都係 fine-grained，Frontend 完全控制。

---

## Commit Message Template

```
feat(phase-N): [What] - [Why]

## Goal
[Phase goal and step]

## Changes
- [Change 1]
- [Change 2]

## Progress
- Phase N Step X: [Status]
- Next: [Next step]

## Fine-Grained Progress
- Frontend control: [What aspect achieved]
- Remaining: [What still needs fine-grained control]

BREAKING: [Yes/No and why]
```

---

**Last Updated:** 2024-12-22
**Current Phase:** Phase 4 Complete ✅
**Next Milestone:** Phase 5 - Field Selection
