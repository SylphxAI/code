# Storage Abstraction Layer

統一的存儲接口，支持多種後端存儲，輕鬆在本地文件系統和雲端對象存儲之間切換。

## 特性

✅ **統一接口** - 所有存儲實現使用相同的API
✅ **輕鬆切換** - 通過環境變量切換存儲後端
✅ **懶加載SDK** - 只在需要時加載雲端SDK，不影響本地模式
✅ **類型安全** - 完整的TypeScript支持
✅ **可擴展** - 輕鬆添加新的存儲後端

## 支持的存儲後端

| 後端 | 狀態 | 適用場景 |
|------|------|----------|
| **Filesystem** | ✅ 已實現 | 本地開發、嵌入式服務器 |
| **AWS S3** | ✅ 已實現 | AWS雲端部署 |
| **Cloudflare R2** | ✅ 已實現 | Serverless部署（零egress費用） |
| **Google Cloud Storage** | 🚧 待實現 | GCP雲端部署 |
| **Vercel Blob** | 🚧 待實現 | Vercel部署 |
| **Supabase Storage** | 🚧 待實現 | Supabase全家桶 |

## 快速開始

### 1. 本地文件系統（默認）

```typescript
import { getStorage } from '@sylphx/code-core/storage';

// 自動使用文件系統存儲（默認）
const storage = getStorage();

// 存儲文件
await storage.put('files/image.png', imageBuffer, {
  contentType: 'image/png'
});

// 讀取文件
const result = await storage.get('files/image.png');
if (result.success) {
  const content = result.data as Buffer;
  // 使用content...
}
```

### 2. Cloudflare R2

```bash
# .env
STORAGE_TYPE=r2
R2_ACCOUNT_ID=your-account-id
R2_BUCKET=my-bucket
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_PUBLIC_URL_BASE=https://cdn.example.com  # 可選CDN URL
```

```typescript
import { getStorage } from '@sylphx/code-core/storage';

// 自動使用R2存儲（根據環境變量）
const storage = getStorage();

// 存儲文件
await storage.put('files/image.png', imageBuffer, {
  contentType: 'image/png',
  cacheControl: 'public, max-age=31536000'
});

// 獲取簽名URL（30分鐘有效）
const result = await storage.get('files/image.png', {
  returnUrl: true,
  expiresIn: 1800
});
if (result.success) {
  const signedUrl = result.data as string;
  // 客戶端直接從R2下載
}

// 獲取公開URL（需配置CDN）
const publicUrl = storage.getPublicUrl('files/image.png');
// https://cdn.example.com/files/image.png
```

### 3. AWS S3

```bash
# .env
STORAGE_TYPE=s3
AWS_REGION=us-east-1
S3_BUCKET=my-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_PUBLIC_URL_BASE=https://cdn.example.com  # 可選CloudFront URL
```

## API文檔

### IStorage接口

```typescript
interface IStorage {
  // 存儲內容
  put(key: string, content: Buffer, options?: PutOptions): Promise<StorageResult>;

  // 讀取內容或獲取簽名URL
  get(key: string, options?: GetOptions): Promise<StorageResult<Buffer | string>>;

  // 檢查是否存在
  exists(key: string): Promise<StorageResult<boolean>>;

  // 刪除
  delete(key: string): Promise<StorageResult>;

  // 獲取元數據
  head(key: string): Promise<StorageResult<StorageObject>>;

  // 列出對象
  list(prefix?: string): Promise<StorageResult<StorageObject[]>>;

  // 獲取公開URL
  getPublicUrl(key: string): string | null;
}
```

### 選項

```typescript
interface PutOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

interface GetOptions {
  returnUrl?: boolean;   // 返回簽名URL而非內容
  expiresIn?: number;    // 簽名URL過期時間（秒）
}
```

## 高級用法

### 自定義配置

```typescript
import { createStorage } from '@sylphx/code-core/storage';

// 手動創建存儲實例
const storage = createStorage({
  type: 'r2',
  endpoint: 'https://account.r2.cloudflarestorage.com',
  region: 'auto',
  bucket: 'my-bucket',
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  publicUrlBase: 'https://cdn.example.com'
});
```

### 依賴注入（用於測試）

```typescript
import { setStorage } from '@sylphx/code-core/storage';
import { MockStorage } from './test/mock-storage';

// 使用mock storage進行測試
setStorage(new MockStorage());
```

### 列出文件

```typescript
const result = await storage.list('files/2024/');
if (result.success) {
  for (const obj of result.data!) {
    console.log(`${obj.key} - ${obj.size} bytes`);
  }
}
```

### 批量操作

```typescript
// 上傳多個文件
const uploads = files.map(file =>
  storage.put(`uploads/${file.name}`, file.buffer, {
    contentType: file.mimeType
  })
);
await Promise.all(uploads);

// 刪除前綴下所有文件
const listResult = await storage.list('temp/');
if (listResult.success) {
  const deletions = listResult.data!.map(obj =>
    storage.delete(obj.key)
  );
  await Promise.all(deletions);
}
```

## 遷移指南

### 從DB BLOB遷移到對象存儲

#### Phase 1: 雙寫（推薦）

```typescript
// 同時寫DB和對象存儲
await db.insert(fileContents).values({
  id: fileId,
  content: buffer,  // 舊格式
  storageKey: null
});

// 同時寫到對象存儲
await storage.put(`files/${sha256}.png`, buffer);
await db.update(fileContents).set({
  storageKey: `files/${sha256}.png`
}).where(eq(fileContents.id, fileId));
```

#### Phase 2: 優先讀對象存儲

```typescript
// 先嘗試從對象存儲讀取
if (record.storageKey) {
  const result = await storage.get(record.storageKey);
  if (result.success) {
    return result.data as Buffer;
  }
}

// Fallback到DB
return Buffer.from(record.content);
```

#### Phase 3: 清理DB BLOB

```typescript
// 批量遷移並清理
const records = await db.select().from(fileContents)
  .where(isNotNull(fileContents.content));

for (const record of records) {
  // 上傳到對象存儲
  await storage.put(
    `files/${record.sha256}.${ext}`,
    Buffer.from(record.content)
  );

  // 更新記錄
  await db.update(fileContents).set({
    storageKey: `files/${record.sha256}.${ext}`,
    content: null  // 清理BLOB
  }).where(eq(fileContents.id, record.id));
}
```

## 環境變量參考

### Filesystem
```bash
STORAGE_TYPE=filesystem
STORAGE_PATH=/path/to/storage  # 可選，默認 ~/.sylphx-code/storage
```

### AWS S3
```bash
STORAGE_TYPE=s3
AWS_REGION=us-east-1
S3_BUCKET=my-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_ENDPOINT=https://s3.example.com  # 可選，自定義endpoint
S3_PUBLIC_URL_BASE=https://cdn.example.com  # 可選，CDN URL
```

### Cloudflare R2
```bash
STORAGE_TYPE=r2
R2_ACCOUNT_ID=your-account-id
R2_BUCKET=my-bucket
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_ENDPOINT=https://account.r2.cloudflarestorage.com  # 自動生成
R2_PUBLIC_URL_BASE=https://cdn.example.com  # 可選，CDN URL
```

## 貢獻指南

要添加新的存儲後端：

1. 創建新文件 `src/storage/xxx-storage.ts`
2. 實現 `IStorage` 接口
3. 在 `factory.ts` 中添加對應case
4. 更新類型定義
5. 添加環境變量解析
6. 更新文檔

參考 `filesystem-storage.ts` 和 `s3-storage.ts` 作為範例。
