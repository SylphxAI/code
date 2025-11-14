# Functional Style Storage

Pure functional implementation using closures, Result types, and function composition.

## 核心原則

✅ **Pure Functions** - 所有函數都是 pure（除了 I/O 本身）
✅ **No Classes** - 用 closures 和 higher-order functions
✅ **Result Type** - 明確的錯誤處理，不拋異常
✅ **Composition** - 用函數組合而非繼承
✅ **Dependency Injection** - Config 作為參數傳遞

## 快速開始

### 基本用法

```typescript
import { createStorageOps } from '@sylphx/code-core/storage';

// 創建storage operations (pure function)
const storage = createStorageOps({
  type: 'filesystem',
  basePath: '/tmp/storage'
});

// 所有operations返回Result type
const putResult = await storage.put('files/test.txt', Buffer.from('hello'), {
  contentType: 'text/plain'
});

if (putResult.success) {
  console.log('✅ File stored');
} else {
  console.error('❌ Error:', putResult.error);
}

// Get operation
const getResult = await storage.get('files/test.txt');
if (getResult.success) {
  const content = getResult.data as Buffer;
  console.log(content.toString()); // 'hello'
}
```

### Cloudflare R2

```typescript
const storage = createStorageOps({
  type: 'r2',
  region: 'auto',
  bucket: 'my-bucket',
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  endpoint: 'https://account.r2.cloudflarestorage.com',
  publicUrlBase: 'https://cdn.example.com'
});

// 獲取簽名URL
const urlResult = await storage.get('files/image.png', {
  returnUrl: true,
  expiresIn: 3600 // 1 hour
});

if (urlResult.success) {
  const signedUrl = urlResult.data as string;
  // 客戶端直接下載
}
```

## 函數組合（Function Composition）

### 添加日誌

```typescript
import { createStorageOps, withLogging } from '@sylphx/code-core/storage';

const baseStorage = createStorageOps({ type: 'filesystem', basePath: '/tmp' });

// Compose with logging
const storage = withLogging(baseStorage, (msg) => console.log(msg));

await storage.put('file.txt', buffer);
// [Storage] PUT file.txt (1234 bytes)
// [Storage] PUT file.txt -> OK
```

### 添加重試邏輯

```typescript
import { createStorageOps, withRetry } from '@sylphx/code-core/storage';

const baseStorage = createStorageOps({
  type: 's3',
  region: 'us-east-1',
  bucket: 'my-bucket',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
});

// Compose with retry (max 3 retries, exponential backoff)
const storage = withRetry(baseStorage, 3, 1000);

// 自動重試失敗的請求
await storage.put('file.txt', buffer);
```

### 添加緩存

```typescript
import { createStorageOps, withCache } from '@sylphx/code-core/storage';

const baseStorage = createStorageOps({ type: 'filesystem', basePath: '/tmp' });

const cache = new Map();

// Compose with cache (60s TTL)
const storage = withCache(baseStorage, cache, 60000);

// 第一次從文件讀取
await storage.get('file.txt');

// 第二次從緩存讀取
await storage.get('file.txt'); // ⚡ Fast!
```

### 組合多個enhancer

```typescript
import { createStorageOps, withLogging, withRetry, withCache } from '@sylphx/code-core/storage';

const config = { type: 'filesystem', basePath: '/tmp' };

// Function composition (右到左)
const storage = withLogging(
  withRetry(
    withCache(
      createStorageOps(config),
      new Map(),
      60000
    ),
    3,
    1000
  ),
  console.log
);

// 或用 pipe helper (左到右，更直觀)
const pipe = <T>(value: T, ...fns: Array<(arg: T) => T>): T =>
  fns.reduce((acc, fn) => fn(acc), value);

const storage2 = pipe(
  createStorageOps(config),
  (ops) => withCache(ops, new Map(), 60000),
  (ops) => withRetry(ops, 3, 1000),
  (ops) => withLogging(ops, console.log)
);
```

## 高階模式

### 自定義Enhancer

```typescript
import type { StorageOps, StorageResult } from '@sylphx/code-core/storage';

// 添加性能監控
const withMetrics = (
  ops: StorageOps,
  onMetric: (operation: string, durationMs: number) => void
): StorageOps => ({
  put: async (key, content, options) => {
    const start = Date.now();
    const result = await ops.put(key, content, options);
    onMetric('put', Date.now() - start);
    return result;
  },
  get: async (key, options) => {
    const start = Date.now();
    const result = await ops.get(key, options);
    onMetric('get', Date.now() - start);
    return result;
  },
  exists: ops.exists,
  delete: ops.delete,
  head: ops.head,
  list: ops.list,
  getPublicUrl: ops.getPublicUrl,
});

// 使用
const storage = withMetrics(baseStorage, (operation, duration) => {
  console.log(`${operation} took ${duration}ms`);
});
```

### 條件性enhancer

```typescript
// 只在生產環境添加retry
const isDev = process.env.NODE_ENV === 'development';

const storage = isDev
  ? createStorageOps(config)
  : withRetry(createStorageOps(config), 3, 1000);
```

