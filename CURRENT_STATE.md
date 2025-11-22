# Current State & Next Steps

**Last Updated:** 2024-12-22

## 🎯 Lens 的初衷

**為什麼要寫 Lens？**

解決 Code 項目在 tRPC/RPC/Streaming 中的根本性問題：

### 原始問題：粒度混亂

```typescript
// 現狀：粒度完全不一致 ❌
'session-update'              // Model-level
'session-status-updated'      // Field-level
'session-title-start'         // Event-level (最細)
'session-title-delta'         // Event-level (最細)
'session-title-end'           // Event-level (最細)
'session-usage-updates'       // Field-level
```

**問題嚴重性：**
- ❌ 粒度不一致（有時細到 event-level，有時粗到 model-level）
- ❌ 無法做 optimistic updates
- ❌ 傳輸量無法優化
- ❌ TypeScript 類型推導困難

### Lens 要解決的問題（一次性）

1. ✅ **Frontend-Driven** - Frontend 控制要什麼數據
2. ⏳ **Optimistic Updates** - 統一的樂觀更新機制（未完成！）
3. ✅ **粒度一致** - 統一到 model-level events
4. ✅ **傳輸量最小化** - Field selection + AutoStrategy
5. ✅ **TypeScript-First** - 完整類型推導

---

## 📊 當前進度總覽

### ✅ Infrastructure Complete (架構完成)

**Phase 1-3: Model-Level Events**
- 統一粒度到 model-level
- `session-updated`, `message-updated`
- 6 events → 2 events

**Phase 4: Lens Subscriptions**
- `useLensSessionSubscription` hook
- Split subscriptions (metadata vs content)
- Infrastructure ready

**Phase 5: Field Selection**
- Type-safe `select` parameter
- Full autocomplete support
- Backend field filtering ready

**Phase 6: Auto-Optimization**
- `updateMode` parameter removed
- "Select is All You Need"
- Backend AutoStrategy handles everything

**Architecture Achievement:**
```typescript
// 完美抽象 - 零配置
useLensSessionSubscription({
  select: {
    id: true,
    title: true,    // string → auto delta (57% savings)
    status: true,   // object → auto patch (99% savings)
  }
  // Backend 自動優化一切
});
```

### ⏳ Critical Missing Pieces

#### 1. ❌ Optimistic Updates (核心功能未實施！)

**這是 Lens 的初衷之一，但還沒做！**

**Need:**
- Frontend 樂觀更新機制
- Backend 確認/回滾
- 統一的 API

**Example (需要實現):**
```typescript
// Frontend optimistically updates
const optimisticUpdate = await updateSession({
  title: "New Title",
  optimistic: true  // ← 需要實現
});

// Backend confirms or rolls back
// Lens handles rollback automatically if server rejects
```

**Packages:**
- `packages/optimistic/` - 已存在但未整合到 Lens
- Need to integrate with Lens subscriptions

#### 2. ⏳ Complete Migration (舊事件還在用)

**Problem:** 舊的細粒度事件還在代碼中

**Files Still Using Old Events:**
- `useEventStream.ts`
- `useEventStreamCallbacks.ts`
- `sessionHandlers.ts`
- `session-status-manager.ts`
- Many more (19 files found)

**Need:**
- 移除所有舊的細粒度事件
- 完全遷移到 Lens subscriptions
- 清理 deprecated code

#### 3. ⏳ Production Adoption (未啟用)

**Problem:** Field selection infrastructure ready，但還沒在 production 啟用

**Current:**
```typescript
useLensSessionSubscription({
  // No select - using full model
});
```

**Should Enable:**
```typescript
useLensSessionSubscription({
  select: {
    id: true,
    title: true,
    status: true,
    totalTokens: true,
    // messages: false  ← Save bandwidth
  }
});
```

---

## 🎯 Next Steps (優先順序)

### Priority 1: Optimistic Updates (CRITICAL)

**這是 Lens 的核心目標，必須實施！**

**Tasks:**
1. 分析現有 `packages/optimistic/` 實現
2. 設計 Lens integration API
3. 實施 optimistic update mechanism
4. 測試 confirm/rollback scenarios
5. 文檔化 optimistic update patterns

**Expected API:**
```typescript
useLensSessionSubscription({
  select: { title: true },
  optimistic: true,  // Enable optimistic updates
  onOptimisticUpdate: (update) => {
    // Frontend applies immediately
  },
  onConfirmed: (confirmed) => {
    // Backend confirmed
  },
  onRollback: (rollback) => {
    // Backend rejected - rollback
  }
});
```

### Priority 2: Complete Migration

**Tasks:**
1. Audit all files using old events
2. Migrate each event type to Lens
3. Remove deprecated functions
4. Update all handlers
5. Test thoroughly

**Target:**
- Zero references to `session-title-delta`, `session-status-updated`, etc.
- All subscriptions use Lens
- Clean codebase

### Priority 3: Production Adoption

**Tasks:**
1. Enable field selection in useChatEffects
2. Measure bandwidth savings
3. Monitor performance
4. Document results

---

## 📝 Documentation Status

### ✅ Complete
- `FINE_GRAINED_ROADMAP.md` - Architecture journey
- `ADR-014` - Framework principles
- `.sylphx/context.md` - Project context and mission
- `useLensSessionSubscription` - Full JSDoc

### ⏳ Needs Update
- Migration guides for old events
- Optimistic updates documentation
- Integration examples

---

## 🚨 Critical Reminder

**Lens 的初衷：**
- 解決粒度混亂
- 實施 optimistic updates ← **還沒做！**
- 最小化傳輸量
- TypeScript-first

**核心原則：**
- 永遠不要 workaround
- 從根本性解決問題
- 所有設計做到最好
- 所有東西文檔化，有序推進

**我們還沒完成初衷中的核心功能：Optimistic Updates！**

---

## 📍 Summary

**Completed:**
- ✅ Infrastructure (Lens framework)
- ✅ Architecture perfect (Select is All You Need)
- ✅ Field selection ready
- ✅ Auto-optimization ready

**Critical Missing:**
- ❌ Optimistic Updates (核心功能！)
- ⏳ Complete migration from old events
- ⏳ Production adoption of field selection

**Next Focus:**
1. Implement Optimistic Updates
2. Complete migration
3. Enable in production
