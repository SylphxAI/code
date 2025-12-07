/**
 * Session Manager
 * Handles session creation and loading
 */
import { DEFAULT_AGENT_ID } from "@sylphx/code-core";
/**
 * Create new session if sessionId is null, otherwise return existing sessionId
 */
export async function ensureSession(sessionRepository, aiConfig, sessionId, provider, model, agentId) {
    // Return existing session
    if (sessionId) {
        return { type: "existing", sessionId };
    }
    // Create new session
    if (!provider || !model) {
        throw new Error("Provider and model required when creating new session");
    }
    const providerConfig = aiConfig?.providers?.[provider];
    if (!providerConfig) {
        throw new Error("Provider not configured. Please configure your provider using settings.");
    }
    // Create session in database
    const effectiveAgentId = agentId || DEFAULT_AGENT_ID;
    const newSession = await sessionRepository.createSession(provider, model, effectiveAgentId);
    return {
        type: "new",
        sessionId: newSession.id,
        provider,
        model,
    };
}
//# sourceMappingURL=session-manager.js.map