# Architecture Analysis - Lens Framework & Code Project

## 核心理念

**兩個獨立 projects，清晰職責分離：**

1. **@sylphx/lens** - Communication library (framework-level)
   - TypeScript-first type inference
   - Frontend-driven data fetching
   - Optimistic updates infrastructure
   - Transport-agnostic (HTTP, SSE, WebSocket, InProcess)
   - Update strategies (Delta, Patch, Auto)

2. **@sylphx/code** - AI coding assistant application (app-level)
   - Business logic (sessions, messages, bash, config)
   - Domain models (Session, Message, Todo)
   - Repositories (data access)
   - Services (streaming, bash management)

## 職責分離 (Separation of Concerns)

### Lens Framework 職責

**核心功能 (Infrastructure):**
```
lens-core/
  ✅ Schema builder (lens.query, lens.mutation, lens.object)
  ✅ Type inference (InferInput, InferOutput, Selected)
  ✅ Field selection types (FieldSelection, Selected<T, S>)
  ✅ Update strategies (Delta, Patch, Value, Auto)
  ✅ Transport interface (LensTransport)
  ✅ InProcessTransport (zero-overhead function calls)

lens-server/
  ✅ HTTP handler (POST /lens)
  ✅ SSE handler (GET /lens/subscribe)
  ✅ WebSocket handler
  ✅ Auto-subscription system
  ✅ Request execution (validate, resolve, publish)
  ⚠️  Context injection (currently any, should be generic)

lens-client/
  ❌ Type-safe client (NOT YET IMPLEMENTED)
  ❌ Field selection support (NOT YET IMPLEMENTED)
  ❌ Update mode configuration (NOT YET IMPLEMENTED)
  ❌ Optimistic updates cache (NOT YET IMPLEMENTED)

lens-react/
  ❌ useQuery hook (NOT YET IMPLEMENTED)
  ❌ useMutation hook (NOT YET IMPLEMENTED)
  ❌ useSubscription hook (NOT YET IMPLEMENTED)
  ❌ Optimistic updates integration (NOT YET IMPLEMENTED)
```

**Lens 不應該知道：**
- ❌ Session, Message, Todo 是什麼
- ❌ sessionRepository, aiConfig 是什麼
- ❌ 業務邏輯 (compact session, stream AI response)
- ❌ Domain-specific validation rules

**Lens 只提供：**
- ✅ 定義 API 的方式 (`lens.query`, `lens.mutation`)
- ✅ Type-safe client 生成 (從 API definition)
- ✅ Transport layer (HTTP, SSE, WebSocket, InProcess)
- ✅ Update strategies (如何最小化傳輸)
- ✅ Field selection (frontend 控制拿什麼)
- ✅ Optimistic updates infrastructure

### Code Project 職責

**業務邏輯 (Application):**
```
code-core/
  ✅ Domain models (Session, Message, Todo, AIConfig)
  ✅ Repositories (SessionRepository, MessageRepository)
  ✅ AI providers (Anthropic, OpenAI, Google, etc.)
  ✅ Config management (loadAIConfig, saveAIConfig)
  ✅ Token counting
  ✅ File scanning

code-server/
  ✅ AppContext (sessionRepository, messageRepository, aiConfig, eventStream)
  ✅ Services (streaming.service, bash-manager-v2, event-persistence)
  ✅ LensServer integration (createLensServer with AppContext)
  ⚠️  tRPC routers (LEGACY - should be removed)

code-api/
  ⚠️  API definitions (NEEDS REDESIGN)
  ❌ 沒有用 subscribe on queries
  ❌ 沒有用 update strategies
  ❌ 沒有 model-level events
  ❌ Mutations 沒有返回完整 model

code-client/ (TUI)
  ⚠️  Uses tRPC client (LEGACY)
  ❌ 沒有 optimistic updates
  ❌ 沒有 field selection
  ❌ 沒有 real-time sync via subscriptions

code-web/ (Web GUI)
  ⚠️  Uses tRPC client (LEGACY)
  ❌ 同樣問題
```

