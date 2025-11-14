/**
 * Storage Abstraction Layer
 *
 * Unified interface for file storage across different backends
 */

export type {
	IStorage,
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

export { FilesystemStorage } from "./filesystem-storage.js";
export { S3Storage } from "./s3-storage.js";
export { createStorage, getStorage, setStorage, resetStorage, getStorageConfigFromEnv } from "./factory.js";
