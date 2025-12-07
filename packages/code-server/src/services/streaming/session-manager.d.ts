/**
 * Session Manager
 * Handles session creation and loading
 */
import type { AIConfig, ProviderId, SessionRepository } from "@sylphx/code-core";
export interface CreateSessionOptions {
    sessionRepository: SessionRepository;
    aiConfig: AIConfig;
    provider: string;
    model: string;
    agentId?: string;
}
/**
 * Session result as discriminated union
 * Prevents illegal states where sessionId exists but isNewSession=true
 */
export type SessionResult = {
    type: "existing";
    sessionId: string;
} | {
    type: "new";
    sessionId: string;
    provider: ProviderId;
    model: string;
};
/**
 * Create new session if sessionId is null, otherwise return existing sessionId
 */
export declare function ensureSession(sessionRepository: SessionRepository, aiConfig: AIConfig, sessionId: string | null, provider?: ProviderId, model?: string, agentId?: string): Promise<SessionResult>;
//# sourceMappingURL=session-manager.d.ts.map