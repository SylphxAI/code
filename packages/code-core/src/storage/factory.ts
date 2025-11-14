/**
 * Storage Factory
 *
 * Creates storage instances based on configuration
 * Supports multiple storage backends with automatic selection
 */

import type { IStorage, AnyStorageConfig } from "./types.js";
import { FilesystemStorage } from "./filesystem-storage.js";
import { S3Storage } from "./s3-storage.js";

/**
 * Create storage instance from configuration
 *
 * @example
 * ```typescript
 * // Filesystem storage (local development)
 * const storage = createStorage({
 *   type: 'filesystem',
 *   basePath: '~/.sylphx-code/storage'
 * });
 *
 * // S3 storage (AWS)
 * const storage = createStorage({
 *   type: 's3',
 *   region: 'us-east-1',
 *   bucket: 'my-bucket',
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
 * });
 *
 * // R2 storage (Cloudflare)
 * const storage = createStorage({
 *   type: 'r2',
 *   endpoint: 'https://account.r2.cloudflarestorage.com',
 *   region: 'auto',
 *   bucket: 'my-bucket',
 *   accessKeyId: process.env.R2_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
 *   publicUrlBase: 'https://cdn.example.com'
 * });
 * ```
 */
export function createStorage(config: AnyStorageConfig): IStorage {
	switch (config.type) {
		case "filesystem":
			return new FilesystemStorage(config);

		case "s3":
		case "r2":
			return new S3Storage(config);

		case "gcs":
			throw new Error("GCS storage not yet implemented. Use S3-compatible mode or contribute!");

		case "vercel-blob":
			throw new Error(
				"Vercel Blob storage not yet implemented. Use S3-compatible mode or contribute!",
			);

		case "supabase":
			throw new Error(
				"Supabase storage not yet implemented. Use S3-compatible mode or contribute!",
			);

		default:
			// TypeScript exhaustiveness check
			const _exhaustive: never = config;
			throw new Error(`Unknown storage type: ${(_exhaustive as any).type}`);
	}
}

/**
 * Get storage configuration from environment variables
 *
 * Supports multiple config sources:
 * 1. Environment variables
 * 2. Config file
 * 3. Runtime config
 *
 * Priority: Runtime > Env > Config file > Default
 */
export function getStorageConfigFromEnv(): AnyStorageConfig {
	const storageType = process.env.STORAGE_TYPE || "filesystem";

	switch (storageType) {
		case "filesystem":
			return {
				type: "filesystem",
				basePath: process.env.STORAGE_PATH || `${process.env.HOME}/.sylphx-code/storage`,
			};

		case "s3":
			if (!process.env.S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
				throw new Error(
					"S3 storage requires: S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY",
				);
			}
			return {
				type: "s3",
				region: process.env.AWS_REGION || "us-east-1",
				bucket: process.env.S3_BUCKET,
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
				endpoint: process.env.S3_ENDPOINT,
				publicUrlBase: process.env.S3_PUBLIC_URL_BASE,
			};

		case "r2":
			if (!process.env.R2_BUCKET || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
				throw new Error(
					"R2 storage requires: R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY",
				);
			}
			return {
				type: "r2",
				region: "auto", // R2 uses 'auto' region
				bucket: process.env.R2_BUCKET,
				accessKeyId: process.env.R2_ACCESS_KEY_ID,
				secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
				endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
				publicUrlBase: process.env.R2_PUBLIC_URL_BASE,
			};

		default:
			throw new Error(`Unknown STORAGE_TYPE: ${storageType}`);
	}
}

/**
 * Singleton storage instance
 * Lazy-initialized on first use
 */
let _globalStorage: IStorage | null = null;

/**
 * Get global storage instance
 * Auto-configures from environment on first call
 */
export function getStorage(): IStorage {
	if (!_globalStorage) {
		const config = getStorageConfigFromEnv();
		_globalStorage = createStorage(config);
	}
	return _globalStorage;
}

/**
 * Set global storage instance
 * Useful for testing or custom configurations
 */
export function setStorage(storage: IStorage): void {
	_globalStorage = storage;
}

/**
 * Reset global storage instance
 * Useful for testing
 */
export function resetStorage(): void {
	_globalStorage = null;
}
