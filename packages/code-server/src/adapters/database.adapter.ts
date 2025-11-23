/**
 * Lens DatabaseAdapter
 *
 * Adapts existing repositories (SessionRepository, MessageRepository) to Lens's DatabaseAdapter interface.
 * This allows Lens to work with the existing Drizzle-based repositories.
 */

import type { DatabaseAdapter } from "@sylphx/lens-core";
import type { SessionRepository } from "@sylphx/code-core";
import type { MessageRepository } from "@sylphx/code-core";

/**
 * Create a DatabaseAdapter for Lens from existing repositories
 *
 * Maps Lens's generic interface to specific repository methods.
 */
export function createLensDatabaseAdapter(
	sessionRepository: SessionRepository,
	messageRepository: MessageRepository,
): DatabaseAdapter {
	return {
		/**
		 * Find entity by ID
		 */
		async findById(tableName: string, id: string): Promise<any> {
			switch (tableName) {
				case "sessions":
				case "session":
					return await sessionRepository.getSessionById(id);

				case "messages":
				case "message":
					// Messages are loaded with session, not standalone
					throw new Error(
						"Messages should be loaded via session.messages, not standalone",
					);

				default:
					throw new Error(`Unknown table: ${tableName}`);
			}
		},

		/**
		 * Find many entities with optional filters
		 */
		async findMany(
			tableName: string,
			options?: {
				where?: Record<string, any>;
				orderBy?: Record<string, "asc" | "desc">;
				limit?: number;
				offset?: number;
			},
		): Promise<any[]> {
			switch (tableName) {
				case "sessions":
				case "session": {
					// Map to getRecentSessionsMetadata with cursor-based pagination
					const limit = options?.limit || 20;
					const cursor = options?.offset; // Use offset as cursor for simplicity

					const result = await sessionRepository.getRecentSessionsMetadata(
						limit,
						cursor,
					);

					return result.items;
				}

				case "messages":
				case "message":
					throw new Error(
						"Messages should be loaded via session.messages, not standalone",
					);

				default:
					throw new Error(`Unknown table: ${tableName}`);
			}
		},

		/**
		 * Create new entity
		 */
		async create(tableName: string, data: any): Promise<any> {
			switch (tableName) {
				case "sessions":
				case "session":
					return await sessionRepository.createSession(
						data.provider,
						data.model,
						data.agentId || "coder",
						data.enabledRuleIds || [],
					);

				case "messages":
				case "message":
					throw new Error("Message creation should go through MessageRepository");

				default:
					throw new Error(`Unknown table: ${tableName}`);
			}
		},

		/**
		 * Update existing entity
		 */
		async update(tableName: string, id: string, data: any): Promise<any> {
			switch (tableName) {
				case "sessions":
				case "session": {
					// Use updateSession which accepts partial updates
					await sessionRepository.updateSession(id, data);

					// Return updated session
					return await sessionRepository.getSessionById(id);
				}

				case "messages":
				case "message":
					throw new Error("Message updates should go through MessageRepository");

				default:
					throw new Error(`Unknown table: ${tableName}`);
			}
		},

		/**
		 * Delete entity
		 */
		async delete(tableName: string, id: string): Promise<void> {
			switch (tableName) {
				case "sessions":
				case "session":
					await sessionRepository.deleteSession(id);
					break;

				case "messages":
				case "message":
					throw new Error("Message deletion should go through MessageRepository");

				default:
					throw new Error(`Unknown table: ${tableName}`);
			}
		},

		/**
		 * Batch load entities by IDs (for DataLoader)
		 */
		async batchLoadByIds(
			tableName: string,
			ids: readonly string[],
		): Promise<any[]> {
			switch (tableName) {
				case "sessions":
				case "session": {
					// Load sessions in parallel
					const sessions = await Promise.all(
						ids.map((id) => sessionRepository.getSessionById(id)),
					);
					return sessions;
				}

				case "messages":
				case "message":
					throw new Error(
						"Messages should be loaded via session.messages, not standalone",
					);

				default:
					throw new Error(`Unknown table: ${tableName}`);
			}
		},

		/**
		 * Batch load related entities (for relationship loading)
		 */
		async batchLoadRelated(
			tableName: string,
			foreignKey: string,
			parentIds: readonly string[],
		): Promise<any[]> {
			switch (tableName) {
				case "messages":
				case "message": {
					// Load messages for each session
					// This is already handled by getSessionById which includes messages
					// For now, we can load sessions and extract their messages
					const sessions = await Promise.all(
						parentIds.map((sessionId) =>
							sessionRepository.getSessionById(sessionId),
						),
					);

					// Flatten messages from all sessions
					const allMessages = sessions.flatMap((session) =>
						session ? session.messages : [],
					);

					return allMessages;
				}

				default:
					throw new Error(`Unknown related table: ${tableName}`);
			}
		},
	};
}