**Code 不應該做：**
- ❌ 實現 transport layer (用 Lens 的)
- ❌ 實現 update strategies (用 Lens 的)
- ❌ 實現 type inference (用 Lens 的)

**Code 只需要：**
- ✅ 定義 API (用 `lens.query`, `lens.mutation`)
- ✅ 實現 resolvers (業務邏輯)
- ✅ 提供 context (repositories, services)
- ✅ 使用 lens-client (type-safe, optimistic updates)

## 當前問題診斷

### 問題 1: Lens Framework 不完整

**lens-client 完全沒實現！**

```typescript
// ❌ 現狀：不存在
import { createLensClient } from '@sylphx/lens-client';

// ✅ 應該：Type-safe client with optimistic updates
const client = createLensClient<typeof api>(transport, {
  cache: createLensCache(),
  optimistic: true
});

// Frontend usage
const { data, isLoading, error } = client.session.getById.useSubscription(
  { sessionId: 'abc' },
  {
    select: ['id', 'title', 'updatedAt'],  // Field selection
    updateMode: 'patch'                     // Update strategy
  }
);
```

**lens-react 完全沒實現！**

```typescript
// ❌ 現狀：不存在
import { useQuery, useMutation, useSubscription } from '@sylphx/lens-react';

// ✅ 應該：React hooks with optimistic updates
const updateTitle = useMutation(client.session.updateTitle, {
  optimistic: (vars) => ({
    session: { id: vars.sessionId, title: vars.title }
  }),
  onSuccess: () => {
    // Auto-reconciliation via subscription
  }
});
```

### 問題 2: Code API 定義錯誤

**沒有用 Lens 的核心功能：**

```typescript
// ❌ 現狀：只有 resolve，沒有 subscribe
getById: lens.query({
  input: z.object({ sessionId: z.string() }),
  output: SessionSchema,
  resolve: async ({ sessionId }, ctx) => {
    return await ctx.sessionRepository.getSessionById(sessionId);
  },
  // ❌ 沒有 subscribe！
})

// ✅ 應該：Query + Subscribe
getById: lens.query({
  input: z.object({ sessionId: z.string() }),
  output: SessionSchema,

  resolve: async ({ sessionId }, ctx) => {
    return await ctx.sessionRepository.getSessionById(sessionId);
  },

  // ✅ Subscribe for real-time updates
  subscribe: ({ sessionId }, ctx) => {
    return ctx.eventStream
      .subscribe(`session:${sessionId}`)
      .pipe(
        switchMap(() => ctx.sessionRepository.getSessionById(sessionId))
      );
  }
})
```

**Mutations 沒有返回完整 model：**

```typescript
// ❌ 現狀：返回 void
updateTitle: lens.mutation({
  input: z.object({ sessionId: z.string(), title: z.string() }),
  output: z.void(),  // ❌ Wrong!
  resolve: async ({ sessionId, title }, ctx) => {
    await ctx.sessionRepository.updateSessionTitle(sessionId, title);
    // ❌ 沒有返回 updated session
    // ❌ Frontend 不知道最終狀態
  }
})

// ✅ 應該：返回完整 model
updateTitle: lens.mutation({
  input: z.object({ sessionId: z.string(), title: z.string() }),
  output: SessionSchema,  // ✅ Return full model
  resolve: async ({ sessionId, title }, ctx) => {
    await ctx.sessionRepository.updateSessionTitle(sessionId, title);
    const session = await ctx.sessionRepository.getSessionById(sessionId);

    // Publish to subscribers (auto-sync)
    await ctx.eventStream.publish(`session:${sessionId}`, session);

    return session;  // ✅ Return for optimistic reconciliation
  }
})
```

### 問題 3: 粒度不一致

**現狀：細粒度 events 混亂**

