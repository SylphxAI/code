/**
 * Legacy Session Manager (File-Based Sessions)
 *
 * @deprecated This module is kept for backward compatibility with headless mode only.
 *
 * For new development, use:
 * - Database Sessions: code-core/src/database/session-repository.ts
 * - AppContext Services: code-server/src/context.ts
 *
 * Legacy file-based sessions stored in: ~/.sylphx/sessions/
 * Main database sessions stored in: SQLite database
 *
 * Migration Guide:
 * 1. File sessions are simple: { id, provider, model, messages[], todos[], created, updated }
 * 2. Database sessions support: multi-step messages, file references, system messages, metadata
 * 3. To migrate: Load file session, create database session via SessionRepository
 */
import type { ProviderId } from "../config/ai-config.js";
import type { Session } from "../types/session.types.js";
export type { Session } from "../types/session.types.js";
/**
 * Create new session
 */
export declare function createSession(provider: ProviderId, model: string): Promise<Session>;
/**
 * Save session to file
 */
export declare function saveSession(session: Session): Promise<void>;
/**
 * Load session from file with migration support
 * Automatically adds missing fields from newer schema versions
 */
export declare function loadSession(sessionId: string): Promise<Session | null>;
/**
 * Get last session ID
 */
export declare function getLastSessionId(): Promise<string | null>;
/**
 * Set last session ID
 */
export declare function setLastSession(sessionId: string): Promise<void>;
/**
 * Load last session
 */
export declare function loadLastSession(): Promise<Session | null>;
/**
 * Add message to session (in-memory helper for headless mode)
 * Converts string content to MessagePart[] format
 */
export declare function addMessage(session: Session, role: "user" | "assistant", content: string): Session;
/**
 * Clear session messages but keep metadata
 */
export declare function clearSessionMessages(session: Session): Session;
//# sourceMappingURL=legacy-session-manager.d.ts.map