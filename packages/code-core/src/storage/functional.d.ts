/**
 * Storage Abstraction Layer - Functional Style
 *
 * Pure functional implementation using:
 * - Closures instead of classes
 * - Result type for error handling
 * - Composition over inheritance
 * - Explicit dependency injection
 */
import type { AnyStorageConfig, FilesystemStorageConfig, GetOptions, PutOptions, S3StorageConfig, StorageObject, StorageResult } from "./types.js";
/**
 * Storage operations as pure functions
 * All operations return Result type - never throw
 */
export type StorageOps = {
    readonly put: (key: string, content: Buffer, options?: PutOptions) => Promise<StorageResult>;
    readonly get: (key: string, options?: GetOptions) => Promise<StorageResult<Buffer | string>>;
    readonly exists: (key: string) => Promise<StorageResult<boolean>>;
    readonly delete: (key: string) => Promise<StorageResult>;
    readonly head: (key: string) => Promise<StorageResult<StorageObject>>;
    readonly list: (prefix?: string) => Promise<StorageResult<StorageObject[]>>;
    readonly getPublicUrl: (key: string) => string | null;
};
/**
 * Create filesystem storage operations
 * Pure function returning operations bound to config
 */
export declare const createFilesystemOps: (config: FilesystemStorageConfig) => StorageOps;
/**
 * Create S3 storage operations with lazy SDK loading
 * Uses closure to maintain SDK client reference
 */
export declare const createS3Ops: (config: S3StorageConfig) => StorageOps;
/**
 * Create storage operations from config
 * Pure function - returns operations bound to config via closure
 */
export declare const createStorageOps: (config: AnyStorageConfig) => StorageOps;
type EnvReader = (key: string) => string | undefined;
/**
 * Get storage configuration from environment variables
 * Pure function with dependency injection (env reader can be mocked for testing)
 */
export declare const getStorageConfigFromEnv: (env?: EnvReader) => AnyStorageConfig;
/**
 * Compose storage operations with logging
 */
export declare const withLogging: (ops: StorageOps, logger: (msg: string) => void) => StorageOps;
/**
 * Compose storage operations with retry logic
 */
export declare const withRetry: (ops: StorageOps, maxRetries?: number, delayMs?: number) => StorageOps;
/**
 * Compose storage operations with caching
 */
export declare const withCache: (ops: StorageOps, cache: Map<string, {
    data: Buffer;
    expiresAt: number;
}>, ttlMs?: number) => StorageOps;
export {};
//# sourceMappingURL=functional.d.ts.map