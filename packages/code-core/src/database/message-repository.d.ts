/**
 * Message Repository
 * Database operations for messages and steps
 *
 * Responsibilities:
 * - Add messages to sessions
 * - Update message status, parts, and usage
 * - Query message counts and user message history
 */
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { StorageOps } from "../storage/functional.js";
import type { MessagePart, TokenUsage } from "../types/session.types.js";
import type { Todo as TodoType } from "../types/todo.types.js";
import { FileRepository } from "./file-repository.js";
export declare class MessageRepository {
    private db;
    private fileRepo;
    constructor(db: LibSQLDatabase, storage: StorageOps);
    /**
     * Get FileRepository for message builder
     */
    getFileRepository(): FileRepository;
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
    addMessage(options: {
        sessionId: string;
        role: "user" | "assistant" | "system";
        content: MessagePart[];
        usage?: TokenUsage;
        finishReason?: string;
        metadata?: MessageMetadata;
        todoSnapshot?: TodoType[];
        status?: "active" | "completed" | "error" | "abort";
    }): Promise<string>;
    /**
     * Update step parts (used during streaming)
     * Replaces all parts for a step atomically
     *
     * MIGRATION NOTE: This replaces updateMessageParts
     * - Old: Updated parts for entire message
     * - New: Updates parts for specific step (more granular)
     */
    updateStepParts(stepId: string, parts: MessagePart[]): Promise<void>;
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
    upsertPart(stepId: string, ordering: number, part: MessagePart): Promise<string>;
    /**
     * @deprecated Use updateStepParts instead
     * Legacy method for backward compatibility - updates step-0 parts
     */
    updateMessageParts(messageId: string, parts: MessagePart[]): Promise<void>;
    /**
     * Update message status (used when streaming completes/aborts)
     */
    updateMessageStatus(messageId: string, status: "active" | "completed" | "error" | "abort", finishReason?: string): Promise<void>;
    /**
     * @deprecated Message usage table removed
     * Usage is now computed from stepUsage table on demand
     * This method is a no-op for backward compatibility
     */
    updateMessageUsage(_messageId: string, _usage: TokenUsage): Promise<void>;
    /**
     * Compute message usage from step usage (replaces messageUsage table)
     */
    computeMessageUsage(messageId: string): Promise<TokenUsage | null>;
    /**
     * Get message count for session
     * Efficient: No need to load messages
     */
    getMessageCount(sessionId: string): Promise<number>;
    /**
     * Get recent user messages for command history (cursor-based pagination)
     * DATA ON DEMAND: Returns only needed messages with pagination
     * CURSOR-BASED PAGINATION: Efficient for large datasets
     */
    getRecentUserMessages(limit?: number, cursor?: number): Promise<{
        messages: Array<{
            text: string;
            files: Array<{
                fileId: string;
                relativePath: string;
                mediaType: string;
                size: number;
            }>;
        }>;
        nextCursor: number | null;
    }>;
}
//# sourceMappingURL=message-repository.d.ts.map