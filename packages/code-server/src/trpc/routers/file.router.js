/**
 * File Router
 * Handle immediate file uploads and downloads for multi-client architecture
 * ARCHITECTURE: Files uploaded immediately on paste/select, stored in object storage, referenced by fileId
 * SECURITY: Protected + moderate rate limiting (30 req/min)
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import { moderateProcedure, publicProcedure, router } from "../trpc.js";
/**
 * Upload file immediately (before message creation)
 * Returns fileId for referencing in message submission
 *
 * Flow:
 * 1. User pastes/selects file
 * 2. Client uploads immediately (this endpoint)
 * 3. Returns fileId
 * 4. Client stores fileId in state
 * 5. On submit, client sends fileId (not content)
 */
export const fileRouter = router({
    /**
     * Upload file to object storage
     * Returns fileId for referencing in messages
     *
     * ORPHAN HANDLING: Files uploaded but not used in messages within 24h are cleaned up
     */
    upload: moderateProcedure
        .input(z.object({
        relativePath: z.string(), // Display name (e.g., "image.png" or "src/app.ts")
        mediaType: z.string(), // MIME type (e.g., "image/png")
        size: z.number(), // File size in bytes
        content: z.string(), // Base64 encoded file content
    }))
        .mutation(async ({ ctx, input }) => {
        // Get FileRepository via MessageRepository
        const fileRepo = ctx.messageRepository.getFileRepository();
        // Decode base64 to Buffer
        const buffer = Buffer.from(input.content, "base64");
        // Validate size matches
        if (buffer.length !== input.size) {
            throw new Error(`Size mismatch: expected ${input.size} bytes, got ${buffer.length} bytes`);
        }
        // Calculate SHA256 for deduplication
        const sha256 = createHash("sha256").update(buffer).digest("hex");
        // Store file to object storage
        // ORPHAN: stepId is temporary UUID, will be replaced when associated with message
        // Use null for orphaned files (ChatGPT-style immediate upload)
        const fileId = await fileRepo.storeFileContent({
            stepId: undefined, // Orphaned file - will be linked when message created
            ordering: 0,
            relativePath: input.relativePath,
            mediaType: input.mediaType,
            content: buffer,
        }, undefined);
        return {
            fileId,
            sha256,
            url: `/api/trpc/file.download?input=${encodeURIComponent(JSON.stringify({ fileId }))}`,
        };
    }),
    /**
     * Download file from object storage
     * Returns file content for preview/download
     *
     * PUBLIC: Allow clients to fetch files they have fileId for
     * (fileIds are UUIDs, hard to guess)
     */
    download: publicProcedure
        .input(z.object({
        fileId: z.string(),
    }))
        .query(async ({ ctx, input }) => {
        // Get FileRepository via MessageRepository
        const fileRepo = ctx.messageRepository.getFileRepository();
        // Fetch file from object storage
        const file = await fileRepo.getFileContent(input.fileId);
        if (!file) {
            throw new Error(`File not found: ${input.fileId}`);
        }
        return {
            fileId: file.id,
            relativePath: file.relativePath,
            mediaType: file.mediaType,
            size: file.size,
            content: file.content.toString("base64"),
            sha256: file.sha256,
            createdAt: file.createdAt,
        };
    }),
    /**
     * Get file metadata without content
     * Useful for checking if file exists and getting size/type
     */
    getMetadata: publicProcedure
        .input(z.object({
        fileId: z.string(),
    }))
        .query(async ({ ctx, input }) => {
        const fileRepo = ctx.messageRepository.getFileRepository();
        const file = await fileRepo.getFileContent(input.fileId);
        if (!file) {
            throw new Error(`File not found: ${input.fileId}`);
        }
        return {
            fileId: file.id,
            relativePath: file.relativePath,
            mediaType: file.mediaType,
            size: file.size,
            sha256: file.sha256,
            createdAt: file.createdAt,
        };
    }),
});
//# sourceMappingURL=file.router.js.map