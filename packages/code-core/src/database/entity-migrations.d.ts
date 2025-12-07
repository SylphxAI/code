/**
 * Entity Migration Utilities
 *
 * Utilities for migrating data to the new normalized entity structure.
 * Handles migration of:
 * - Sessions: provider+model → modelId
 * - MessagePart: tool naming and MCP server tracking
 * - Todos: entity relationships
 * - AIConfig: credential system
 */
import type { ProviderId } from "../ai/providers/index.js";
import type { AIConfig } from "../config/ai-config.js";
import type { MessagePart, Session, SessionMetadata } from "../types/session.types.js";
import type { Todo } from "../types/todo.types.js";
/**
 * Migrate session to use normalized modelId
 * Converts legacy provider+model to normalized modelId
 */
export declare function migrateSessionToModelId<T extends {
    provider?: ProviderId | string;
    model?: string;
    modelId?: string;
}>(session: T): T & {
    modelId: string;
};
/**
 * Migrate session metadata to normalized structure
 */
export declare function migrateSessionMetadata(metadata: Partial<SessionMetadata>): SessionMetadata;
/**
 * Migrate full session to normalized structure
 */
export declare function migrateSession(session: Partial<Session>): Session;
/**
 * Migrate MessagePart to add MCP server tracking
 * Adds mcpServerId field for MCP tools
 */
export declare function migrateMessagePart(part: MessagePart): MessagePart;
/**
 * Migrate Todo to add entity relationships
 */
export declare function migrateTodo(todo: Todo): Todo;
/**
 * Migrate AIConfig to use normalized structure
 */
export declare function migrateAIConfig(config: Partial<AIConfig>): AIConfig;
/**
 * Batch migrate multiple sessions
 */
export declare function batchMigrateSessions(sessions: Partial<Session>[]): Session[];
/**
 * Batch migrate message parts
 */
export declare function batchMigrateMessageParts(parts: MessagePart[]): MessagePart[];
/**
 * Batch migrate todos
 */
export declare function batchMigrateTodos(todos: Todo[]): Todo[];
/**
 * Get migration statistics for a session
 */
export declare function getSessionMigrationStats(session: Partial<Session>): {
    needsModelIdMigration: boolean;
    needsToolMigration: boolean;
    needsTodoMigration: boolean;
    totalMessageParts: number;
    totalTodos: number;
};
//# sourceMappingURL=entity-migrations.d.ts.map