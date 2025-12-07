/**
 * Storage Abstraction Layer - Pure Functional Style
 *
 * Unified interface for file storage across different backends
 * Using pure functions, closures, and function composition
 */
export type { StorageOps } from "./functional.js";
export { createFilesystemOps, createS3Ops, createStorageOps, getStorageConfigFromEnv, withCache, withLogging, withRetry, } from "./functional.js";
export type { AnyStorageConfig, FilesystemStorageConfig, GCSStorageConfig, GetOptions, PutOptions, S3StorageConfig, StorageConfig, StorageObject, StorageResult, SupabaseStorageConfig, VercelBlobStorageConfig, } from "./types.js";
//# sourceMappingURL=index.d.ts.map