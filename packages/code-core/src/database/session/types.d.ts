/**
 * Internal types for session repository operations
 */
import type { ProviderId } from "../../config/ai-config.js";
/**
 * Session row from database (raw data)
 */
export interface SessionRow {
    id: string;
    title: string | null;
    modelId: string | null;
    provider: string | null;
    model: string | null;
    agentId: string;
    enabledRuleIds: string[];
    toolIds: string[] | null;
    mcpServerIds: string[] | null;
    nextTodoId: number;
    created: number;
    updated: number;
    flags?: Record<string, boolean>;
    baseContextTokens?: number;
    totalTokens?: number;
}
/**
 * Session metadata for list views
 */
export interface SessionMetadata {
    id: string;
    title?: string;
    provider: ProviderId;
    model: string;
    agentId: string;
    created: number;
    updated: number;
    messageCount: number;
}
/**
 * Paginated result with cursor
 */
export interface PaginatedResult<T> {
    sessions: T[];
    nextCursor: number | null;
}
//# sourceMappingURL=types.d.ts.map