# Optimistic Updates 詳細解釋

**從零開始理解 Optimistic Updates 的完整機制**

---

## 什麼是 Optimistic Updates？

**定義：** 在等待 server 回應之前，**先假設操作會成功**，立即更新 UI。

**對比：**

### ❌ 傳統方式（Pessimistic）

```
用戶點擊「保存」
  ↓
顯示 loading spinner  ⏳
  ↓
等待 server 回應...（200ms - 2s）
  ↓
Server 回應成功 ✅
  ↓
更新 UI（顯示新內容）
```

**問題：** 用戶需要等待 200ms - 2s 才能看到變化。感覺很慢！

---

### ✅ Optimistic Updates 方式

```
用戶點擊「保存」
  ↓
立即更新 UI（顯示新內容）⚡️  ← 0ms！
  ↓
背景發送請求到 server...
  ↓
Server 回應成功 ✅ → 保持 UI（已經是對的）
Server 回應失敗 ❌ → 回滾 UI（恢復舊內容）
```

**優點：** UI 立即更新，感覺超快！就像本地應用一樣。

---

## 實際例子：更新 Session Title

### 場景

用戶在 Code TUI 中編輯 session 的標題：

```
舊標題: "Untitled Session"
新標題: "Fix login bug"
```

### 完整時間線（毫秒級）

```
T=0ms    用戶按 Enter 保存
         ↓
         [Optimistic Update]
         1. 生成 operation: { type: 'update-session-title', ... }
         2. 調用 optimisticManager.apply(operation)
         3. 返回 effects: [PATCH_STATE, SCHEDULE_TIMEOUT]
         4. 執行 PATCH_STATE → UI 立即顯示 "Fix login bug" ✅
         5. 執行 SCHEDULE_TIMEOUT → 10 秒後自動回滾（如果還沒確認）
         ↓
T=1ms    UI 已更新！用戶看到新標題
         ↓
T=5ms    發送 HTTP request 到 server
         ↓
         ... server 處理中 ...
         ↓
T=150ms  Server 回應成功
         ↓
         [Confirm]
         1. 調用 optimisticManager.confirm(operationId, serverData)
         2. 移除 pending operation
         3. 取消 timeout
         4. UI 保持不變（已經是對的內容）
         ↓
         完成！✅
```

**關鍵：** 用戶在 T=1ms 就看到新標題了，而 server 在 T=150ms 才回應。**快了 150 倍！**

---

## 代碼層面：實際執行流程

### 1️⃣ 用戶觸發更新

```typescript
// 用戶按 Enter，觸發更新
await lensClient.session.updateTitle.mutate({
  sessionId: 'session-123',
  title: "Fix login bug"
});
```

### 2️⃣ Lens Client 自動執行 Optimistic Update

```typescript
// Inside lensClient.mutate()

// Step 1: 查找 optimistic config
const optimisticConfig = this.optimisticConfigs['session.updateTitle'];

if (optimisticConfig) {
  // Step 2: 生成 operation
  const operation = optimisticConfig.apply({
    sessionId: 'session-123',
    title: "Fix login bug"
  });

  // operation = {
  //   type: 'update-session-title',
  //   sessionId: 'session-123',
  //   title: "Fix login bug"
  // }

  // Step 3: 應用 optimistic update
  const { effects, operationId } = optimisticManager.apply(
    'session-123',  // sessionId
    operation
  );

  // effects = [
  //   { type: 'PATCH_STATE', patches: [...] },
  //   { type: 'SCHEDULE_TIMEOUT', timeoutId: 'op-123', ms: 10000 }
  // ]

  // Step 4: 執行 effects
  executeEffects(effects);
  // → UI 立即更新！
}

// Step 5: 發送到 server（背景執行）
try {
  const response = await transport.mutate({
    path: ['session', 'updateTitle'],
    input: { sessionId: 'session-123', title: "Fix login bug" }
  });

  // Step 6: Server 成功 → Confirm
  optimisticManager.confirm(operationId, response);

} catch (error) {
  // Step 7: Server 失敗 → Rollback
  optimisticManager.rollback(operationId);
}
```

### 3️⃣ UI 層自動反映變化

