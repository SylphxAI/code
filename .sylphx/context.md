# Project Context

## What (Project Scope)

**Code** - AI-powered development assistant with real-time streaming
**Lens** - TypeScript-first API framework for frontend-driven reactive systems

Both projects are our own, designed together to solve fundamental architectural problems.

## Why (The Problem - 為什麼要寫 Lens)

### The Original tRPC Problem: Granularity Chaos

**現狀混亂：**
```typescript
// 粒度不一致 - 非常混亂！
'session-update'              // Model-level
'session-status-updated'      // Field-level
'session-title-start'         // Event-level (細)
'session-title-delta'         // Event-level (細)
'session-title-end'           // Event-level (細)
'session-usage-updates'       // Field-level
```

**問題：**
1. **粒度不一致** - 有時 model-level，有時 field-level，有時 event-level
2. **無法做 optimistic updates** - Frontend 不知道怎麼樂觀更新
3. **傳輸量無法優化** - 沒有統一的優化策略
4. **類型推導困難** - tRPC 在 streaming 場景下類型推導不夠好

### Lens 的初衷：從根本解決

**一次性解決所有問題：**

1. ✅ **Frontend-Driven** - Frontend 控制要什麼數據
2. ✅ **Optimistic Updates** - 統一的樂觀更新機制
3. ✅ **粒度一致** - 統一到 model-level events
4. ✅ **傳輸量最小化** - Field selection + AutoStrategy
5. ✅ **TypeScript-First** - 完整的類型推導（保留 tRPC 優點）

**核心原則：**
- 永遠不要 workaround
- 從根本性解決問題
- 所有設計做到最好
- 所有東西文檔化，有序推進

## Current State (當前進度)

### ✅ Phase 1-3: Model-Level Events (Complete)

**Achievement:** 統一粒度到 model-level

```typescript
// BEFORE: 混亂的粒度 ❌
session-status-updated     // Field-level
session-tokens-updated     // Field-level
session-title-delta        // Field-level + incremental
message-status-updated     // Field-level

// AFTER: 統一的粒度 ✅
session-updated            // Model-level (partial model)
message-updated            // Model-level (partial model)
```

**Status:** ✅ Events 統一，但實際代碼可能還有舊事件殘留

### ✅ Phase 4: Lens Subscriptions (Complete)

**Achievement:** 用 Lens 取代 tRPC event stream

```typescript
// Infrastructure ready
useLensSessionSubscription({
  onSessionUpdated: (session) => {
    // Receives model-level events
  }
});
```

**Status:** ✅ Infrastructure complete，但還在與 useEventStream 並存

### ✅ Phase 5: Field Selection (Complete)

**Achievement:** Frontend 控制要哪些 fields

```typescript
useLensSessionSubscription({
  select: {
    id: true,
    title: true,
    status: true,
    // messages: false  ← 不要 messages
  }
});
```

**Status:** ✅ Infrastructure ready，但還沒在 production 啟用

### ✅ Phase 6: Auto-Optimization (Complete)

**Achievement:** Backend 自動優化傳輸（updateMode 已移除）

```typescript
// Select is All You Need
useLensSessionSubscription({
  select: { title: true, status: true },
  // Backend auto:
  // - title (string) → delta (57% savings)
  // - status (object) → patch (99% savings)
});
```

**Status:** ✅ Architecture perfect achieved

### ⏳ Optimistic Updates (NOT STARTED!)

**THIS IS CRITICAL - Lens 的核心目標之一！**

**Problem:** 還沒實施 optimistic updates 機制

**Need:**
- Frontend 樂觀更新 UI
- Backend 確認/回滾
- 統一的 optimistic update API

**Status:** ❌ Not implemented yet

### ⏳ Complete Migration (IN PROGRESS)

**Problem:** 舊的 tRPC events 還在使用

**Need:**
- 完全移除舊的細粒度事件
- 全部遷移到 Lens subscriptions
- 清理 deprecated code

**Status:** ⏳ Partial - Infrastructure ready, migration ongoing

## Boundaries

**In Scope:**
- Lens framework development
- Code application (uses Lens)
- Fine-grained reactive architecture
- Optimistic updates
- TypeScript-first type inference

**Out of Scope:**
- Generic API framework (專注解決 Code 的問題)
- Public release (internal tool)
- Backwards compatibility with tRPC

## Key Constraints

**Technical:**
- Must preserve tRPC-level type inference
- Must work in Bun runtime
- Must support real-time streaming

**Business:**
- Both projects are ours (Lens + Code)
- No workarounds - architectural perfection only
- Everything documented

## SSOT References

- Dependencies: `code/package.json`, `lens/package.json`
- Architecture: `FINE_GRAINED_ROADMAP.md`
- Decisions: `.sylphx/decisions/`
