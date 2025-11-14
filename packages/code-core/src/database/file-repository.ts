/**
 * File Repository
 * Database operations for frozen file content
 *
 * Design: Hybrid storage for conversation history
 * - Local/embedded: Files stored as BLOB in file_contents table
 * - Cloud/serverless: Files stored in object storage (S3/R2), storageKey in DB
 * - Immutable (never changes - preserves prompt cache)
 * - Searchable (FTS5 on text content)
 * - Supports rewind/checkpoint restore
 */

import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { fileContents } from "./schema.js";
import type { StorageOps } from "../storage/functional.js";

export interface FileContentInput {
	stepId: string;
	ordering: number;
	relativePath: string;
	mediaType: string;
	content: Buffer; // Binary content
}

export interface FileContentRecord {
	id: string;
	stepId: string;
	ordering: number;
	relativePath: string;
	mediaType: string;
	size: number;
	content: Buffer;
	isText: boolean;
	textContent: string | null;
	sha256: string;
	createdAt: number;
}

export class FileRepository {
	constructor(
		private db: LibSQLDatabase,
		private storage?: StorageOps,
	) {}

	/**
	 * Store file content (hybrid: DB BLOB or cloud storage)
	 * Returns fileContentId for creating file-ref MessagePart
	 *
	 * Storage mode:
	 * - If storage provided → store in cloud, save storageKey in DB
	 * - If no storage → store in DB BLOB (embedded/local mode)
	 *
	 * @param input File content to store
	 * @param tx Optional transaction context (if called within a transaction)
	 */
	async storeFileContent(input: FileContentInput, tx?: any): Promise<string> {
		const fileId = randomUUID();
		const now = Date.now();

		// Calculate SHA256 for deduplication (future optimization)
		const sha256 = createHash("sha256").update(input.content).digest("hex");

		// Determine if text file and extract content for FTS5
		const isTextFile = this.isTextMediaType(input.mediaType);
		let textContent: string | null = null;

		if (isTextFile) {
			try {
				textContent = input.content.toString("utf-8");
			} catch {
				// If UTF-8 decode fails, treat as binary
				console.warn(`[FileRepository] Failed to decode ${input.relativePath} as UTF-8`);
			}
		}

		// Use transaction if provided, otherwise use db instance
		const dbOrTx = tx || this.db;

		// Determine storage mode and store file
		let storageKey: string | null = null;
		let content: Buffer | null = input.content;

		if (this.storage) {
			// Cloud storage mode: Upload to object storage
			storageKey = `files/${sha256}${this.getExtension(input.relativePath)}`;
			const putResult = await this.storage.put(storageKey, input.content, {
				contentType: input.mediaType,
				metadata: {
					stepId: input.stepId,
					relativePath: input.relativePath,
				},
			});

			if (!putResult.success) {
				throw putResult.error || new Error("Failed to upload file to storage");
			}

			// Don't store in DB BLOB when using cloud storage
			content = null;
		}

		await dbOrTx.insert(fileContents).values({
			id: fileId,
			stepId: input.stepId,
			ordering: input.ordering,
			relativePath: input.relativePath,
			mediaType: input.mediaType,
			size: input.content.length,
			content, // null for cloud storage, Buffer for DB BLOB
			storageKey, // non-null for cloud storage, null for DB BLOB
			isText: isTextFile ? 1 : 0,
			textContent,
			sha256,
			createdAt: now,
		});

		return fileId;
	}

	/**
	 * Get file content by ID (hybrid: from DB BLOB or cloud storage)
	 */
	async getFileContent(fileId: string): Promise<FileContentRecord | null> {
		const [record] = await this.db
			.select()
			.from(fileContents)
			.where(eq(fileContents.id, fileId))
			.limit(1);

		if (!record) {
			return null;
		}

		let content: Buffer;

		if (record.storageKey && this.storage) {
			// Cloud storage mode: Fetch from object storage
			const getResult = await this.storage.get(record.storageKey);

			if (!getResult.success || !getResult.data) {
				throw getResult.error || new Error(`Failed to fetch file from storage: ${record.storageKey}`);
			}

			content = getResult.data as Buffer;
		} else if (record.content) {
			// DB BLOB mode: Convert Uint8Array to Buffer
			content = Buffer.isBuffer(record.content)
				? record.content
				: Buffer.from(record.content as Uint8Array);
		} else {
			throw new Error(`File ${fileId} has neither content nor storageKey`);
		}

		return {
			...record,
			isText: record.isText === 1,
			content,
		};
	}

	/**
	 * Get all files for a step (for message display)
	 */
	async getStepFiles(stepId: string): Promise<FileContentRecord[]> {
		const records = await this.db
			.select()
			.from(fileContents)
			.where(eq(fileContents.stepId, stepId))
			.orderBy(fileContents.ordering);

		// Fetch content for each record (from DB BLOB or cloud storage)
		return Promise.all(
			records.map(async (r) => {
				let content: Buffer;

				if (r.storageKey && this.storage) {
					// Cloud storage mode: Fetch from object storage
					const getResult = await this.storage.get(r.storageKey);

					if (!getResult.success || !getResult.data) {
						throw getResult.error || new Error(`Failed to fetch file from storage: ${r.storageKey}`);
					}

					content = getResult.data as Buffer;
				} else if (r.content) {
					// DB BLOB mode: Convert Uint8Array to Buffer
					content = Buffer.isBuffer(r.content) ? r.content : Buffer.from(r.content as Uint8Array);
				} else {
					throw new Error(`File ${r.id} has neither content nor storageKey`);
				}

				return {
					...r,
					isText: r.isText === 1,
					content,
				};
			}),
		);
	}

	/**
	 * Get file extension from path
	 */
	private getExtension(path: string): string {
		const match = path.match(/\.[^.]+$/);
		return match ? match[0] : "";
	}

	/**
	 * Check if media type is text
	 * Used to determine whether to extract text_content for FTS5
	 */
	private isTextMediaType(mediaType: string): boolean {
		const textTypes = [
			"text/",
			"application/json",
			"application/javascript",
			"application/typescript",
			"application/xml",
			"application/x-yaml",
		];

		return textTypes.some((prefix) => mediaType.startsWith(prefix));
	}

	/**
	 * Search file content across all conversations
	 * Uses FTS5 for full-text search on text files
	 *
	 * NOTE: Requires FTS5 virtual table setup (future migration)
	 */
	async searchFileContent(
		query: string,
		limit = 50,
	): Promise<
		Array<{
			fileId: string;
			relativePath: string;
			textContent: string;
			stepId: string;
		}>
	> {
		// TODO: Implement FTS5 search when virtual table is created
		// For now, use LIKE query (slower but works)
		const results = await this.db
			.select({
				fileId: fileContents.id,
				relativePath: fileContents.relativePath,
				textContent: fileContents.textContent,
				stepId: fileContents.stepId,
			})
			.from(fileContents)
			.where(eq(fileContents.isText, 1))
			.limit(limit);

		// Filter in memory for now
		return results.filter((r) => r.textContent?.toLowerCase().includes(query.toLowerCase()));
	}
}