```typescript
// useLensSessionSubscription hook
useLensSessionSubscription({
  select: { id: true, title: true },

  onSessionUpdated: (session) => {
    // session.title = "Fix login bug"  ← 已經是新的！
    // 這個 session 是 merged state:
    // - Server state: { title: "Untitled Session" }
    // - Optimistic state: { title: "Fix login bug" }
    // - Merged: { title: "Fix login bug" }  ← 用戶看到這個
  }
});
```

---

## 完整數據流

### State 變化過程

```typescript
// T=0ms - Initial state (server state)
{
  serverState: {
    id: 'session-123',
    title: "Untitled Session"  // 舊標題
  },
  optimisticState: {
    pending: []  // 沒有 pending operations
  },
  mergedState: {
    id: 'session-123',
    title: "Untitled Session"  // UI 顯示舊標題
  }
}

// T=1ms - After optimistic update
{
  serverState: {
    id: 'session-123',
    title: "Untitled Session"  // Server state 還沒變
  },
  optimisticState: {
    pending: [
      {
        id: 'op-456',
        operation: {
          type: 'update-session-title',
          sessionId: 'session-123',
          title: "Fix login bug"
        },
        timestamp: 1234567890
      }
    ]
  },
  mergedState: {
    id: 'session-123',
    title: "Fix login bug"  // UI 顯示新標題！⚡️
  }
}

// T=150ms - After server confirms
{
  serverState: {
    id: 'session-123',
    title: "Fix login bug"  // Server 已更新
  },
  optimisticState: {
    pending: []  // Operation confirmed，已移除
  },
  mergedState: {
    id: 'session-123',
    title: "Fix login bug"  // UI 保持不變
  }
}
```

---

## 複雜場景 1：Server 失敗（Rollback）

### 場景

用戶嘗試更新標題，但 server 拒絕（例如標題太長）。

### 時間線

```
T=0ms    用戶輸入新標題 "A".repeat(1000)  （太長！）
         ↓
T=1ms    Optimistic update → UI 顯示新標題
         ↓
T=5ms    發送到 server
         ↓
T=150ms  Server 回應 400 Bad Request
         ↓
         [Rollback]
         1. 調用 optimisticManager.rollback(operationId)
         2. 移除 pending operation
         3. 執行 inverse operation（恢復舊標題）
         4. UI 回滾到 "Untitled Session"
         5. 顯示錯誤訊息：「標題太長」
         ↓
         用戶看到 UI 恢復舊標題 + 錯誤訊息
```

### 代碼

```typescript
try {
  const response = await transport.mutate(...);
  optimisticManager.confirm(operationId, response);

} catch (error) {
  // Server 失敗！
  const { effects } = optimisticManager.rollback(operationId);

  // effects = [
  //   { type: 'PATCH_STATE', patches: [inverse patches] },
  //   { type: 'CANCEL_TIMEOUT', timeoutId: 'op-123' },
  //   { type: 'EMIT_EVENT', event: 'rollback', payload: error }
  // ]

  executeEffects(effects);
  // → UI 回滾到舊狀態

  // 顯示錯誤
  toast.error('Failed to update title: ' + error.message);
}
```

### UI 變化

```
用戶看到：
1. T=1ms:   "AAAAAA..." （optimistic）
2. T=150ms: "Untitled Session" （rollback）+ 錯誤訊息
```

**重要：** Rollback 是平滑的，不是突然跳回去。

---

## 複雜場景 2：Concurrent Updates（並發更新）

### 場景

用戶快速連續更新標題兩次：

```
Operation 1: "Fix login bug"
Operation 2: "Fix login and signup bugs"
```

### 時間線

```
T=0ms    用戶輸入 "Fix login bug"，按 Enter
         ↓
         Optimistic update #1
         pending: [op1]
         UI: "Fix login bug"
         ↓
T=50ms   用戶又改標題為 "Fix login and signup bugs"，按 Enter
         ↓
         Optimistic update #2
         pending: [op1, op2]  ← 兩個 pending operations！
         UI: "Fix login and signup bugs"  ← 最新的
         ↓
T=100ms  Server 回應 op1 成功
         ↓
         Confirm op1
         pending: [op2]  ← 還有一個 pending
         UI: "Fix login and signup bugs"  ← 保持最新的
         ↓
T=150ms  Server 回應 op2 成功
         ↓
         Confirm op2
         pending: []
         UI: "Fix login and signup bugs"  ← 最終狀態
```

