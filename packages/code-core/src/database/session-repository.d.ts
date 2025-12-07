/**
 * Session Repository
 * Database operations for chat sessions using Drizzle ORM
 *
 * Responsibilities:
 * - Session CRUD: Create, read, delete sessions
 * - Session queries: Get by ID, recent sessions, last session
 * - Session search: Search by title
 * - Session updates: Update title, model, provider, etc.
 * - Session aggregations: Count sessions
 *
 * Note: Message and todo operations moved to dedicated repositories:
 * - MessageRepository: Message operations (addMessage, updateStepParts, etc.)
 * - TodoRepository: Todo operations (updateTodos)
 *
 * Advantages over file-based storage:
 * - Indexed queries: Fast search by title, provider, date
 * - Pagination: Load only needed sessions (no memory bloat)
 * - Aggregations: Count messages without loading full session
 * - Transactions: Data consistency for complex operations
 * - Concurrent access: Proper locking and consistency
 * - Efficient updates: Update specific fields without rewriting entire file
 */
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { ProviderId } from "../config/ai-config.js";
import type { Session as SessionType } from "../types/session.types.js";
import { getRecentSessionsMetadata } from "./session/session-query.js";
import { searchSessionsMetadata } from "./session/session-search.js";
export type { PaginatedResult, SessionMetadata } from "./session/types.js";
export declare class SessionRepository {
    private db;
    constructor(db: LibSQLDatabase);
    /**
     * Get database instance for cross-repository operations
     */
    getDatabase(): LibSQLDatabase;
    /**
     * Create a new session
     */
    createSession(provider: ProviderId, model: string, agentId?: string, enabledRuleIds?: string[]): Promise<SessionType>;
    /**
     * Create session with specific ID and timestamps (for migration)
     */
    createSessionFromData(sessionData: {
        id: string;
        provider: ProviderId;
        model: string;
        agentId?: string;
        title?: string;
        enabledRuleIds?: string[];
        nextTodoId: number;
        created: number;
        updated: number;
    }): Promise<void>;
    /**
     * Delete session (CASCADE will delete all related data)
     */
    deleteSession(sessionId: string): Promise<void>;
    /**
     * Update session title
     */
    updateSessionTitle(sessionId: string, title: string): Promise<void>;
    /**
     * Update session model
     */
    updateSessionModel(sessionId: string, model: string): Promise<void>;
    /**
     * Update session provider and model
     */
    updateSessionProvider(sessionId: string, provider: ProviderId, model: string): Promise<void>;
    /**
     * Update session (partial update)
     */
    updateSession(sessionId: string, updates: {
        title?: string;
        provider?: ProviderId;
        model?: string;
        agentId?: string;
        enabledRuleIds?: string[];
    }): Promise<void>;
    /**
     * Update session flags (system message trigger states)
     * Merges new flags with existing flags
     */
    updateSessionFlags(sessionId: string, flagUpdates: Record<string, boolean>): Promise<void>;
    /**
     * Update session token counts
     * Updates baseContextTokens and/or totalTokens
     */
    updateSessionTokens(sessionId: string, tokens: {
        baseContextTokens?: number;
        totalTokens?: number;
    }): Promise<void>;
    /**
     * Enqueue message - Add message to session's queue (FIFO)
     * Used when user sends message while AI is responding
     */
    enqueueMessage(sessionId: string, content: string, attachments?: Array<{
        path: string;
        relativePath: string;
        size: number;
        mimeType?: string;
    }>): Promise<{
        id: string;
        content: string;
        attachments: Array<{
            path: string;
            relativePath: string;
            size: number;
            mimeType?: string;
        }>;
        enqueuedAt: number;
    }>;
    /**
     * Dequeue message - Get and remove next message from queue (FIFO)
     * Returns null if queue is empty
     */
    dequeueMessage(sessionId: string): Promise<{
        id: string;
        content: string;
        attachments: Array<{
            path: string;
            relativePath: string;
            size: number;
            mimeType?: string;
        }>;
        enqueuedAt: number;
    } | null>;
    /**
     * Get queued messages - Get all queued messages without removing
     * Used for displaying queue in UI
     */
    getQueuedMessages(sessionId: string): Promise<Array<{
        id: string;
        content: string;
        attachments: Array<{
            path: string;
            relativePath: string;
            size: number;
            mimeType?: string;
        }>;
        enqueuedAt: number;
    }>>;
    /**
     * Update queued message - Update content/attachments of specific queued message
     */
    updateQueuedMessage(sessionId: string, messageId: string, content: string, attachments: Array<{
        path: string;
        relativePath: string;
        size: number;
        mimeType?: string;
    }>): Promise<{
        id: string;
        content: string;
        attachments: Array<{
            path: string;
            relativePath: string;
            size: number;
            mimeType?: string;
        }>;
        enqueuedAt: number;
    }>;
    /**
     * Clear queue - Remove all queued messages
     */
    clearQueue(sessionId: string): Promise<void>;
    /**
     * Remove queued message - Remove specific message from queue by ID
     */
    removeQueuedMessage(sessionId: string, messageId: string): Promise<void>;
    /**
     * Get session by ID with all related data
     */
    getSessionById(sessionId: string): Promise<SessionType | null>;
    /**
     * Get recent sessions metadata ONLY (cursor-based pagination)
     */
    getRecentSessionsMetadata(limit?: number, cursor?: number): Promise<ReturnType<typeof getRecentSessionsMetadata>>;
    /**
     * Get recent sessions with full data (for backward compatibility)
     * DEPRECATED: Use getRecentSessionsMetadata + getSessionById instead
     */
    getRecentSessions(limit?: number, offset?: number): Promise<SessionType[]>;
    /**
     * Get most recently updated session (for headless mode continuation)
     */
    getLastSession(): Promise<SessionType | null>;
    /**
     * Search sessions by title (metadata only, cursor-based)
     */
    searchSessionsMetadata(query: string, limit?: number, cursor?: number): Promise<ReturnType<typeof searchSessionsMetadata>>;
    /**
     * Search sessions by title (full data)
     * DEPRECATED: Use searchSessionsMetadata + getSessionById instead
     */
    searchSessionsByTitle(query: string, limit?: number): Promise<SessionType[]>;
    /**
     * Get session count
     */
    getSessionCount(): Promise<number>;
}
//# sourceMappingURL=session-repository.d.ts.map