### 批量操作（使用高階函數）

```typescript
const storage = createStorageOps(config);

// 批量上傳（pure functional approach）
const uploadMany = (files: Array<{ key: string; content: Buffer }>) =>
  Promise.all(
    files.map(({ key, content }) =>
      storage.put(key, content)
    )
  );

// 使用
const results = await uploadMany([
  { key: 'file1.txt', content: buffer1 },
  { key: 'file2.txt', content: buffer2 },
]);

// 檢查是否全部成功
const allSuccessful = results.every(r => r.success);
```

### Pipeline處理

```typescript
import { pipe } from '@/utils/fp';

// 定義處理pipeline
const processFile = pipe(
  (file: Buffer) => compress(file),
  (compressed) => encrypt(compressed),
  (encrypted) => storage.put('output.bin', encrypted)
);

await processFile(inputBuffer);
```

## 依賴注入（用於測試）

```typescript
// Mock storage for testing
const createMockStorage = (): StorageOps => {
  const store = new Map<string, Buffer>();

  return {
    put: async (key, content) => {
      store.set(key, content);
      return { success: true };
    },
    get: async (key) => {
      const data = store.get(key);
      return data
        ? { success: true, data }
        : { success: false, error: new Error('Not found') };
    },
    exists: async (key) => ({
      success: true,
      data: store.has(key)
    }),
    delete: async (key) => {
      store.delete(key);
      return { success: true };
    },
    head: async (key) => {
      const data = store.get(key);
      return data
        ? {
            success: true,
            data: {
              key,
              size: data.length,
              contentType: 'application/octet-stream',
            }
          }
        : { success: false, error: new Error('Not found') };
    },
    list: async () => ({
      success: true,
      data: Array.from(store.keys()).map(key => ({
        key,
        size: store.get(key)!.length,
        contentType: 'application/octet-stream',
      }))
    }),
    getPublicUrl: () => null,
  };
};

// 在測試中使用
import { test } from 'vitest';

test('should upload file', async () => {
  const storage = createMockStorage();

  const result = await storage.put('test.txt', Buffer.from('hello'));

  expect(result.success).toBe(true);
});
```

## Reader Monad Pattern（進階）

如果你想要更純的functional approach：

```typescript
// Reader type
type Reader<R, A> = (ctx: R) => A;

// Storage reader
type StorageReader<A> = Reader<StorageOps, Promise<A>>;

// Helper to run reader
const runReader = <A>(reader: StorageReader<A>, ops: StorageOps): Promise<A> =>
  reader(ops);

// Example usage
const uploadFile = (key: string, content: Buffer): StorageReader<StorageResult> =>
  (storage) => storage.put(key, content);

const downloadFile = (key: string): StorageReader<StorageResult<Buffer | string>> =>
  (storage) => storage.get(key);

// Compose readers
const copyFile = (from: string, to: string): StorageReader<StorageResult> =>
  async (storage) => {
    const getResult = await downloadFile(from)(storage);
    if (!getResult.success) return getResult;

    const data = getResult.data as Buffer;
    return uploadFile(to, data)(storage);
  };

// Run
const storage = createStorageOps(config);
await runReader(copyFile('a.txt', 'b.txt'), storage);
```

## 與Effect-TS集成

```typescript
import { Effect } from 'effect';

// 轉換StorageResult為Effect
const putEffect = (storage: StorageOps, key: string, content: Buffer) =>
  Effect.tryPromise({
    try: async () => {
      const result = await storage.put(key, content);
      if (!result.success) throw result.error;
    },
    catch: (error) => new Error(String(error)),
  });

// 使用Effect組合
const program = Effect.gen(function* (_) {
  yield* _(putEffect(storage, 'file1.txt', buffer1));
  yield* _(putEffect(storage, 'file2.txt', buffer2));
  return 'done';
});

await Effect.runPromise(program);
```

## 對比：OOP vs Functional

```typescript
// ❌ OOP Style
const storage = new FilesystemStorage({ basePath: '/tmp' });
await storage.put('file.txt', buffer);

// ✅ Functional Style
const storage = createFilesystemOps({ basePath: '/tmp' });
await storage.put('file.txt', buffer);

// ✅ Functional with composition
const storage = pipe(
  createFilesystemOps({ basePath: '/tmp' }),
  (ops) => withRetry(ops, 3, 1000),
  (ops) => withLogging(ops, console.log)
);
await storage.put('file.txt', buffer);
```

## 優點

1. **易於測試** - Pure functions，easy mock
2. **易於組合** - Function composition
3. **易於理解** - 數據流明確
4. **類型安全** - Full TypeScript support
5. **無副作用** - Explicit effects (I/O)
6. **無狀態** - 所有state在closure中封裝

## 何時使用

✅ **Use Functional Style when:**
- 你的codebase是functional style
- 需要高度可測試性
- 需要複雜的function composition
- 使用Effect-TS或fp-ts

✅ **Use OOP Style when:**
- 你的codebase是OOP style
- 需要繼承和多態
- 團隊更熟悉class-based code

**兩者可以共存！** 選擇適合你項目的風格。