```typescript
// ❌ 現狀：不同粒度的 events
eventStream.publish('session:title:start', ...)
eventStream.publish('session:title:delta', ...)
eventStream.publish('session:title:end', ...)
eventStream.publish('session:model:updated', ...)
eventStream.publish('session:status:changed', ...)

// Frontend 要處理很多 event types
// 無法用統一的 optimistic pattern
```

**應該：統一 model-level**

```typescript
// ✅ 應該：只有一種 event type
eventStream.publish(`session:${id}`, session);  // Full model

// Frontend 用 update strategy 控制粒度
client.session.getById.useSubscription(
  { sessionId },
  { updateMode: 'patch' }  // 自動用 JSON Patch 最小化傳輸
)

// Lens transport layer 負責：
// 1. Encode: previousValue -> currentValue -> JSON Patch
// 2. Decode: currentValue + JSON Patch -> newValue
// Frontend 只看到完整 model，不用處理 delta/patch
```

## 正確的架構分層

### Layer 1: Lens Framework (Infrastructure)

**職責：提供 communication 基礎設施**

```
@sylphx/lens-core
  - Schema builder
  - Type inference
  - Transport interface
  - Update strategies

@sylphx/lens-server
  - HTTP/SSE/WebSocket handlers
  - Request execution
  - Context injection (generic)
  - Auto-subscription

@sylphx/lens-client
  - Type-safe client generation
  - Field selection
  - Update mode configuration
  - Cache management

@sylphx/lens-react
  - useQuery / useMutation / useSubscription
  - Optimistic updates
  - Auto reconciliation
```

### Layer 2: Code API (Application Schema)

**職責：定義業務 API**

```typescript
// code-api/src/api.ts
import { lens } from '@sylphx/lens-core';

export const sessionAPI = lens.object({
  getById: lens.query({
    input: SessionIdSchema,
    output: SessionSchema,
    resolve: (input, ctx) => ctx.sessionRepository.getSessionById(input.sessionId),
    subscribe: (input, ctx) => ctx.eventStream.subscribe(`session:${input.sessionId}`)
  }),

  updateTitle: lens.mutation({
    input: UpdateTitleSchema,
    output: SessionSchema,  // Return full model
    resolve: async (input, ctx) => {
      await ctx.sessionRepository.updateSessionTitle(input.sessionId, input.title);
      const session = await ctx.sessionRepository.getSessionById(input.sessionId);
      await ctx.eventStream.publish(`session:${input.sessionId}`, session);
      return session;
    }
  })
});

export const api = lens.object({
  session: sessionAPI,
  message: messageAPI,
  todo: todoAPI,
  // ...
});

export type API = typeof api;
```

### Layer 3: Code Server (Application Runtime)

**職責：提供 context 和 services**

```typescript
// code-server/src/lens-server.ts
import { createLensServer } from '@sylphx/lens-server';
import { api } from '@sylphx/code-api';

const lensServer = createLensServer(api, {
  context: appContext,  // Provides repositories, services, config
  updateMode: 'auto',   // Default update strategy
});

app.post('/lens', lensServer.handler);
app.get('/lens/subscribe', lensServer.sseHandler);
```

### Layer 4: Code Client (Application Frontend)

**職責：使用 type-safe client**

```typescript
// code-client/src/api.ts
import { createLensClient } from '@sylphx/lens-client';
import { InProcessTransport } from '@sylphx/lens-core';
import type { API } from '@sylphx/code-api';

const client = createLensClient<API>(
  new InProcessTransport({ api, context: appContext }),
  {
    cache: createLensCache(),
    optimistic: true
  }
);

// React usage (code-web)
import { useSubscription, useMutation } from '@sylphx/lens-react';

function SessionView({ sessionId }: { sessionId: string }) {
  // Subscribe with field selection + update strategy
  const { data: session } = useSubscription(
    client.session.getById,
    { sessionId },
    {
      select: ['id', 'title', 'updatedAt', 'messageCount'],
      updateMode: 'patch'  // Minimal transfer via JSON Patch
    }
  );

  // Mutation with optimistic update
  const updateTitle = useMutation(client.session.updateTitle, {
    optimistic: (vars) => ({
      session: { id: vars.sessionId, title: vars.title }
    })
  });

  // Usage
  const handleRename = async (newTitle: string) => {
    // 1. Instant UI update (optimistic)
    // 2. Server mutation
    // 3. Auto reconciliation via subscription
    await updateTitle.mutate({ sessionId, title: newTitle });
  };
}
```

