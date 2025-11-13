# 診斷 Double Jump 問題

## 當前狀態

- ✅ 新 InputModeManager 系統已啟用 (`USE_NEW_INPUT_MANAGER = true`)
- ✅ Debug 模式已啟用 (`DEBUG_INPUT_MANAGER = true`)
- ✅ 所有 legacy hooks 應該已禁用

## 測試步驟

1. **重新build並運行**:
```bash
cd /Users/kyle/code/packages/code
bun run build
bun src/index.ts
```

2. **觸發 selection UI**:
   - 例如使用任何會產生選擇的命令
   - 或等待出現需要選擇的情況

3. **按 Up/Down 箭頭鍵**，觀察：
   - 是否跳 1 行（正確）還是 2 行（bug）
   - 查看 console 中的 debug 日誌

## 預期的 Debug 日誌

**正確情況**（只有一個 handler 處理）:
```
[useInputMode] Mode changed: normal → selection
[InputModeManager:selection] Key consumed by SelectionModeHandler: '↓'
```

**錯誤情況**（多個 handler 或重複處理）:
```
[useInputMode] Mode changed: normal → selection
[InputModeManager:selection] Key consumed by SelectionModeHandler: '↓'
[InputModeManager:selection] Key consumed by SelectionModeHandler: '↓'  # ← 重複！
```

或者:
```
[SomeOtherHook] Processing arrow down  # ← 另一個 hook 也在處理！
[InputModeManager:selection] Key consumed by SelectionModeHandler: '↓'
```

## 可能的問題

### 1. 新系統內部重複處理
**症狀**: 看到同一個 handler 被調用兩次
**解決**: 檢查 handler 的 `isActive` 條件

### 2. Legacy hook 沒有被禁用
**症狀**: 看到非 InputModeManager 的日誌
**解決**: 檢查 feature flag 是否正確應用

### 3. useSelection hook 也在處理
**症狀**: 沒有明顯的日誌，但仍然 double jump
**可能原因**: `useSelection` hook（在 `InlineSelection` 組件中）沒有 `isActive` 條件
**解決**: 需要給 `useSelection` 添加條件檢查

### 4. 多個 handler 都認為自己是 active
**症狀**: 看到多個不同的 handler 處理同一個按鍵
**解決**: 檢查 handler 的 `isActive` 條件和 priority

## 收集信息

請運行並分享：
1. 完整的 console 日誌（特別是按 arrow key 時的輸出）
2. 確認是否仍然跳 2 行
3. Selection UI 是在什麼情況下出現的（什麼命令/操作）

## 快速修復嘗試

如果問題仍然存在，試試關閉新系統：

```typescript
// src/config/features.ts
export const USE_NEW_INPUT_MANAGER = false;  // 切回舊系統
```

然後重新 build 和運行，看看舊系統是否也有同樣問題。這能幫助我們確定問題是在新系統還是其他地方。
