/**
 * Session Manager
 * Handles session creation and loading
 */

import type { SessionRepository, AIConfig } from "@sylphx/code-core";
import { DEFAULT_AGENT_ID } from "@sylphx/code-core";

export interface CreateSessionOptions {
	sessionRepository: SessionRepository;
	aiConfig: AIConfig;
	provider: string;
	model: string;
	agentId?: string;
}

export interface SessionResult {
	sessionId: string;
	isNewSession: boolean;
}

/**
 * Create new session if sessionId is null, otherwise return existing sessionId
 */
export async function ensureSession(
	sessionRepository: SessionRepository,
	aiConfig: AIConfig,
	sessionId: string | null,
	provider?: string,
	model?: string,
	agentId?: string,
): Promise<SessionResult> {
	// Return existing session
	if (sessionId) {
		return { sessionId, isNewSession: false };
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
	const newSession = await sessionRepository.createSession(
		provider as any,
		model,
		effectiveAgentId,
	);

	return {
		sessionId: newSession.id,
		isNewSession: true,
	};
}
