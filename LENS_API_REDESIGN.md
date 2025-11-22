# Lens API Redesign - Frontend-Driven Architecture

## 問題分析

### 原本 tRPC 的問題
1. **粒度不一致** - 同一個 session update，有時傳 model 粒度，有時傳 field 粒度 (title start/delta/end)
2. **傳輸量大** - 每次都傳完整數據，無法做增量更新
3. **Optimistic updates 難做** - 無統一 pattern
4. **Backend-driven** - Frontend 無法控制拿什麼數據

### Lens 的核心能力
1. **Field Selection** - Frontend 控制粒度
   ```ts
   // Frontend 決定要什麼
   client.session.getById.query({ id }, { select: ['id', 'title', 'updatedAt'] })
   ```

2. **Update Strategies** - 最小化傳輸
   - `value`: 完整值 (default)
   - `delta`: 文字差異 (LLM streaming)
   - `patch`: JSON Patch (object updates)
   - `auto`: 智能選擇

3. **Subscribe on Query** - Reactive updates
   ```ts
   client.session.getById.subscribe({ id }, {
     select: ['title', 'updatedAt'],
     updateMode: 'patch'  // 只傳 JSON Patch
   })
   ```

## 設計原則

### 1. Frontend-Driven Data Fetching
Frontend 控制：
- 拿什麼 fields (Field Selection)
- 用什麼粒度更新 (Update Mode)
- 何時訂閱 real-time updates (subscribe)

### 2. 統一粒度 - Model Level
所有 updates 都在 **model level**：
- ❌ session.title.start / session.title.delta / session.title.end
- ✅ session (with update strategy: delta/patch)

### 3. Optimistic Updates Pattern
```ts
// 1. Optimistic update (instant UI)
cache.update('session', id, { title: newTitle })

// 2. Mutation
await client.session.updateTitle.mutate({ id, title: newTitle })

// 3. Subscription auto-syncs (via patch)
// No manual reconciliation needed!
```

## API 重新設計

### Session API - 正確設計

```typescript
export const sessionAPI = lens.object({
  /**
   * Get session by ID
   * FRONTEND-DRIVEN:
   * - Client 控制 select fields
   * - 可以 subscribe 做 real-time sync
   */
  getById: lens.query({
    input: z.object({ sessionId: z.string() }),
    output: SessionSchema,

    // Query: One-time fetch
    resolve: async ({ sessionId }, ctx) => {
      return await ctx.sessionRepository.getSessionById(sessionId);
    },

    // Subscribe: Real-time updates (IMPORTANT!)
    subscribe: ({ sessionId }, ctx): Observable<Session> => {
      // 訂閱 session 的 real-time updates
      return ctx.eventStream
        .subscribe(`session:${sessionId}`)
        .pipe(
          startWith(await ctx.sessionRepository.getSessionById(sessionId)),
          map(event => {
            if (event.type === 'session-updated') {
              return event.payload.session;
            }
            // ... handle other event types
          })
        );
    },
  }),

  /**
   * Update session title
   * REACTIVE: Publishes to session:{id} channel
   * Frontend will receive via subscription (using patch strategy)
   */
  updateTitle: lens.mutation({
    input: z.object({
      sessionId: z.string(),
      title: z.string(),
    }),
    output: SessionSchema,  // Return updated session

    resolve: async ({ sessionId, title }, ctx) => {
      // 1. Update database
      await ctx.sessionRepository.updateSessionTitle(sessionId, title);

      // 2. Get updated session
      const session = await ctx.sessionRepository.getSessionById(sessionId);

      // 3. Publish event (subscriptions will auto-update)
      await ctx.eventStream.publish(`session:${sessionId}`, {
        type: 'session-updated',
        payload: { session },
      });

      return session;
    },
  }),
});
```

### Frontend Usage - Optimistic Updates

