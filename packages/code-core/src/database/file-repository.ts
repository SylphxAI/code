/**
 * File Repository
 * Database operations for frozen file content
 *
 * Design: Object storage for conversation history
 * - Files stored in object storage (filesystem or cloud S3/R2)
 * - DB stores metadata + storageKey
 * - Immutable (never changes - preserves prompt cache)
 * - Searchable (FTS5 on text content)
 * - Supports rewind/checkpoint restore
 */

import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { StorageOps } from "../storage/functional.js";
import { fileContents } from "./schema.js";

export interface FileContentInput {
	stepId: string | null; // Null for orphaned uploads (ChatGPT-style immediate upload)
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
		private storage: StorageOps,
	) {}

	/**
	 * Store file content in object storage
	 * Returns fileContentId for creating file-ref MessagePart
	 *
	 * @param input File content to store
	 * @param tx Optional transaction context (if called within a transaction)
	 */
	async storeFileContent(input: FileContentInput, tx?: LibSQLDatabase): Promise<string> {
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

		// Upload to object storage
		const storageKey = `files/${sha256}${this.getExtension(input.relativePath)}`;
		const metadata: Record<string, string> = {
			relativePath: input.relativePath,
		};
		if (input.stepId) {
			metadata.stepId = input.stepId;
		}
		const putResult = await this.storage.put(storageKey, input.content, {
			contentType: input.mediaType,
			metadata,
		});

		if (!putResult.success) {
			throw putResult.error || new Error("Failed to upload file to storage");
		}

		// Store metadata in DB
		const dbOrTx = tx || this.db;
		await dbOrTx.insert(fileContents).values({
			id: fileId,
			...(input.stepId ? { stepId: input.stepId } : {}), // Omit stepId if null/undefined (orphaned upload)
			ordering: input.ordering,
			relativePath: input.relativePath,
			mediaType: input.mediaType,
			size: input.content.length,
			storageKey,
			isText: isTextFile ? 1 : 0,
			textContent,
			sha256,
			createdAt: now,
		});

		return fileId;
	}

	/**
	 * Get file content by ID from object storage
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

		// Fetch from object storage
		const getResult = await this.storage.get(record.storageKey);

		if (!getResult.success || !getResult.data) {
			throw getResult.error || new Error(`Failed to fetch file from storage: ${record.storageKey}`);
		}

		return {
			...record,
			isText: record.isText === 1,
			content: getResult.data as Buffer,
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

		// Fetch content from object storage
		return Promise.all(
			records.map(async (r) => {
				const getResult = await this.storage.get(r.storageKey);

				if (!getResult.success || !getResult.data) {
					throw getResult.error || new Error(`Failed to fetch file from storage: ${r.storageKey}`);
				}

				return {
					...r,
					isText: r.isText === 1,
					content: getResult.data as Buffer,
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
		// LIKE query for text search (FTS5 virtual table not implemented yet)
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
