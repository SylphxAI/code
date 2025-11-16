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

import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { sessions, type NewSession } from "./schema.js";
import type { Session as SessionType } from "../types/session.types.js";
import type { ProviderId } from "../config/ai-config.js";
import { retryDatabase } from "../utils/retry.js";

// Import modular functions
import {
	getSessionById,
	getRecentSessionsMetadata,
	getRecentSessions,
	getLastSession,
} from "./session/session-query.js";
import {
	searchSessionsMetadata,
	searchSessionsByTitle,
} from "./session/session-search.js";
import { getSessionCount } from "./session/session-aggregation.js";

// Re-export types
export type { SessionMetadata, PaginatedResult } from "./session/types.js";

export class SessionRepository {
	constructor(private db: LibSQLDatabase) {}

	/**
	 * Get database instance for cross-repository operations
	 */
	getDatabase(): LibSQLDatabase {
		return this.db;
	}

	// ============================================================================
	// Session CRUD Operations
	// ============================================================================

	/**
	 * Create a new session
	 */
	async createSession(
		provider: ProviderId,
		model: string,
		agentId: string = "coder",
		enabledRuleIds: string[] = [],
	): Promise<SessionType> {
		const now = Date.now();
		const sessionId = `session-${now}`;

		const newSession: NewSession = {
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
	async createSessionFromData(sessionData: {
		id: string;
		provider: ProviderId;
		model: string;
		agentId?: string;
		title?: string;
		enabledRuleIds?: string[];
		nextTodoId: number;
		created: number;
		updated: number;
	}): Promise<void> {
		await retryDatabase(async () => {
			const newSession: NewSession = {
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
	async deleteSession(sessionId: string): Promise<void> {
		await this.db.delete(sessions).where(eq(sessions.id, sessionId));
	}

	// ============================================================================
	// Session Updates
	// ============================================================================

	/**
	 * Update session title
	 */
	async updateSessionTitle(sessionId: string, title: string): Promise<void> {
		await retryDatabase(() =>
			this.db
				.update(sessions)
				.set({ title, updated: Date.now() })
				.where(eq(sessions.id, sessionId)),
		);
	}

	/**
	 * Update session model
	 */
	async updateSessionModel(sessionId: string, model: string): Promise<void> {
		await retryDatabase(() =>
			this.db
				.update(sessions)
				.set({ model, updated: Date.now() })
				.where(eq(sessions.id, sessionId)),
		);
	}

	/**
	 * Update session provider and model
	 */
	async updateSessionProvider(
		sessionId: string,
		provider: ProviderId,
		model: string,
	): Promise<void> {
		await retryDatabase(() =>
			this.db
				.update(sessions)
				.set({ provider, model, updated: Date.now() })
				.where(eq(sessions.id, sessionId)),
		);
	}

	/**
	 * Update session (partial update)
	 */
	async updateSession(
		sessionId: string,
		updates: {
			title?: string;
			provider?: ProviderId;
			model?: string;
			agentId?: string;
			enabledRuleIds?: string[];
		},
	): Promise<void> {
		await retryDatabase(() =>
			this.db
				.update(sessions)
				.set({ ...updates, updated: Date.now() })
				.where(eq(sessions.id, sessionId)),
		);
	}

	/**
	 * Update session flags (system message trigger states)
	 * Merges new flags with existing flags
	 */
	async updateSessionFlags(
		sessionId: string,
		flagUpdates: Record<string, boolean>,
	): Promise<void> {
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
	async updateSessionTokens(
		sessionId: string,
		tokens: {
			baseContextTokens?: number;
			totalTokens?: number;
		},
	): Promise<void> {
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
	// Session Queries (delegated to session-query.ts)
	// ============================================================================

	/**
	 * Get session by ID with all related data
	 */
	async getSessionById(sessionId: string): Promise<SessionType | null> {
		return getSessionById(this.db, sessionId);
	}

	/**
	 * Get recent sessions metadata ONLY (cursor-based pagination)
	 */
	async getRecentSessionsMetadata(
		limit = 20,
		cursor?: number,
	): Promise<ReturnType<typeof getRecentSessionsMetadata>> {
		return getRecentSessionsMetadata(this.db, limit, cursor);
	}

	/**
	 * Get recent sessions with full data (for backward compatibility)
	 * DEPRECATED: Use getRecentSessionsMetadata + getSessionById instead
	 */
	async getRecentSessions(limit = 20, offset = 0): Promise<SessionType[]> {
		return getRecentSessions(this.db, limit, offset);
	}

	/**
	 * Get most recently updated session (for headless mode continuation)
	 */
	async getLastSession(): Promise<SessionType | null> {
		return getLastSession(this.db);
	}

	// ============================================================================
	// Session Search (delegated to session-search.ts)
	// ============================================================================

	/**
	 * Search sessions by title (metadata only, cursor-based)
	 */
	async searchSessionsMetadata(
		query: string,
		limit = 20,
		cursor?: number,
	): Promise<ReturnType<typeof searchSessionsMetadata>> {
		return searchSessionsMetadata(this.db, query, limit, cursor);
	}

	/**
	 * Search sessions by title (full data)
	 * DEPRECATED: Use searchSessionsMetadata + getSessionById instead
	 */
	async searchSessionsByTitle(query: string, limit = 20): Promise<SessionType[]> {
		return searchSessionsByTitle(this.db, (id) => this.getSessionById(id), query, limit);
	}

	// ============================================================================
	// Session Aggregations (delegated to session-aggregation.ts)
	// ============================================================================

	/**
	 * Get session count
	 */
	async getSessionCount(): Promise<number> {
		return getSessionCount(this.db);
	}
}
