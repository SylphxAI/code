/**
 * Step Repository Helpers
 * Helper functions for step-based CRUD operations
 *
 * TEMPORARY: These helpers will be integrated into SessionRepository
 * For now, they exist as standalone functions to avoid breaking existing code
 */
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { MessagePart, MessageStep, SystemMessage, TokenUsage } from "../types/session.types.js";
import type { Todo as TodoType } from "../types/todo.types.js";
/**
 * Create a new step in a message
 *
 * @param systemMessages Optional system messages to insert BEFORE this step (for LLM context)
 * @param _todoSnapshot DEPRECATED - No longer stored per-step
 * @param _metadata DEPRECATED - No longer stored per-step
 */
export declare function createMessageStep(db: LibSQLDatabase, messageId: string, stepIndex: number, _metadata?: unknown, _todoSnapshot?: TodoType[], systemMessages?: SystemMessage[], provider?: string, model?: string, stepId?: string): Promise<string>;
/**
 * Update step parts (used during streaming)
 */
export declare function updateStepParts(db: LibSQLDatabase, stepId: string, parts: MessagePart[]): Promise<void>;
/**
 * Complete a step with final metadata
 */
export declare function completeMessageStep(db: LibSQLDatabase, stepId: string, options: {
    status: "completed" | "error" | "abort";
    finishReason?: string;
    usage?: TokenUsage;
    provider?: string;
    model?: string;
}): Promise<void>;
/**
 * Load steps for a message
 */
export declare function loadMessageSteps(db: LibSQLDatabase, messageId: string): Promise<MessageStep[]>;
//# sourceMappingURL=step-repository-helpers.d.ts.map