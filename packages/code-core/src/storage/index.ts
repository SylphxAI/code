/**
 * Storage Abstraction Layer - Pure Functional Style
 *
 * Unified interface for file storage across different backends
 * Using pure functions, closures, and function composition
 */

export type {
	StorageResult,
	StorageObject,
	StorageConfig,
	FilesystemStorageConfig,
	S3StorageConfig,
	GCSStorageConfig,
	VercelBlobStorageConfig,
	SupabaseStorageConfig,
	AnyStorageConfig,
	PutOptions,
	GetOptions,
} from "./types.js";

export type { StorageOps } from "./functional.js";
export {
	createStorageOps,
	createFilesystemOps,
	createS3Ops,
	getStorageConfigFromEnv,
	withLogging,
	withRetry,
	withCache,
} from "./functional.js";