### 代碼

```typescript
// OptimisticManagerV2 自動處理並發

// Apply op1
const { operationId: op1Id } = optimisticManager.apply('session-123', {
  type: 'update-session-title',
  title: "Fix login bug"
});
// State: { pending: [op1], computedTitle: "Fix login bug" }

// Apply op2 (op1 還沒 confirm)
const { operationId: op2Id } = optimisticManager.apply('session-123', {
  type: 'update-session-title',
  title: "Fix login and signup bugs"
});
// State: { pending: [op1, op2], computedTitle: "Fix login and signup bugs" }
//                                               ↑ 最後的 operation wins

// Confirm op1
optimisticManager.confirm(op1Id, serverResponse1);
// State: { pending: [op2], computedTitle: "Fix login and signup bugs" }
//                          ↑ op2 還在，所以還是用 op2 的值

// Confirm op2
optimisticManager.confirm(op2Id, serverResponse2);
// State: { pending: [], computedTitle: "Fix login and signup bugs" }
//                       ↑ Server confirmed
```

**關鍵：** Multiple pending operations 可以共存，最後的 operation 覆蓋前面的。

---

## 複雜場景 3：Timeout（超時自動回滾）

### 場景

Server 沒有回應（網絡問題），10 秒後自動回滾。

### 時間線

```
T=0ms      Optimistic update
           UI: "Fix login bug"
           Schedule timeout: 10s
           ↓
T=5ms      發送到 server
           ↓
           ... server 沒回應（網絡斷了）...
           ↓
T=10000ms  Timeout 觸發！
           ↓
           [Auto Rollback]
           1. 調用 optimisticManager.rollback(operationId)
           2. UI 回滾到 "Untitled Session"
           3. 顯示錯誤：「操作超時」
```

### 代碼

```typescript
// Apply optimistic update
const { effects } = optimisticManager.apply('session-123', operation);

// effects 包含 SCHEDULE_TIMEOUT
executeEffects(effects);

// SCHEDULE_TIMEOUT effect 實作：
function executeScheduleTimeout(effect) {
  const timeoutId = setTimeout(() => {
    // 10 秒後執行
    console.log('Operation timeout! Rolling back...');

    const { effects } = optimisticManager.rollback(effect.operationId);
    executeEffects(effects);

    toast.error('Operation timed out. Changes reverted.');
  }, 10000);

  // 儲存 timeoutId，以便後續可以取消
  timeouts.set(effect.timeoutId, timeoutId);
}

// 如果 server 及時回應，會 CANCEL_TIMEOUT
function executeCancelTimeout(effect) {
  const timeoutId = timeouts.get(effect.timeoutId);
  clearTimeout(timeoutId);
  timeouts.delete(effect.timeoutId);
}
```

---

## 複雜場景 4：同一個 API，不同結果

### 場景

同一個 `updateTitle` API，可能有不同結果：

1. ✅ 成功 → Confirm
2. ❌ 驗證失敗 → Rollback + 錯誤訊息
3. ❌ 權限不足 → Rollback + 錯誤訊息
4. ❌ Session 不存在 → Rollback + 錯誤訊息
5. ⏳ 超時 → Rollback + 超時訊息

### 代碼

```typescript
// Optimistic update
const { operationId } = optimisticManager.apply('session-123', operation);
// UI 立即更新

try {
  const response = await transport.mutate({
    path: ['session', 'updateTitle'],
    input: { sessionId: 'session-123', title: newTitle }
  });

  // Case 1: Success ✅
  optimisticManager.confirm(operationId, response);
  toast.success('Title updated!');

} catch (error) {
  // Cases 2-4: Different errors ❌
  optimisticManager.rollback(operationId);

  if (error.code === 'VALIDATION_ERROR') {
    // Case 2
    toast.error('Title is invalid: ' + error.message);
  } else if (error.code === 'FORBIDDEN') {
    // Case 3
    toast.error('You don\'t have permission to update this session');
  } else if (error.code === 'NOT_FOUND') {
    // Case 4
    toast.error('Session not found');
  } else {
    // Unknown error
    toast.error('Failed to update title');
  }
}

// Case 5: Timeout ⏳
// Handled by SCHEDULE_TIMEOUT effect (automatic after 10s)
```

