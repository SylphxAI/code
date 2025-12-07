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
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { retryDatabase } from "../utils/retry.js";
import { sessions } from "./schema.js";
import { getSessionCount } from "./session/session-aggregation.js";
// Import modular functions
import { getLastSession, getRecentSessions, getRecentSessionsMetadata, getSessionById, } from "./session/session-query.js";
import { searchSessionsByTitle, searchSessionsMetadata } from "./session/session-search.js";
export class SessionRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Get database instance for cross-repository operations
     */
    getDatabase() {
        return this.db;
    }
    // ============================================================================
    // Session CRUD Operations
    // ============================================================================
    /**
     * Create a new session
     */
    async createSession(provider, model, agentId = "coder", enabledRuleIds = []) {
        const now = Date.now();
        const sessionId = randomUUID();
        const newSession = {
            id: sessionId,
            provider,
            model,
            agentId,
            enabledRuleIds,
            nextTodoId: 1,
            created: now,
            updated: now,
        };
        await retryDatabase(() => this.db.insert(sessions).values(newSession));
        return {
            id: sessionId,
            provider,
            model,
            agentId,
            enabledRuleIds,
            messages: [],
            todos: [],
            nextTodoId: 1,
            created: now,
            updated: now,
        };
    }
    /**
     * Create session with specific ID and timestamps (for migration)
     */
    async createSessionFromData(sessionData) {
        await retryDatabase(async () => {
            const newSession = {
                id: sessionData.id,
                title: sessionData.title || null,
                provider: sessionData.provider,
                model: sessionData.model,
                agentId: sessionData.agentId || "coder",
                enabledRuleIds: sessionData.enabledRuleIds || [],
                nextTodoId: sessionData.nextTodoId,
                created: sessionData.created,
                updated: sessionData.updated,
            };
            await this.db.insert(sessions).values(newSession);
        });
    }
    /**
     * Delete session (CASCADE will delete all related data)
     */
    async deleteSession(sessionId) {
        await this.db.delete(sessions).where(eq(sessions.id, sessionId));
    }
    // ============================================================================
    // Session Updates
    // ============================================================================
    /**
     * Update session title
     */
    async updateSessionTitle(sessionId, title) {
        await retryDatabase(() => this.db
            .update(sessions)
            .set({ title, updated: Date.now() })
            .where(eq(sessions.id, sessionId)));
    }
    /**
     * Update session model
     */
    async updateSessionModel(sessionId, model) {
        await retryDatabase(() => this.db
            .update(sessions)
            .set({ model, updated: Date.now() })
            .where(eq(sessions.id, sessionId)));
    }
    /**
     * Update session provider and model
     */
    async updateSessionProvider(sessionId, provider, model) {
        await retryDatabase(() => this.db
            .update(sessions)
            .set({ provider, model, updated: Date.now() })
            .where(eq(sessions.id, sessionId)));
    }
    /**
     * Update session (partial update)
     */
    async updateSession(sessionId, updates) {
        await retryDatabase(() => this.db
            .update(sessions)
            .set({ ...updates, updated: Date.now() })
            .where(eq(sessions.id, sessionId)));
    }
    /**
     * Update session flags (system message trigger states)
     * Merges new flags with existing flags
     */
    async updateSessionFlags(sessionId, flagUpdates) {
        await retryDatabase(async () => {
            // Read current session
            const [session] = await this.db
                .select()
                .from(sessions)
                .where(eq(sessions.id, sessionId))
                .limit(1);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }
            // Merge flags
            const currentFlags = session.flags || {};
            const newFlags = { ...currentFlags, ...flagUpdates };
            // Update
            await this.db
                .update(sessions)
                .set({ flags: newFlags, updated: Date.now() })
                .where(eq(sessions.id, sessionId));
        });
    }
    /**
     * Update session token counts
     * Updates baseContextTokens and/or totalTokens
     */
    async updateSessionTokens(sessionId, tokens) {
        await retryDatabase(async () => {
            await this.db
                .update(sessions)
                .set({
                ...tokens,
                updated: Date.now(),
            })
                .where(eq(sessions.id, sessionId));
        });
    }
    // ============================================================================
    // Message Queue Operations
    // ============================================================================
    /**
     * Enqueue message - Add message to session's queue (FIFO)
     * Used when user sends message while AI is responding
     */
    async enqueueMessage(sessionId, content, attachments = []) {
        return await retryDatabase(async () => {
            console.log("[enqueueMessage] Enqueueing message:", { sessionId, content: content.substring(0, 50), attachments: attachments.length });
            // Read current queue
            const [session] = await this.db
                .select({ messageQueue: sessions.messageQueue })
                .from(sessions)
                .where(eq(sessions.id, sessionId))
                .limit(1);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }
            console.log("[enqueueMessage] Current queue length:", session.messageQueue?.length || 0);
            // Create queued message
            const queuedMessage = {
                id: `temp-queue-${Date.now()}`,
                content,
                attachments,
                enqueuedAt: Date.now(),
            };
            // Append to queue
            const updatedQueue = [...(session.messageQueue || []), queuedMessage];
            console.log("[enqueueMessage] New queue length:", updatedQueue.length);
            console.log("[enqueueMessage] Queued message:", JSON.stringify(queuedMessage));
            // Update session
            await this.db
                .update(sessions)
                .set({ messageQueue: updatedQueue, updated: Date.now() })
                .where(eq(sessions.id, sessionId));
            console.log("[enqueueMessage] Message enqueued successfully with id:", queuedMessage.id);
            return queuedMessage;
        });
    }
    /**
     * Dequeue message - Get and remove next message from queue (FIFO)
     * Returns null if queue is empty
     */
    async dequeueMessage(sessionId) {
        return await retryDatabase(async () => {
            // Read current queue
            const [session] = await this.db
                .select({ messageQueue: sessions.messageQueue })
                .from(sessions)
                .where(eq(sessions.id, sessionId))
                .limit(1);
            console.log("[dequeueMessage] Session found:", !!session);
            console.log("[dequeueMessage] Queue exists:", !!session?.messageQueue);
            console.log("[dequeueMessage] Queue length:", session?.messageQueue?.length);
            console.log("[dequeueMessage] Queue contents:", JSON.stringify(session?.messageQueue));
            if (!session || !session.messageQueue || session.messageQueue.length === 0) {
                console.log("[dequeueMessage] Queue is empty, returning null");
                return null;
            }
            // Get first message (FIFO)
            const [firstMessage, ...rest] = session.messageQueue;
            console.log("[dequeueMessage] First message:", JSON.stringify(firstMessage));
            console.log("[dequeueMessage] Remaining queue length:", rest.length);
            // Update queue (remove first)
            await this.db
                .update(sessions)
                .set({ messageQueue: rest, updated: Date.now() })
                .where(eq(sessions.id, sessionId));
            console.log("[dequeueMessage] Returning message with id:", firstMessage.id);
            return firstMessage;
        });
    }
    /**
     * Get queued messages - Get all queued messages without removing
     * Used for displaying queue in UI
     */
    async getQueuedMessages(sessionId) {
        const [session] = await this.db
            .select({ messageQueue: sessions.messageQueue })
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);
        const queue = session?.messageQueue;
        return Array.isArray(queue) ? queue : [];
    }
    /**
     * Update queued message - Update content/attachments of specific queued message
     */
    async updateQueuedMessage(sessionId, messageId, content, attachments) {
        return await retryDatabase(async () => {
            // Read current queue
            const [session] = await this.db
                .select({ messageQueue: sessions.messageQueue })
                .from(sessions)
                .where(eq(sessions.id, sessionId))
                .limit(1);
            if (!session || !session.messageQueue) {
                throw new Error(`Queue not found for session ${sessionId}`);
            }
            // Find and update the message
            const messageIndex = session.messageQueue.findIndex((msg) => msg.id === messageId);
            if (messageIndex === -1) {
                throw new Error(`Queued message ${messageId} not found in session ${sessionId}`);
            }
            const updatedQueue = [...session.messageQueue];
            updatedQueue[messageIndex] = {
                ...updatedQueue[messageIndex],
                content,
                attachments,
            };
            // Update session
            await this.db
                .update(sessions)
                .set({ messageQueue: updatedQueue, updated: Date.now() })
                .where(eq(sessions.id, sessionId));
            return updatedQueue[messageIndex];
        });
    }
    /**
     * Clear queue - Remove all queued messages
     */
    async clearQueue(sessionId) {
        await retryDatabase(() => this.db
            .update(sessions)
            .set({ messageQueue: [], updated: Date.now() })
            .where(eq(sessions.id, sessionId)));
    }
    /**
     * Remove queued message - Remove specific message from queue by ID
     */
    async removeQueuedMessage(sessionId, messageId) {
        await retryDatabase(async () => {
            // Read current queue
            const [session] = await this.db
                .select({ messageQueue: sessions.messageQueue })
                .from(sessions)
                .where(eq(sessions.id, sessionId))
                .limit(1);
            if (!session || !session.messageQueue) {
                return;
            }
            // Filter out the message
            const updatedQueue = session.messageQueue.filter((msg) => msg.id !== messageId);
            // Update session
            await this.db
                .update(sessions)
                .set({ messageQueue: updatedQueue, updated: Date.now() })
                .where(eq(sessions.id, sessionId));
        });
    }
    // ============================================================================
    // Session Queries (delegated to session-query.ts)
    // ============================================================================
    /**
     * Get session by ID with all related data
     */
    async getSessionById(sessionId) {
        return getSessionById(this.db, sessionId);
    }
    /**
     * Get recent sessions metadata ONLY (cursor-based pagination)
     */
    async getRecentSessionsMetadata(limit = 20, cursor) {
        return getRecentSessionsMetadata(this.db, limit, cursor);
    }
    /**
     * Get recent sessions with full data (for backward compatibility)
     * DEPRECATED: Use getRecentSessionsMetadata + getSessionById instead
     */
    async getRecentSessions(limit = 20, offset = 0) {
        return getRecentSessions(this.db, limit, offset);
    }
    /**
     * Get most recently updated session (for headless mode continuation)
     */
    async getLastSession() {
        return getLastSession(this.db);
    }
    // ============================================================================
    // Session Search (delegated to session-search.ts)
    // ============================================================================
    /**
     * Search sessions by title (metadata only, cursor-based)
     */
    async searchSessionsMetadata(query, limit = 20, cursor) {
        return searchSessionsMetadata(this.db, query, limit, cursor);
    }
    /**
     * Search sessions by title (full data)
     * DEPRECATED: Use searchSessionsMetadata + getSessionById instead
     */
    async searchSessionsByTitle(query, limit = 20) {
        return searchSessionsByTitle(this.db, (id) => this.getSessionById(id), query, limit);
    }
    // ============================================================================
    // Session Aggregations (delegated to session-aggregation.ts)
    // ============================================================================
    /**
     * Get session count
     */
    async getSessionCount() {
        return getSessionCount(this.db);
    }
}
//# sourceMappingURL=session-repository.js.map