/**
 * System Message Triggers
 * Main entry point for checking and inserting system messages
 *
 * Architecture:
 * - Uses TriggerRegistry for managing triggers
 * - Each trigger returns message + flag updates
 * - Flags stored in session.flags for state tracking
 * - Bidirectional notifications (enter + exit states)
 */
import type { MessageRepository } from "../../database/message-repository.js";
import type { SessionRepository } from "../../database/session-repository.js";
export declare function initializeTriggers(): void;
/**
 * Check all triggers and return system messages to insert
 * Uses TriggerRegistry to check all enabled triggers by priority
 *
 * Returns array of results with messages and flag updates
 */
export declare function checkAllTriggers(session: Session, messageRepository: MessageRepository, sessionRepository: SessionRepository, contextTokens?: {
    current: number;
    max: number;
}): Promise<Array<{
    message: string;
    flagUpdates: Record<string, boolean>;
}>>;
/**
 * Insert system message into session
 * Creates a 'system' role message with the provided content
 */
export declare function insertSystemMessage(messageRepository: MessageRepository, sessionId: string, content: string): Promise<string>;
/**
 * Export registry for advanced usage (enable/disable triggers, etc.)
 */
export { triggerRegistry } from "./registry.js";
//# sourceMappingURL=triggers.d.ts.map