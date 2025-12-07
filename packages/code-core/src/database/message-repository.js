/**
 * Message Repository
 * Database operations for messages and steps
 *
 * Responsibilities:
 * - Add messages to sessions
 * - Update message status, parts, and usage
 * - Query message counts and user message history
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, lt, sql, sum } from "drizzle-orm";
import { MessagePartSchema } from "../schemas/message.schemas.js";
import { logger } from "../utils/logger.js";
import { retryDatabase } from "../utils/retry.js";
import { FileRepository } from "./file-repository.js";
import { messageSteps, messages, sessions, stepParts, stepUsage } from "./schema.js";
export class MessageRepository {
    db;
    fileRepo;
    constructor(db, storage) {
        this.db = db;
        this.fileRepo = new FileRepository(db, storage);
    }
    /**
     * Get FileRepository for message builder
     */
    getFileRepository() {
        return this.fileRepo;
    }
    /**
     * Add message to session with step-based structure
     * Atomically inserts message with initial step containing parts
     *
     * Design: Message = Container, Step = Content
     * - Creates message container
     * - Creates step-0 with provided content, metadata, todoSnapshot
     * - Attachments at message level (apply to all steps)
     * - Usage aggregated at message level (sum of step usage)
     */
    async addMessage(options) {
        const { sessionId, role, content, usage, finishReason, metadata, todoSnapshot, status } = options;
        return await retryDatabase(async () => {
            const messageId = randomUUID();
            const stepId = `${messageId}-step-0`;
            const now = Date.now();
            // Get current message count for ordering
            const [{ count }] = await this.db
                .select({ count: sql `count(*)` })
                .from(messages)
                .where(eq(messages.sessionId, sessionId));
            const ordering = count;
            // Insert in transaction
            await this.db.transaction(async (tx) => {
                // 1. Insert message container
                await tx.insert(messages).values({
                    id: messageId,
                    sessionId,
                    role,
                    timestamp: now,
                    ordering,
                    finishReason: finishReason || null,
                    status: status || "completed",
                });
                // 2-5. For streaming messages (status='active', empty content), skip step creation
                // The step will be created separately by createMessageStep when streaming starts
                const isStreamingMessage = status === "active" && content.length === 0;
                if (!isStreamingMessage) {
                    // 2. Insert step-0 with content
                    await tx.insert(messageSteps).values({
                        id: stepId,
                        messageId,
                        stepIndex: 0,
                        status: status || "completed",
                        metadata: metadata ? JSON.stringify(metadata) : null,
                        startTime: now,
                        endTime: status === "completed" ? now : null,
                        provider: null,
                        model: null,
                        duration: null,
                        finishReason: finishReason || null,
                    });
                    // 3. Insert step parts (with file migration to file_contents)
                    for (let i = 0; i < content.length; i++) {
                        const part = content[i];
                        let partToStore = part;
                        // Migrate file parts to file_contents table
                        if (part.type === "file" && "base64" in part && part.base64) {
                            logger.debug("Migrating file part", {
                                index: i,
                                relativePath: part.relativePath,
                                bytes: part.base64?.length,
                            });
                            try {
                                // Convert base64 back to Buffer
                                const buffer = Buffer.from(part.base64, "base64");
                                // Store in file_contents table (pass tx to avoid SQLITE_BUSY)
                                const fileId = await this.fileRepo.storeFileContent({
                                    stepId,
                                    ordering: i,
                                    relativePath: part.relativePath,
                                    mediaType: part.mediaType,
                                    content: buffer,
                                }, tx);
                                // Create file-ref part instead of full file part
                                partToStore = {
                                    type: "file-ref",
                                    fileContentId: fileId,
                                    relativePath: part.relativePath,
                                    size: part.size,
                                    mediaType: part.mediaType,
                                    status: "completed",
                                };
                                logger.debug("Migrated file to file_contents", {
                                    relativePath: part.relativePath,
                                    fileId,
                                });
                            }
                            catch (error) {
                                logger.error(`Failed to migrate file ${part.relativePath}`, error);
                                // Keep original file part if migration fails
                            }
                        }
                        await tx.insert(stepParts).values({
                            id: randomUUID(),
                            stepId,
                            ordering: i,
                            type: partToStore.type,
                            content: JSON.stringify(partToStore),
                        });
                    }
                    // 4. Insert step usage
                    if (usage) {
                        await tx.insert(stepUsage).values({
                            stepId,
                            promptTokens: usage.promptTokens,
                            completionTokens: usage.completionTokens,
                            totalTokens: usage.totalTokens,
                        });
                    }
                }
                // REMOVED: Message attachments - files now stored as frozen content in step parts
                // File content is captured at creation time and stored as base64 in MessagePart
                // This ensures immutable history and preserves order with text content
                // REMOVED: Message usage table - now computed from stepUsage on demand
                // Eliminates redundant storage and update operations
                // 5. Update session timestamp
                await tx.update(sessions).set({ updated: now }).where(eq(sessions.id, sessionId));
            });
            return messageId;
        });
    }
    /**
     * Update step parts (used during streaming)
     * Replaces all parts for a step atomically
     *
     * MIGRATION NOTE: This replaces updateMessageParts
     * - Old: Updated parts for entire message
     * - New: Updates parts for specific step (more granular)
     */
    async updateStepParts(stepId, parts) {
        await retryDatabase(async () => {
            await this.db.transaction(async (tx) => {
                // Delete existing parts for this step
                await tx.delete(stepParts).where(eq(stepParts.stepId, stepId));
                // Insert new parts
                for (let i = 0; i < parts.length; i++) {
                    await tx.insert(stepParts).values({
                        id: randomUUID(),
                        stepId,
                        ordering: i,
                        type: parts[i].type,
                        content: JSON.stringify(parts[i]),
                    });
                }
            });
        });
    }
    /**
     * Upsert a single part in a step (for incremental streaming updates)
     *
     * This method enables true streaming by updating individual parts without replacing all:
     * - If part exists at ordering: UPDATE content (e.g., append text during streaming)
     * - If part doesn't exist: INSERT new part
     *
     * Design: Streaming-first architecture
     * - Text parts: content grows incrementally as AI streams
     * - Tool parts: input added first, result added when completed
     * - Status field tracks lifecycle: 'active' → 'completed'
     *
     * Example streaming flow:
     * 1. upsertPart(stepId, 0, { type: 'text', content: 'Hello', status: 'active' })
     * 2. upsertPart(stepId, 0, { type: 'text', content: 'Hello wo', status: 'active' })
     * 3. upsertPart(stepId, 0, { type: 'text', content: 'Hello world', status: 'completed' })
     *
     * @param stepId - Step ID
     * @param ordering - Part index within step (0, 1, 2, ...)
     * @param part - MessagePart to upsert
     * @returns Part ID (existing or newly created)
     */
    async upsertPart(stepId, ordering, part) {
        return await retryDatabase(async () => {
            // Check if part exists at this position
            const existing = await this.db
                .select({ id: stepParts.id })
                .from(stepParts)
                .where(and(eq(stepParts.stepId, stepId), eq(stepParts.ordering, ordering)))
                .limit(1);
            if (existing.length > 0) {
                // UPDATE existing part
                const partId = existing[0].id;
                await this.db
                    .update(stepParts)
                    .set({
                    type: part.type,
                    content: JSON.stringify(part),
                })
                    .where(eq(stepParts.id, partId));
                return partId;
            }
            else {
                // INSERT new part
                const partId = randomUUID();
                await this.db.insert(stepParts).values({
                    id: partId,
                    stepId,
                    ordering,
                    type: part.type,
                    content: JSON.stringify(part),
                });
                return partId;
            }
        });
    }
    /**
     * @deprecated Use updateStepParts instead
     * Legacy method for backward compatibility - updates step-0 parts
     */
    async updateMessageParts(messageId, parts) {
        const stepId = `${messageId}-step-0`;
        await this.updateStepParts(stepId, parts);
    }
    /**
     * Update message status (used when streaming completes/aborts)
     */
    async updateMessageStatus(messageId, status, finishReason) {
        await retryDatabase(async () => {
            // Only update finishReason if explicitly provided
            const updates = { status };
            if (finishReason !== undefined) {
                updates.finishReason = finishReason || null;
            }
            await this.db.update(messages).set(updates).where(eq(messages.id, messageId));
        });
    }
    /**
     * @deprecated Message usage table removed
     * Usage is now computed from stepUsage table on demand
     * This method is a no-op for backward compatibility
     */
    async updateMessageUsage(_messageId, _usage) {
        // No-op: messageUsage table removed, usage computed from stepUsage
        // Kept for backward compatibility during migration
    }
    /**
     * Compute message usage from step usage (replaces messageUsage table)
     */
    async computeMessageUsage(messageId) {
        return retryDatabase(async () => {
            const [result] = await this.db
                .select({
                promptTokens: sum(stepUsage.promptTokens),
                completionTokens: sum(stepUsage.completionTokens),
                totalTokens: sum(stepUsage.totalTokens),
            })
                .from(stepUsage)
                .innerJoin(messageSteps, eq(messageSteps.id, stepUsage.stepId))
                .where(eq(messageSteps.messageId, messageId));
            // sum() returns string | null, convert to number
            const promptTokens = result.promptTokens ? Number(result.promptTokens) : 0;
            const completionTokens = result.completionTokens ? Number(result.completionTokens) : 0;
            const totalTokens = result.totalTokens ? Number(result.totalTokens) : 0;
            if (totalTokens === 0) {
                return null;
            }
            return { promptTokens, completionTokens, totalTokens };
        });
    }
    /**
     * Get message count for session
     * Efficient: No need to load messages
     */
    async getMessageCount(sessionId) {
        const [{ count }] = await this.db
            .select({ count: sql `count(*)` })
            .from(messages)
            .where(eq(messages.sessionId, sessionId));
        return count;
    }
    /**
     * Get recent user messages for command history (cursor-based pagination)
     * DATA ON DEMAND: Returns only needed messages with pagination
     * CURSOR-BASED PAGINATION: Efficient for large datasets
     */
    async getRecentUserMessages(limit = 100, cursor) {
        return retryDatabase(async () => {
            // Query user messages with cursor
            const conditions = [eq(messages.role, "user")];
            if (cursor) {
                conditions.push(lt(messages.timestamp, cursor));
            }
            const queryBuilder = this.db
                .select({
                messageId: messages.id,
                timestamp: messages.timestamp,
            })
                .from(messages)
                .where(and(...conditions))
                .orderBy(desc(messages.timestamp))
                .limit(limit + 1);
            const userMessages = await queryBuilder;
            const hasMore = userMessages.length > limit;
            const messagesToReturn = hasMore ? userMessages.slice(0, limit) : userMessages;
            const nextCursor = hasMore ? messagesToReturn[messagesToReturn.length - 1].timestamp : null;
            if (messagesToReturn.length === 0) {
                return { messages: [], nextCursor: null };
            }
            // Get text parts for these messages via step parts
            const messageIds = messagesToReturn.map((m) => m.messageId);
            // Get steps for these messages
            const steps = await this.db
                .select()
                .from(messageSteps)
                .where(inArray(messageSteps.messageId, messageIds));
            if (steps.length === 0) {
                // No steps found, return empty array
                return {
                    messages: [],
                    nextCursor,
                };
            }
            const stepIds = steps.map((s) => s.id);
            // Get all parts (text and file-ref)
            const parts = await this.db
                .select()
                .from(stepParts)
                .where(inArray(stepParts.stepId, stepIds))
                .orderBy(stepParts.ordering);
            // Map step IDs to message IDs
            const stepToMessage = new Map();
            for (const step of steps) {
                stepToMessage.set(step.id, step.messageId);
            }
            const messageData = new Map();
            for (const part of parts) {
                const messageId = stepToMessage.get(part.stepId);
                if (!messageId)
                    continue;
                // Parse and validate MessagePart content
                const parsed = MessagePartSchema.safeParse(JSON.parse(part.content));
                if (!parsed.success) {
                    // Skip corrupted part data
                    logger.error("Invalid MessagePart", parsed.error);
                    continue;
                }
                const content = parsed.data;
                if (!messageData.has(messageId)) {
                    messageData.set(messageId, []);
                }
                const data = messageData.get(messageId);
                if (content.type === "text") {
                    const text = content.content || "";
                    if (text.trim()) {
                        data.push({ type: "text", content: text });
                    }
                }
                else if (content.type === "file-ref") {
                    data.push({
                        type: "file-ref",
                        fileContentId: content.fileContentId,
                        relativePath: content.relativePath,
                        size: content.size,
                        mediaType: content.mediaType,
                    });
                }
            }
            // Build result in timestamp order (most recent first)
            // Return fileId references, not content (ChatGPT-style architecture)
            const result = [];
            for (const msg of messagesToReturn) {
                const parts = messageData.get(msg.messageId);
                if (!parts)
                    continue;
                // Reconstruct text by iterating parts in order
                const textParts = [];
                const files = [];
                for (const part of parts) {
                    if (part.type === "text") {
                        textParts.push(part.content);
                    }
                    else if (part.type === "file-ref") {
                        // Add file reference to text
                        textParts.push(part.relativePath);
                        // Add fileId reference (no content fetching - ChatGPT-style)
                        files.push({
                            fileId: part.fileContentId,
                            relativePath: part.relativePath,
                            mediaType: part.mediaType,
                            size: part.size,
                        });
                    }
                }
                const fullText = textParts.join(" ").trim();
                if (fullText || files.length > 0) {
                    result.push({ text: fullText, files });
                }
            }
            return { messages: result, nextCursor };
        });
    }
}
//# sourceMappingURL=message-repository.js.map