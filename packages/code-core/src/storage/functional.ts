/**
 * Storage Abstraction Layer - Functional Style
 *
 * Pure functional implementation using:
 * - Closures instead of classes
 * - Result type for error handling
 * - Composition over inheritance
 * - Explicit dependency injection
 */

import type {
	StorageResult,
	StorageObject,
	AnyStorageConfig,
	FilesystemStorageConfig,
	S3StorageConfig,
	PutOptions,
	GetOptions,
} from "./types.js";

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
 * Storage context for dependency injection
 * Contains config and any runtime dependencies
 */
type StorageContext<TConfig extends AnyStorageConfig = AnyStorageConfig> = {
	readonly config: TConfig;
	readonly runtime?: {
		readonly s3Client?: any; // Lazy-loaded AWS SDK client
	};
};

// ============================================================================
// Filesystem Implementation
// ============================================================================

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Create filesystem storage operations
 * Pure function returning operations bound to config
 */
export const createFilesystemOps = (config: FilesystemStorageConfig): StorageOps => {
	const resolvePath = (key: string): string => path.join(config.basePath, key);

	const put = async (key: string, content: Buffer, options?: PutOptions): Promise<StorageResult> => {
		try {
			const filePath = resolvePath(key);
			await fs.mkdir(path.dirname(filePath), { recursive: true });
			await fs.writeFile(filePath, content);

			if (options?.contentType || options?.metadata) {
				const metadataPath = `${filePath}.meta.json`;
				await fs.writeFile(
					metadataPath,
					JSON.stringify({
						contentType: options.contentType,
						metadata: options.metadata,
						storedAt: new Date().toISOString(),
					}),
				);
			}

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const get = async (
		key: string,
		options?: GetOptions,
	): Promise<StorageResult<Buffer | string>> => {
		try {
			if (options?.returnUrl) {
				return {
					success: false,
					error: new Error("Filesystem storage does not support signed URLs"),
				};
			}

			const filePath = resolvePath(key);
			const content = await fs.readFile(filePath);
			return { success: true, data: content };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const exists = async (key: string): Promise<StorageResult<boolean>> => {
		try {
			const filePath = resolvePath(key);
			await fs.access(filePath);
			return { success: true, data: true };
		} catch {
			return { success: true, data: false };
		}
	};

	const deleteOp = async (key: string): Promise<StorageResult> => {
		try {
			const filePath = resolvePath(key);
			await fs.unlink(filePath);

			try {
				await fs.unlink(`${filePath}.meta.json`);
			} catch {
				// Ignore if metadata doesn't exist
			}

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const head = async (key: string): Promise<StorageResult<StorageObject>> => {
		try {
			const filePath = resolvePath(key);
			const stats = await fs.stat(filePath);

			let contentType = "application/octet-stream";
			let customMetadata: Record<string, string> | undefined;

			try {
				const metadataContent = await fs.readFile(`${filePath}.meta.json`, "utf-8");
				const metadata = JSON.parse(metadataContent);
				contentType = metadata.contentType || contentType;
				customMetadata = metadata.metadata;
			} catch {
				// No metadata file
			}

			return {
				success: true,
				data: {
					key,
					size: stats.size,
					contentType,
					lastModified: stats.mtime,
					customMetadata,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const list = async (prefix?: string): Promise<StorageResult<StorageObject[]>> => {
		try {
			const searchPath = prefix ? resolvePath(prefix) : config.basePath;
			const objects: StorageObject[] = [];

			const walk = async (dir: string): Promise<void> => {
				const entries = await fs.readdir(dir, { withFileTypes: true });

				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);

					if (entry.isDirectory()) {
						await walk(fullPath);
					} else if (entry.isFile() && !entry.name.endsWith(".meta.json")) {
						const stats = await fs.stat(fullPath);
						const relativePath = path.relative(config.basePath, fullPath);

						let contentType = "application/octet-stream";
						try {
							const metadataContent = await fs.readFile(`${fullPath}.meta.json`, "utf-8");
							const metadata = JSON.parse(metadataContent);
							contentType = metadata.contentType || contentType;
						} catch {
							// No metadata
						}

						objects.push({
							key: relativePath,
							size: stats.size,
							contentType,
							lastModified: stats.mtime,
						});
					}
				}
			};

			await walk(searchPath);
			return { success: true, data: objects };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const getPublicUrl = (_key: string): string | null => null;

	return {
		put,
		get,
		exists,
		delete: deleteOp,
		head,
		list,
		getPublicUrl,
	};
};

// ============================================================================
// S3 Implementation
// ============================================================================

/**
 * Create S3 storage operations with lazy SDK loading
 * Uses closure to maintain SDK client reference
 */
export const createS3Ops = (config: S3StorageConfig): StorageOps => {
	// Mutable cell for lazy-loaded client (encapsulated in closure)
	let clientCache: any = null;

	const getClient = async (): Promise<any> => {
		if (clientCache) return clientCache;

		try {
			const { S3Client } = await import("@aws-sdk/client-s3");
			clientCache = new S3Client({
				region: config.region,
				endpoint: config.endpoint,
				credentials: {
					accessKeyId: config.accessKeyId,
					secretAccessKey: config.secretAccessKey,
				},
			});
			return clientCache;
		} catch (error) {
			throw new Error("Failed to load @aws-sdk/client-s3. Install it with: npm install @aws-sdk/client-s3");
		}
	};

	const put = async (key: string, content: Buffer, options?: PutOptions): Promise<StorageResult> => {
		try {
			const client = await getClient();
			const { PutObjectCommand } = await import("@aws-sdk/client-s3");

			await client.send(
				new PutObjectCommand({
					Bucket: config.bucket,
					Key: key,
					Body: content,
					ContentType: options?.contentType,
					CacheControl: options?.cacheControl,
					Metadata: options?.metadata,
				}),
			);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const get = async (
		key: string,
		options?: GetOptions,
	): Promise<StorageResult<Buffer | string>> => {
		try {
			const client = await getClient();

			if (options?.returnUrl) {
				const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
				const { GetObjectCommand } = await import("@aws-sdk/client-s3");

				const command = new GetObjectCommand({
					Bucket: config.bucket,
					Key: key,
				});

				const url = await getSignedUrl(client, command, {
					expiresIn: options.expiresIn || 3600,
				});

				return { success: true, data: url };
			}

			const { GetObjectCommand } = await import("@aws-sdk/client-s3");
			const response = await client.send(
				new GetObjectCommand({
					Bucket: config.bucket,
					Key: key,
				}),
			);

			const chunks: Buffer[] = [];
			for await (const chunk of response.Body as any) {
				chunks.push(chunk);
			}
			const content = Buffer.concat(chunks);

			return { success: true, data: content };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const exists = async (key: string): Promise<StorageResult<boolean>> => {
		try {
			const client = await getClient();
			const { HeadObjectCommand } = await import("@aws-sdk/client-s3");

			await client.send(
				new HeadObjectCommand({
					Bucket: config.bucket,
					Key: key,
				}),
			);

			return { success: true, data: true };
		} catch (error: any) {
			if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
				return { success: true, data: false };
			}

			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const deleteOp = async (key: string): Promise<StorageResult> => {
		try {
			const client = await getClient();
			const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

			await client.send(
				new DeleteObjectCommand({
					Bucket: config.bucket,
					Key: key,
				}),
			);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const head = async (key: string): Promise<StorageResult<StorageObject>> => {
		try {
			const client = await getClient();
			const { HeadObjectCommand } = await import("@aws-sdk/client-s3");

			const response = await client.send(
				new HeadObjectCommand({
					Bucket: config.bucket,
					Key: key,
				}),
			);

			return {
				success: true,
				data: {
					key,
					size: response.ContentLength || 0,
					contentType: response.ContentType || "application/octet-stream",
					etag: response.ETag,
					lastModified: response.LastModified,
					customMetadata: response.Metadata,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const list = async (prefix?: string): Promise<StorageResult<StorageObject[]>> => {
		try {
			const client = await getClient();
			const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");

			const objects: StorageObject[] = [];
			let continuationToken: string | undefined;

			do {
				const response = await client.send(
					new ListObjectsV2Command({
						Bucket: config.bucket,
						Prefix: prefix,
						ContinuationToken: continuationToken,
					}),
				);

				if (response.Contents) {
					for (const item of response.Contents) {
						if (item.Key) {
							objects.push({
								key: item.Key,
								size: item.Size || 0,
								contentType: "application/octet-stream",
								etag: item.ETag,
								lastModified: item.LastModified,
							});
						}
					}
				}

				continuationToken = response.NextContinuationToken;
			} while (continuationToken);

			return { success: true, data: objects };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};

	const getPublicUrl = (key: string): string | null => {
		if (config.publicUrlBase) {
			return `${config.publicUrlBase}/${key}`;
		}

		const endpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`;
		return `${endpoint}/${config.bucket}/${key}`;
	};

	return {
		put,
		get,
		exists,
		delete: deleteOp,
		head,
		list,
		getPublicUrl,
	};
};

// ============================================================================
// Factory
// ============================================================================

/**
 * Create storage operations from config
 * Pure function - returns operations bound to config via closure
 */
export const createStorageOps = (config: AnyStorageConfig): StorageOps => {
	switch (config.type) {
		case "filesystem":
			return createFilesystemOps(config);

		case "s3":
		case "r2":
			return createS3Ops(config);

		case "gcs":
			throw new Error("GCS storage not yet implemented");

		case "vercel-blob":
			throw new Error("Vercel Blob storage not yet implemented");

		case "supabase":
			throw new Error("Supabase storage not yet implemented");

		default:
			const _exhaustive: never = config;
			throw new Error(`Unknown storage type: ${(_exhaustive as any).type}`);
	}
};

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Get storage configuration from environment variables
 * Pure function that reads from process.env
 */
export const getStorageConfigFromEnv = (): AnyStorageConfig => {
	const storageType = process.env.STORAGE_TYPE || "filesystem";

	switch (storageType) {
		case "filesystem":
			return {
				type: "filesystem",
				basePath: process.env.STORAGE_PATH || `${process.env.HOME}/.sylphx-code/storage`,
			};

		case "s3":
			if (!process.env.S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
				throw new Error("S3 storage requires: S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY");
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
				throw new Error("R2 storage requires: R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
			}
			return {
				type: "r2",
				region: "auto",
				bucket: process.env.R2_BUCKET,
				accessKeyId: process.env.R2_ACCESS_KEY_ID,
				secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
				endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
				publicUrlBase: process.env.R2_PUBLIC_URL_BASE,
			};

		default:
			throw new Error(`Unknown STORAGE_TYPE: ${storageType}`);
	}
};

// ============================================================================
// Composition Helpers
// ============================================================================

/**
 * Compose storage operations with logging
 */
export const withLogging = (ops: StorageOps, logger: (msg: string) => void): StorageOps => ({
	put: async (key, content, options) => {
		logger(`[Storage] PUT ${key} (${content.length} bytes)`);
		const result = await ops.put(key, content, options);
		logger(`[Storage] PUT ${key} -> ${result.success ? "OK" : "FAIL"}`);
		return result;
	},
	get: async (key, options) => {
		logger(`[Storage] GET ${key}`);
		const result = await ops.get(key, options);
		logger(`[Storage] GET ${key} -> ${result.success ? "OK" : "FAIL"}`);
		return result;
	},
	exists: async (key) => {
		logger(`[Storage] EXISTS ${key}`);
		const result = await ops.exists(key);
		logger(`[Storage] EXISTS ${key} -> ${result.data}`);
		return result;
	},
	delete: async (key) => {
		logger(`[Storage] DELETE ${key}`);
		const result = await ops.delete(key);
		logger(`[Storage] DELETE ${key} -> ${result.success ? "OK" : "FAIL"}`);
		return result;
	},
	head: ops.head,
	list: ops.list,
	getPublicUrl: ops.getPublicUrl,
});

/**
 * Compose storage operations with retry logic
 */
export const withRetry = (
	ops: StorageOps,
	maxRetries = 3,
	delayMs = 1000,
): StorageOps => {
	const retry = async <T>(
		fn: () => Promise<StorageResult<T>>,
		attempt = 0,
	): Promise<StorageResult<T>> => {
		const result = await fn();

		if (!result.success && attempt < maxRetries) {
			await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
			return retry(fn, attempt + 1);
		}

		return result;
	};

	return {
		put: (key, content, options) => retry(() => ops.put(key, content, options)),
		get: (key, options) => retry(() => ops.get(key, options)),
		exists: (key) => retry(() => ops.exists(key)),
		delete: (key) => retry(() => ops.delete(key)),
		head: (key) => retry(() => ops.head(key)),
		list: (prefix) => retry(() => ops.list(prefix)),
		getPublicUrl: ops.getPublicUrl,
	};
};

/**
 * Compose storage operations with caching
 */
export const withCache = (
	ops: StorageOps,
	cache: Map<string, { data: Buffer; expiresAt: number }>,
	ttlMs = 60000,
): StorageOps => ({
	put: async (key, content, options) => {
		const result = await ops.put(key, content, options);
		if (result.success) {
			cache.set(key, { data: content, expiresAt: Date.now() + ttlMs });
		}
		return result;
	},
	get: async (key, options) => {
		// Only cache Buffer results, not URLs
		if (!options?.returnUrl) {
			const cached = cache.get(key);
			if (cached && cached.expiresAt > Date.now()) {
				return { success: true, data: cached.data };
			}
		}

		const result = await ops.get(key, options);
		if (result.success && !options?.returnUrl && Buffer.isBuffer(result.data)) {
			cache.set(key, { data: result.data, expiresAt: Date.now() + ttlMs });
		}
		return result;
	},
	exists: ops.exists,
	delete: async (key) => {
		cache.delete(key);
		return await ops.delete(key);
	},
	head: ops.head,
	list: ops.list,
	getPublicUrl: ops.getPublicUrl,
});