**關鍵：** 無論什麼錯誤，都是：
1. Rollback optimistic update
2. 顯示對應的錯誤訊息

---

## Lens 的 Optimistic Config 如何運作

### 配置

```typescript
const client = createLensClient<AppRouter>({
  transport,

  optimistic: {
    mutations: {
      'session.updateTitle': {
        // 這個函數定義「如何 optimistically update」
        apply: (input) => ({
          type: 'update-session-title',
          sessionId: input.sessionId,
          title: input.title
        })
      }
    }
  }
});
```

### 執行流程

```typescript
// 1. 用戶調用 mutation
await client.session.updateTitle.mutate({
  sessionId: 'session-123',
  title: "Fix login bug"
});

// 2. Lens Client 內部：
function mutate(path, input) {
  // 查找 optimistic config
  const configKey = path.join('.');  // 'session.updateTitle'
  const config = this.optimistic.mutations[configKey];

  if (config) {
    // 生成 operation
    const operation = config.apply(input);
    // operation = {
    //   type: 'update-session-title',
    //   sessionId: 'session-123',
    //   title: "Fix login bug"
    // }

    // 應用 optimistic update
    const { operationId } = optimisticManager.apply(
      input.sessionId,  // Entity ID
      operation
    );

    // 發送到 server
    try {
      const response = await transport.mutate({ path, input });
      optimisticManager.confirm(operationId, response);
    } catch (error) {
      optimisticManager.rollback(operationId);
      throw error;
    }
  } else {
    // 沒有 optimistic config → 傳統方式
    const response = await transport.mutate({ path, input });
    return response;
  }
}
```

---

## OptimisticManagerV2 內部實作

### Data Structure

```typescript
class OptimisticManagerV2 {
  private sessions = new Map<string, SessionState>();

  // SessionState 結構
  interface SessionState {
    sessionId: string;
    serverMessages: Message[];      // Server 的真實狀態
    serverQueue: QueuedMessage[];   // Server 的真實狀態
    serverStatus?: SessionStatus;   // Server 的真實狀態
    pending: PendingOperation[];    // Pending optimistic operations
  }

  interface PendingOperation {
    id: string;              // 'op-123'
    operation: Operation;    // { type: 'update-session-title', ... }
    timestamp: number;       // When applied
  }
}
```

### apply() 實作

```typescript
apply(sessionId: string, operation: Operation): EffectResult {
  // 1. Get or create session state
  const state = this.getSession(sessionId);

  // 2. Generate unique operation ID
  const operationId = `op-${this.nextOptimisticId++}`;

  // 3. Create pending operation
  const pending: PendingOperation = {
    id: operationId,
    operation,
    timestamp: Date.now()
  };

  // 4. Add to pending list
  state.pending.push(pending);

  // 5. Generate effects (pure function)
  const effects: Effect[] = [
    // Effect 1: Patch state
    {
      type: 'PATCH_STATE',
      patches: generatePatches(state, operation)
    },

    // Effect 2: Schedule timeout (auto-rollback after 10s)
    {
      type: 'SCHEDULE_TIMEOUT',
      timeoutId: operationId,
      ms: 10000,
      onTimeout: () => {
        return this.rollback(sessionId, operationId).effects;
      }
    },

    // Effect 3: Log
    {
      type: 'LOG',
      level: 'info',
      message: 'Applied optimistic operation',
      data: { operationId, operation }
    }
  ];

  return { effects, operationId };
}
```

### confirm() 實作

```typescript
confirm(sessionId: string, operationId: string, serverData?: any): EffectResult {
  const state = this.getSession(sessionId);

  // 1. Find and remove pending operation
  const index = state.pending.findIndex(p => p.id === operationId);
  if (index === -1) {
    // Already confirmed or rolled back
    return { effects: [] };
  }

  state.pending.splice(index, 1);

  // 2. Generate effects
  const effects: Effect[] = [
    // Cancel timeout
    {
      type: 'CANCEL_TIMEOUT',
      timeoutId: operationId
    },

    // Update server state with confirmed data
    {
      type: 'PATCH_STATE',
      patches: generatePatchesFromServer(serverData)
    },

    // Log
    {
      type: 'LOG',
      level: 'info',
      message: 'Confirmed optimistic operation',
      data: { operationId }
    }
  ];

  return { effects };
}
```

