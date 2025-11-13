/**
 * Session Token Calculator
 * Calculates and updates token counts for sessions
 *
 * ARCHITECTURE: Server-side only
 * - Uses Hugging Face tokenizer for accurate counting
 * - Calculates baseContextTokens on session creation
 * - Updates totalTokens after each message
 * - Never runs on client (pure UI)
 *
 * SSOT: Database is Single Source of Truth
 * - persistSessionTokens() is the ONLY function that writes to DB
 * - All calculations use TokenCalculator for consistency
 * - Called at checkpoints: step completion, session creation
 */

import type { SessionRepository } from "../database/session-repository.js";
import type { ProviderId } from "../config/ai-config.js";
import { countTokens } from "../utils/token-counter.js";
import { buildSystemPrompt } from "./system-prompt-builder.js";
import { loadAllAgents } from "./agent-loader.js";
import { loadAllRules } from "./rule-loader.js";
import { getAISDKTools } from "../tools/registry.js";
import type { SessionMessage } from "../types/session.types.js";
import { TokenCalculator } from "./token-calculator.js";

/**
 * Calculate base context tokens (system prompt + tools)
 * Called once on session creation
 */
export async function calculateBaseContextTokens(
	modelName: string,
	agentId: string,
	enabledRuleIds: string[],
	cwd: string,
): Promise<number> {
	// Load agent and rules
	const allAgents = await loadAllAgents(cwd);
	const allRules = await loadAllRules(cwd);
	const enabledRules = allRules.filter((rule) => enabledRuleIds.includes(rule.id));

	// Build system prompt
	const systemPrompt = buildSystemPrompt(agentId, allAgents, enabledRules);
	const systemPromptTokens = await countTokens(systemPrompt, modelName);

	// Calculate tools tokens
	const tools = getAISDKTools();
	let toolsTokens = 0;

	for (const [toolName, toolDef] of Object.entries(tools)) {
		const toolRepresentation = {
			name: toolName,
			description: toolDef.description || "",
			parameters: toolDef.parameters || {},
		};
		const toolJson = JSON.stringify(toolRepresentation, null, 0);
		const tokens = await countTokens(toolJson, modelName);
		toolsTokens += tokens;
	}

	return systemPromptTokens + toolsTokens;
}

/**
 * Calculate message tokens using TokenCalculator
 * DEPRECATED: Use TokenCalculator.calculateMessageTokens() directly
 * Kept for backward compatibility
 */
async function calculateMessageTokens(
	message: SessionMessage,
	modelName: string,
): Promise<number> {
	const calculator = new TokenCalculator(modelName);
	return await calculator.calculateMessageTokens(message);
}

/**
 * Calculate total tokens for session (base + all messages)
 * Using TokenCalculator for unified logic
 */
export async function calculateTotalTokens(
	sessionId: string,
	sessionRepository: SessionRepository,
): Promise<{ baseContextTokens: number; totalTokens: number }> {
	// Get session to access model and messages
	const session = await sessionRepository.getSessionById(sessionId);
	if (!session) {
		throw new Error(`Session ${sessionId} not found`);
	}

	// If baseContextTokens not calculated yet, calculate it now
	let baseContextTokens = session.baseContextTokens || 0;
	if (baseContextTokens === 0) {
		const cwd = process.cwd();
		baseContextTokens = await calculateBaseContextTokens(
			session.model,
			session.agentId,
			session.enabledRuleIds,
			cwd,
		);
	}

	// Calculate messages tokens using TokenCalculator
	const calculator = new TokenCalculator(session.model);
	const messagesTokens = await calculator.calculateSessionTokens(session.messages);

	const totalTokens = baseContextTokens + messagesTokens;

	return { baseContextTokens, totalTokens };
}

/**
 * Persist session tokens to database
 * SSOT: This is the ONLY function that writes session tokens to DB
 *
 * Called at checkpoints:
 * - Step completion (after all parts including tools are complete)
 * - Session creation (for baseContextTokens)
 * - Manual recalculation (e.g., /context command)
 *
 * @returns Calculated tokens that were persisted
 */
export async function persistSessionTokens(
	sessionId: string,
	sessionRepository: SessionRepository,
): Promise<{ baseContextTokens: number; totalTokens: number }> {
	// Calculate using unified logic
	const tokens = await calculateTotalTokens(sessionId, sessionRepository);

	// Write to DB (SSOT update)
	await sessionRepository.updateSessionTokens(sessionId, tokens);

	console.log("[persistSessionTokens] SSOT updated:", {
		sessionId,
		baseContextTokens: tokens.baseContextTokens,
		totalTokens: tokens.totalTokens,
	});

	return tokens;
}

/**
 * Update session tokens after message is added
 * DEPRECATED: Use persistSessionTokens() directly
 * Kept for backward compatibility
 */
export async function updateSessionTokens(
	sessionId: string,
	sessionRepository: SessionRepository,
): Promise<void> {
	await persistSessionTokens(sessionId, sessionRepository);
}
