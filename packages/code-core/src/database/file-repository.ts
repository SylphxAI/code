/**
 * File Repository
 * Database operations for frozen file content
 *
 * Design: Frozen file storage for conversation history
 * - Files stored as BLOB in file_contents table
 * - Immutable (never changes - preserves prompt cache)
 * - Searchable (FTS5 on text content)
 * - Supports rewind/checkpoint restore
 */

import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { fileContents } from "./schema.js";

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
	constructor(private db: LibSQLDatabase) {}

	/**
	 * Store file content in database
	 * Returns fileContentId for creating file-ref MessagePart
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

		await dbOrTx.insert(fileContents).values({
			id: fileId,
			stepId: input.stepId,
			ordering: input.ordering,
			relativePath: input.relativePath,
			mediaType: input.mediaType,
			size: input.content.length,
			content: input.content,
			isText: isTextFile ? 1 : 0,
			textContent,
			sha256,
			createdAt: now,
		});

		return fileId;
	}

	/**
	 * Get file content by ID
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

		return {
			...record,
			isText: record.isText === 1,
			content: record.content as Buffer,
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

		return records.map((r) => ({
			...r,
			isText: r.isText === 1,
			content: r.content as Buffer,
		}));
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