### rollback() 實作

```typescript
rollback(sessionId: string, operationId: string): EffectResult {
  const state = this.getSession(sessionId);

  // 1. Find and remove pending operation
  const index = state.pending.findIndex(p => p.id === operationId);
  if (index === -1) {
    return { effects: [] };
  }

  const [removed] = state.pending.splice(index, 1);

  // 2. Generate inverse effects (undo the operation)
  const effects: Effect[] = [
    // Rollback state
    {
      type: 'PATCH_STATE',
      patches: generateInversePatches(removed.operation)
    },

    // Cancel timeout
    {
      type: 'CANCEL_TIMEOUT',
      timeoutId: operationId
    },

    // Emit rollback event
    {
      type: 'EMIT_EVENT',
      event: 'optimistic-rollback',
      payload: { operationId, operation: removed.operation }
    },

    // Log
    {
      type: 'LOG',
      level: 'warn',
      message: 'Rolled back optimistic operation',
      data: { operationId }
    }
  ];

  return { effects };
}
```

---

## 為什麼需要 Effect System？

### 沒有 Effect System（直接 mutation）

```typescript
apply(sessionId: string, operation: Operation) {
  const state = this.getSession(sessionId);

  // ❌ 直接 mutate state
  state.pending.push({ id: 'op-123', operation });

  // ❌ 直接執行 side effects
  setTimeout(() => {
    this.rollback(sessionId, 'op-123');
  }, 10000);

  // ❌ 難以測試
  // ❌ 難以組合
  // ❌ 難以追蹤
}
```

### 有 Effect System（純函數）

```typescript
apply(sessionId: string, operation: Operation): EffectResult {
  const state = this.getSession(sessionId);

  // ✅ Pure function - 只返回 effects
  const effects: Effect[] = [
    { type: 'PATCH_STATE', patches: [...] },
    { type: 'SCHEDULE_TIMEOUT', timeoutId: 'op-123', ms: 10000 }
  ];

  return { effects };

  // ✅ 容易測試（純函數）
  // ✅ 容易組合（effects 是數據）
  // ✅ 容易追蹤（effects 可以 log）
}

// Effects 在外部執行
const { effects } = manager.apply(sessionId, operation);
executeEffects(effects);  // Side effects 集中在這裡
```

---

## 總結

### Optimistic Updates 的核心機制

1. **Apply（應用）**
   - 生成 operation
   - 立即更新 UI（假設成功）
   - 記錄 pending operation
   - 設置超時回滾

2. **Confirm（確認）**
   - Server 成功回應
   - 移除 pending operation
   - 取消超時
   - UI 保持不變（已經是對的）

3. **Rollback（回滾）**
   - Server 失敗或超時
   - 執行 inverse operation
   - 恢復舊狀態
   - 顯示錯誤訊息

### Lens 的 Optimistic Config

```typescript
// Client 定義如何 optimistically update
optimistic: {
  mutations: {
    'session.updateTitle': {
      apply: (input) => ({
        type: 'update-session-title',
        sessionId: input.sessionId,
        title: input.title
      })
    }
  }
}
```

**這個 config 的作用：**
- 定義「input → operation」的轉換
- Lens Client 自動處理 apply/confirm/rollback
- OptimisticManagerV2 處理狀態管理
- Effect System 處理 side effects

### 複雜度來自哪裡？

1. **Concurrent updates** - 多個 operations 同時進行
2. **Rollback logic** - 如何正確地 undo 操作
3. **Timeout handling** - 自動回滾未確認的操作
4. **State merging** - Server state + Optimistic state → UI state
5. **Error handling** - 不同錯誤類型的處理

**但好消息：** OptimisticManagerV2 已經處理了所有這些複雜度！你只需要定義 `apply` 函數。

---

## 下一步

現在理解了 optimistic updates 的機制，你覺得這個設計可行嗎？

還有任何疑問嗎？
