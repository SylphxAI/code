/**
 * S3-Compatible Storage Implementation
 *
 * Works with:
 * - AWS S3
 * - Cloudflare R2
 * - MinIO
 * - DigitalOcean Spaces
 * - Any S3-compatible service
 */

import type {
	IStorage,
	StorageResult,
	StorageObject,
	S3StorageConfig,
	PutOptions,
	GetOptions,
} from "./types.js";

// Type-only import - actual SDK loaded dynamically
type S3Client = any;
type PutObjectCommand = any;
type GetObjectCommand = any;
type HeadObjectCommand = any;
type DeleteObjectCommand = any;
type ListObjectsV2Command = any;
type GetObjectCommandOutput = any;

export class S3Storage implements IStorage {
	private client: S3Client | null = null;
	private config: S3StorageConfig;
	private initialized = false;

	constructor(config: S3StorageConfig) {
		this.config = config;
	}

	/**
	 * Lazy load AWS SDK to avoid bundling in filesystem mode
	 */
	private async getClient(): Promise<S3Client> {
		if (this.client) return this.client;

		try {
			// Dynamic import - only loads when S3 storage is actually used
			const { S3Client } = await import("@aws-sdk/client-s3");

			this.client = new S3Client({
				region: this.config.region,
				endpoint: this.config.endpoint,
				credentials: {
					accessKeyId: this.config.accessKeyId,
					secretAccessKey: this.config.secretAccessKey,
				},
			});

			return this.client;
		} catch (error) {
			throw new Error(
				"Failed to load @aws-sdk/client-s3. Install it with: npm install @aws-sdk/client-s3",
			);
		}
	}

	/**
	 * Initialize storage (verify bucket exists)
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		const client = await this.getClient();

		// Verify bucket exists by attempting to list objects
		try {
			const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
			await client.send(
				new ListObjectsV2Command({
					Bucket: this.config.bucket,
					MaxKeys: 1,
				}),
			);
			this.initialized = true;
		} catch (error) {
			throw new Error(
				`Failed to access bucket ${this.config.bucket}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Store content at the given key
	 */
	async put(key: string, content: Buffer, options?: PutOptions): Promise<StorageResult> {
		try {
			const client = await this.getClient();
			const { PutObjectCommand } = await import("@aws-sdk/client-s3");

			await client.send(
				new PutObjectCommand({
					Bucket: this.config.bucket,
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
	}

	/**
	 * Retrieve content by key or get signed URL
	 */
	async get(key: string, options?: GetOptions): Promise<StorageResult<Buffer | string>> {
		try {
			const client = await this.getClient();

			// Return signed URL if requested
			if (options?.returnUrl) {
				const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
				const { GetObjectCommand } = await import("@aws-sdk/client-s3");

				const command = new GetObjectCommand({
					Bucket: this.config.bucket,
					Key: key,
				});

				const url = await getSignedUrl(client, command, {
					expiresIn: options.expiresIn || 3600, // Default 1 hour
				});

				return { success: true, data: url };
			}

			// Return content
			const { GetObjectCommand } = await import("@aws-sdk/client-s3");
			const response: GetObjectCommandOutput = await client.send(
				new GetObjectCommand({
					Bucket: this.config.bucket,
					Key: key,
				}),
			);

			// Convert stream to buffer
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
	}

	/**
	 * Check if object exists
	 */
	async exists(key: string): Promise<StorageResult<boolean>> {
		try {
			const client = await this.getClient();
			const { HeadObjectCommand } = await import("@aws-sdk/client-s3");

			await client.send(
				new HeadObjectCommand({
					Bucket: this.config.bucket,
					Key: key,
				}),
			);

			return { success: true, data: true };
		} catch (error: any) {
			// NotFound error means object doesn't exist
			if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
				return { success: true, data: false };
			}

			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	}

	/**
	 * Delete object by key
	 */
	async delete(key: string): Promise<StorageResult> {
		try {
			const client = await this.getClient();
			const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

			await client.send(
				new DeleteObjectCommand({
					Bucket: this.config.bucket,
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
	}

	/**
	 * Get object metadata
	 */
	async head(key: string): Promise<StorageResult<StorageObject>> {
		try {
			const client = await this.getClient();
			const { HeadObjectCommand } = await import("@aws-sdk/client-s3");

			const response = await client.send(
				new HeadObjectCommand({
					Bucket: this.config.bucket,
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
	}

	/**
	 * List objects with optional prefix
	 */
	async list(prefix?: string): Promise<StorageResult<StorageObject[]>> {
		try {
			const client = await this.getClient();
			const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");

			const objects: StorageObject[] = [];
			let continuationToken: string | undefined;

			do {
				const response = await client.send(
					new ListObjectsV2Command({
						Bucket: this.config.bucket,
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
								contentType: "application/octet-stream", // S3 list doesn't return content type
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
	}

	/**
	 * Get public URL for object
	 * Returns CDN URL if configured, otherwise S3 URL
	 */
	getPublicUrl(key: string): string | null {
		if (this.config.publicUrlBase) {
			return `${this.config.publicUrlBase}/${key}`;
		}

		// Return standard S3 URL
		const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`;
		return `${endpoint}/${this.config.bucket}/${key}`;
	}
}
