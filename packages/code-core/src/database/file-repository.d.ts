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
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { StorageOps } from "../storage/functional.js";
export interface FileContentInput {
    stepId: string | null;
    ordering: number;
    relativePath: string;
    mediaType: string;
    content: Buffer;
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
export declare class FileRepository {
    private db;
    private storage;
    constructor(db: LibSQLDatabase, storage: StorageOps);
    /**
     * Store file content in object storage
     * Returns fileContentId for creating file-ref MessagePart
     *
     * @param input File content to store
     * @param tx Optional transaction context (if called within a transaction)
     */
    storeFileContent(input: FileContentInput, tx?: LibSQLDatabase): Promise<string>;
    /**
     * Get file content by ID from object storage
     */
    getFileContent(fileId: string): Promise<FileContentRecord | null>;
    /**
     * Get all files for a step (for message display)
     */
    getStepFiles(stepId: string): Promise<FileContentRecord[]>;
    /**
     * Get file extension from path
     */
    private getExtension;
    /**
     * Check if media type is text
     * Used to determine whether to extract text_content for FTS5
     */
    private isTextMediaType;
    /**
     * Search file content across all conversations
     * Uses FTS5 for full-text search on text files
     *
     * NOTE: Requires FTS5 virtual table setup (future migration)
     */
    searchFileContent(query: string, limit?: number): Promise<Array<{
        fileId: string;
        relativePath: string;
        textContent: string;
        stepId: string;
    }>>;
}
//# sourceMappingURL=file-repository.d.ts.map