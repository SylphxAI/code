/**
 * Filesystem Storage Implementation
 *
 * Local file storage for development and embedded mode
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type {
	IStorage,
	StorageResult,
	StorageObject,
	FilesystemStorageConfig,
	PutOptions,
	GetOptions,
} from "./types.js";

export class FilesystemStorage implements IStorage {
	private basePath: string;

	constructor(config: FilesystemStorageConfig) {
		this.basePath = config.basePath;
	}

	/**
	 * Initialize storage (create base directory if needed)
	 */
	async initialize(): Promise<void> {
		await fs.mkdir(this.basePath, { recursive: true });
	}

	/**
	 * Resolve full path for a key
	 */
	private resolvePath(key: string): string {
		return path.join(this.basePath, key);
	}

	/**
	 * Store content at the given key
	 */
	async put(key: string, content: Buffer, options?: PutOptions): Promise<StorageResult> {
		try {
			const filePath = this.resolvePath(key);

			// Create parent directories
			await fs.mkdir(path.dirname(filePath), { recursive: true });

			// Write file
			await fs.writeFile(filePath, content);

			// Store metadata as sidecar JSON file (optional)
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
	}

	/**
	 * Retrieve content by key
	 */
	async get(key: string, options?: GetOptions): Promise<StorageResult<Buffer | string>> {
		try {
			const filePath = this.resolvePath(key);

			// Filesystem doesn't support signed URLs, always return content
			if (options?.returnUrl) {
				return {
					success: false,
					error: new Error("Filesystem storage does not support signed URLs"),
				};
			}

			const content = await fs.readFile(filePath);
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
			const filePath = this.resolvePath(key);
			await fs.access(filePath);
			return { success: true, data: true };
		} catch {
			return { success: true, data: false };
		}
	}

	/**
	 * Delete object by key
	 */
	async delete(key: string): Promise<StorageResult> {
		try {
			const filePath = this.resolvePath(key);
			await fs.unlink(filePath);

			// Also delete metadata file if exists
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
	}

	/**
	 * Get object metadata
	 */
	async head(key: string): Promise<StorageResult<StorageObject>> {
		try {
			const filePath = this.resolvePath(key);
			const stats = await fs.stat(filePath);

			// Try to read metadata file
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
	}

	/**
	 * List objects with optional prefix
	 */
	async list(prefix?: string): Promise<StorageResult<StorageObject[]>> {
		try {
			const searchPath = prefix ? this.resolvePath(prefix) : this.basePath;
			const objects: StorageObject[] = [];

			const walk = async (dir: string): Promise<void> => {
				const entries = await fs.readdir(dir, { withFileTypes: true });

				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);

					if (entry.isDirectory()) {
						await walk(fullPath);
					} else if (entry.isFile() && !entry.name.endsWith(".meta.json")) {
						const stats = await fs.stat(fullPath);
						const relativePath = path.relative(this.basePath, fullPath);

						// Try to read content type from metadata
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
	}

	/**
	 * Get public URL (not supported for filesystem)
	 */
	getPublicUrl(_key: string): string | null {
		return null;
	}
}
