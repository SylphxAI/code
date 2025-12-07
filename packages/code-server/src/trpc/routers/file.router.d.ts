/**
 * File Router
 * Handle immediate file uploads and downloads for multi-client architecture
 * ARCHITECTURE: Files uploaded immediately on paste/select, stored in object storage, referenced by fileId
 * SECURITY: Protected + moderate rate limiting (30 req/min)
 */
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
export declare const fileRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Upload file to object storage
     * Returns fileId for referencing in messages
     *
     * ORPHAN HANDLING: Files uploaded but not used in messages within 24h are cleaned up
     */
    upload: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            relativePath: string;
            mediaType: string;
            size: number;
            content: string;
        };
        output: {
            fileId: string;
            sha256: string;
            url: string;
        };
        meta: object;
    }>;
    /**
     * Download file from object storage
     * Returns file content for preview/download
     *
     * PUBLIC: Allow clients to fetch files they have fileId for
     * (fileIds are UUIDs, hard to guess)
     */
    download: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            fileId: string;
        };
        output: {
            fileId: string;
            relativePath: string;
            mediaType: string;
            size: number;
            content: string;
            sha256: string;
            createdAt: number;
        };
        meta: object;
    }>;
    /**
     * Get file metadata without content
     * Useful for checking if file exists and getting size/type
     */
    getMetadata: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            fileId: string;
        };
        output: {
            fileId: string;
            relativePath: string;
            mediaType: string;
            size: number;
            sha256: string;
            createdAt: number;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=file.router.d.ts.map