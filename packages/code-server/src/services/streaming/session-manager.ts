/**
 * Session Manager
 * Handles session creation and loading
 */

import type { AIConfig, ProviderId, SessionRepository } from "@sylphx/code-core";
import { DEFAULT_AGENT_ID } from "@sylphx/code-core";

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
export type SessionResult =
	| { type: "existing"; sessionId: string }
	| { type: "new"; sessionId: string; provider: ProviderId; model: string };

/**
 * Create new session if sessionId is null, otherwise return existing sessionId
 */
export async function ensureSession(
	sessionRepository: SessionRepository,
	aiConfig: AIConfig,
	sessionId: string | null,
	provider?: ProviderId,
	model?: string,
	agentId?: string,
): Promise<SessionResult> {
	// Return existing session
	if (sessionId) {
		return { type: "existing", sessionId };
	}

	// Create new session
	if (!provider || !model) {
		throw new Error("Provider and model required when creating new session");
	}

	console.log("[session-manager] Checking provider:", provider);
	console.log("[session-manager] aiConfig:", aiConfig);
	console.log("[session-manager] aiConfig.providers:", aiConfig?.providers);
	console.log("[session-manager] Available providers:", Object.keys(aiConfig?.providers || {}));

	const providerConfig = aiConfig?.providers?.[provider];
	console.log("[session-manager] providerConfig for", provider, ":", providerConfig);

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