```typescript
// Setup: Subscribe to session (with patch strategy)
const { data, isLoading } = client.session.getById.useSubscription(
  { sessionId: 'abc' },
  {
    select: ['id', 'title', 'updatedAt'],
    updateMode: 'patch'  // 只傳 JSON Patch，最小化傳輸
  }
);

// Optimistic update pattern
const updateTitle = async (newTitle: string) => {
  // 1. Optimistic UI update (instant)
  cache.optimisticUpdate('session', 'abc', { title: newTitle });

  // 2. Server mutation
  await client.session.updateTitle.mutate({
    sessionId: 'abc',
    title: newTitle
  });

  // 3. Subscription auto-syncs from server (via patch)
  // - If mutation succeeds: patch = [] (no changes, already optimistic)
  // - If mutation modifies: patch = [changes] (e.g., server sanitized title)
  // - If mutation fails: revert via subscription
};
```

## Message Streaming - 正確設計

```typescript
export const messageAPI = lens.object({
  /**
   * Stream AI response
   * Uses DELTA strategy for minimal transfer
   */
  streamResponse: lens.query({
    input: z.object({
      sessionId: z.string(),
      userMessageContent: z.string().nullable(),
    }),
    output: z.object({
      content: z.string(),
      role: z.enum(['user', 'assistant']),
      status: z.enum(['streaming', 'complete']),
    }),

    resolve: async ({ sessionId, userMessageContent }, ctx) => {
      throw new Error("Use subscribe() for streaming");
    },

    subscribe: ({ sessionId, userMessageContent }, ctx): Observable<Message> => {
      return streamAIResponse({
        appContext: ctx.appContext,
        sessionRepository: ctx.sessionRepository,
        messageRepository: ctx.messageRepository,
        aiConfig: ctx.aiConfig,
        sessionId,
        userMessageContent,
      });
    },
  }),
});

// Frontend auto uses delta strategy
const { data } = client.message.streamResponse.useSubscription(
  { sessionId, userMessageContent },
  { updateMode: 'delta' }  // Auto applies text deltas
);
```

## 關鍵改進

### 1. 統一粒度 (Model Level)
所有 updates 都在 model level：
- Session updates → `session:${id}` channel
- Message updates → `message:${id}` channel
- 使用 Update Strategy 控制傳輸粒度

### 2. Frontend-Driven
```ts
// Frontend 控制一切
client.session.getById.useSubscription(
  { id },
  {
    select: ['id', 'title'],      // 只要這些 fields
    updateMode: 'patch'            // 用 JSON Patch 更新
  }
)
```

### 3. Optimistic Updates Pattern
統一 pattern：
```ts
1. cache.optimisticUpdate()      // Instant UI
2. client.mutation.mutate()      // Server update
3. subscription auto-syncs       // Auto reconciliation
```

### 4. 最小化傳輸
- Field Selection → 只傳需要的 fields
- Update Strategy → 只傳 delta/patch
- Subscription → 只在變化時推送

## 遷移計劃

### Phase 1: 修正 Session API ✅ (需要重做)
- [ ] 在所有 queries 加上 `subscribe`
- [ ] 確保 mutations 返回完整 model
- [ ] 修正 event publishing (publish full model)

### Phase 2: 修正 Message API
- [ ] streamResponse 用 delta strategy
- [ ] 加上 message CRUD 的 subscriptions

### Phase 3: Frontend Integration
- [ ] lens-client 支持 field selection
- [ ] lens-client 支持 update strategies
- [ ] lens-react hooks with optimistic updates

### Phase 4: 移除 tRPC 遺留問題
- [ ] 移除所有細粒度 events (title.start/delta/end)
- [ ] 統一用 model-level events
- [ ] 測試 optimistic updates

## 總結

**核心改變：**
1. ❌ Backend-driven, 細粒度不一致
2. ✅ Frontend-driven, 統一 model-level 粒度

**實現方式：**
1. Query + Subscribe → Real-time sync
2. Field Selection → Frontend 控制粒度
3. Update Strategy → 最小化傳輸
4. Optimistic Updates → 統一 pattern

這才是 Lens 的真正價值！