## 實現計劃

### Phase 1: 完成 Lens Framework 核心功能

**Priority: HIGHEST - 沒有這些，Code 無法正確使用 Lens**

#### 1.1 lens-client (Type-safe Client)
```typescript
// packages/lens-client/src/index.ts
export function createLensClient<T extends LensObject>(
  transport: LensTransport,
  options?: {
    cache?: LensCache;
    optimistic?: boolean;
  }
): LensClient<T>;

export interface LensClient<T> {
  // Generate type-safe API from schema
  [K in keyof T]: T[K] extends LensQuery<infer I, infer O>
    ? {
        query: (input: I, options?: QueryOptions) => Promise<O>;
        subscribe: (input: I, options?: SubscribeOptions) => Observable<O>;
      }
    : T[K] extends LensMutation<infer I, infer O>
    ? {
        mutate: (input: I, options?: MutateOptions) => Promise<O>;
      }
    : LensClient<T[K]>;
}
```

#### 1.2 lens-react (React Hooks)
```typescript
// packages/lens-react/src/index.ts
export function useQuery<I, O>(
  endpoint: LensQueryEndpoint<I, O>,
  input: I,
  options?: {
    select?: FieldSelection;
    enabled?: boolean;
  }
): UseQueryResult<O>;

export function useSubscription<I, O>(
  endpoint: LensQueryEndpoint<I, O>,
  input: I,
  options?: {
    select?: FieldSelection;
    updateMode?: UpdateMode;
  }
): UseSubscriptionResult<O>;

export function useMutation<I, O>(
  endpoint: LensMutationEndpoint<I, O>,
  options?: {
    optimistic?: (input: I) => Partial<O>;
    onSuccess?: (data: O) => void;
    onError?: (error: Error) => void;
  }
): UseMutationResult<I, O>;
```

#### 1.3 lens-core 改進
```typescript
// Add context type parameter (generic, not any)
export interface InProcessTransportConfig<TContext = unknown> {
  api: LensObject<any>;
  context: TContext;
}

// Update resolver signatures
export interface QueryConfig<TInput, TOutput, TContext = unknown> {
  input: z.ZodType<TInput>;
  output: z.ZodType<TOutput>;
  resolve: (input: TInput, ctx: TContext) => Promise<TOutput>;
  subscribe?: (input: TInput, ctx: TContext) => Observable<TOutput>;
}
```

### Phase 2: 重新設計 Code API (正確使用 Lens)

**Priority: HIGH - 修正 API 定義**

#### 2.1 Session API - 加上 subscribe
```typescript
export const sessionAPI = lens.object({
  getById: lens.query({
    input: z.object({ sessionId: z.string() }),
    output: SessionSchema,

    resolve: async ({ sessionId }, ctx: AppContext) => {
      return await ctx.sessionRepository.getSessionById(sessionId);
    },

    // ✅ ADD: Real-time subscription
    subscribe: ({ sessionId }, ctx: AppContext) => {
      return ctx.eventStream
        .subscribe(`session:${sessionId}`)
        .pipe(
          startWith(null),
          switchMap(async () => {
            return await ctx.sessionRepository.getSessionById(sessionId);
          })
        );
    }
  }),

  // All mutations return full model
  updateTitle: lens.mutation({
    input: z.object({ sessionId: z.string(), title: z.string() }),
    output: SessionSchema,  // ✅ Full model
    resolve: async ({ sessionId, title }, ctx: AppContext) => {
      await ctx.sessionRepository.updateSessionTitle(sessionId, title);
      const session = await ctx.sessionRepository.getSessionById(sessionId);
      await ctx.eventStream.publish(`session:${sessionId}`, session);
      return session;
    }
  })
});
```

