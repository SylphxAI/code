/**
 * Storage Abstraction Layer
 *
 * Unified interface for different storage backends:
 * - Local filesystem (development/embedded)
 * - Cloud object storage (production/serverless)
 */

/**
 * Storage operation result
 */
export interface StorageResult<T = void> {
	success: boolean;
	data?: T;
	error?: Error;
}

/**
 * Stored object metadata
 */
export interface StorageObject {
	key: string;
	size: number;
	contentType: string;
	etag?: string;
	lastModified?: Date;
	customMetadata?: Record<string, string>;
}

/**
 * Storage configuration base
 */
export interface StorageConfig {
	type: "filesystem" | "s3" | "r2" | "gcs" | "vercel-blob" | "supabase";
}

/**
 * Filesystem storage config
 */
export interface FilesystemStorageConfig extends StorageConfig {
	type: "filesystem";
	basePath: string; // e.g., ~/.sylphx-code/storage
}

/**
 * S3-compatible storage config (S3, R2, MinIO, etc.)
 */
export interface S3StorageConfig extends StorageConfig {
	type: "s3" | "r2";
	endpoint?: string; // Optional custom endpoint
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	publicUrlBase?: string; // CDN URL
}

/**
 * GCS storage config
 */
export interface GCSStorageConfig extends StorageConfig {
	type: "gcs";
	projectId: string;
	bucket: string;
	keyFilename?: string; // Service account key
	publicUrlBase?: string;
}

/**
 * Vercel Blob storage config
 */
export interface VercelBlobStorageConfig extends StorageConfig {
	type: "vercel-blob";
	token: string;
}

/**
 * Supabase storage config
 */
export interface SupabaseStorageConfig extends StorageConfig {
	type: "supabase";
	url: string;
	apiKey: string;
	bucket: string;
}

/**
 * Union of all storage configs
 */
export type AnyStorageConfig =
	| FilesystemStorageConfig
	| S3StorageConfig
	| GCSStorageConfig
	| VercelBlobStorageConfig
	| SupabaseStorageConfig;

/**
 * Options for put operation
 */
export interface PutOptions {
	contentType?: string;
	cacheControl?: string;
	metadata?: Record<string, string>;
}

/**
 * Options for get operation
 */
export interface GetOptions {
	returnUrl?: boolean; // Return signed URL instead of content
	expiresIn?: number; // Expiration in seconds for signed URL
}
