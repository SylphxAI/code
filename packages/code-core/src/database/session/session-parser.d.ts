/**
 * Session data parsing and transformation
 * Handles Zod schemas, JSON parsing, and data migration/validation
 */
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { SessionMessage } from "../../types/session.types.js";
import type { Todo as TodoType } from "../../types/todo.types.js";
import type { SessionRow } from "./types.js";
/**
 * Parse and validate enabledRuleIds from raw database value
 */
export declare function parseEnabledRuleIds(raw: unknown): string[];
/**
 * Parse and validate optional string array from raw database value
 */
export declare function parseOptionalStringArray(raw: unknown): string[] | null;
/**
 * Parse raw session record and fix corrupted data
 */
export declare function parseSessionRow(raw: Record<string, unknown>, db: LibSQLDatabase): Promise<SessionRow | null>;
/**
 * Get messages for a session with step-based structure
 * Assembles steps, parts, attachments, usage into SessionMessage format
 * OPTIMIZED: Batch queries instead of N+1 queries
 */
export declare function getSessionMessages(db: LibSQLDatabase, sessionId: string): Promise<SessionMessage[]>;
/**
 * Get todos for a session
 */
export declare function getSessionTodos(db: LibSQLDatabase, sessionId: string): Promise<TodoType[]>;
//# sourceMappingURL=session-parser.d.ts.map