#### 2.2 Message API - Delta strategy
```typescript
export const messageAPI = lens.object({
  streamResponse: lens.query({
    input: StreamInputSchema,
    output: MessageSchema,

    resolve: async (input, ctx) => {
      throw new Error('Use subscribe for streaming');
    },

    subscribe: (input, ctx) => {
      // Returns Observable<Message>
      // Lens transport will apply delta strategy automatically
      return streamAIResponse({ ...input, appContext: ctx });
    }
  })
});
```

### Phase 3: 更新 Code Client (使用 Lens Client)

**Priority: MEDIUM - 替換 tRPC**

#### 3.1 TUI Client
```typescript
// code-client/src/api.ts
import { createLensClient } from '@sylphx/lens-client';
import { InProcessTransport } from '@sylphx/lens-core';

const client = createLensClient<API>(
  new InProcessTransport({ api, context: appContext })
);

// Usage in TUI
const session = await client.session.getById.query({ sessionId: 'abc' });
```

#### 3.2 Web Client
```typescript
// code-web/src/api.ts
import { createLensClient } from '@sylphx/lens-client';
import { createSSETransport } from '@sylphx/lens-transport-sse';

const client = createLensClient<API>(
  createSSETransport({ url: 'http://localhost:3000/lens' })
);

// Usage in React
function SessionView({ sessionId }) {
  const { data, isLoading } = useSubscription(
    client.session.getById,
    { sessionId },
    {
      select: ['id', 'title', 'messageCount'],
      updateMode: 'patch'
    }
  );
}
```

### Phase 4: 移除 tRPC

**Priority: LOW - 清理 legacy code**

- Remove @trpc/server, @trpc/client
- Remove tRPC routers
- Remove tRPC-specific event types

## 成功指標

### Lens Framework
- ✅ lens-client 完整實現 (type-safe, field selection, update modes)
- ✅ lens-react 完整實現 (hooks with optimistic updates)
- ✅ Type inference 完整 (InferInput, InferOutput, Selected)
- ✅ Update strategies 正常工作 (delta, patch, auto)
- ✅ Context 是 generic (不是 any)

### Code Application
- ✅ 所有 queries 有 subscribe
- ✅ 所有 mutations 返回完整 model
- ✅ 統一 model-level events (移除細粒度 events)
- ✅ Frontend 用 field selection
- ✅ Frontend 用 update strategies
- ✅ Optimistic updates 統一 pattern
- ✅ 完全移除 tRPC dependencies

### 終極目標
- ✅ **Frontend-driven** - Frontend 控制 what, when, how
- ✅ **Minimal transfer** - Delta/Patch strategies 自動優化
- ✅ **Type-safe** - End-to-end TypeScript inference
- ✅ **Optimistic UI** - 統一 pattern，自動 reconciliation
- ✅ **Architecture完美** - Lens (framework) ↔ Code (app) 職責清晰分離

## 總結

**當前狀態：**
- Lens framework 核心功能存在，但 **client 層完全沒實現**
- Code API 定義完成，但 **沒有正確使用 Lens 功能**
- 仍然是 backend-driven，沒有達到 frontend-driven 目標

**下一步：**
1. **實現 lens-client** - Type-safe client with field selection
2. **實現 lens-react** - Hooks with optimistic updates
3. **重新設計 Code API** - 加上 subscribe, 返回 full models
4. **更新 Code Client** - 使用 lens-client 替換 tRPC

**最終目標：**
完美的職責分離：
- **Lens** = Communication framework (可以用於任何 TypeScript app)
- **Code** = AI coding assistant (使用 Lens 作為 communication layer)
