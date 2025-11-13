/**
 * Token Calculation Hook
 * Calculates total token usage for the current session
 *
 * NEW DESIGN: Use cached base context + estimated message tokens
 * - Base context (system + tools): Fetched once and cached per model/agent/rules
 * - Message tokens: Estimated from content length (client-side, fast)
 * - Does NOT rely on AI provider usage reports (unreliable)
 */

import { useMemo, useEffect } from "react";
import type { Session } from "@sylphx/code-core";
import { get, set } from "@sylphx/zen";
import { $baseContextTokens } from "../signals/domain/ui/index.js";
import { getTRPCClient } from "../trpc.js";

/**
 * Fast client-side token estimation
 * Based on ~3.5 chars per token for code (fallback method from token-counter)
 */
function estimateTokens(text: string): number {
	if (!text) return 0;
	const chars = text.length;
	return Math.ceil(chars / 3.5);
}

export function useTokenCalculation(currentSession: Session | null): number {
	// Fetch base context tokens if not cached
	useEffect(() => {
		if (!currentSession) return;

		const cached = get($baseContextTokens);
		const cacheKey = `${currentSession.modelId}-${currentSession.agentId}-${currentSession.enabledRuleIds.sort().join(",")}`;
		const cachedKey = cached
			? `${cached.modelId}-${cached.agentId}-${cached.ruleIds}`
			: null;

		// Cache hit
		if (cachedKey === cacheKey) return;

		// Cache miss - fetch from server
		const trpc = getTRPCClient();
		trpc.session.getContextInfo
			.query({ sessionId: null }) // null = base context only
			.then((result) => {
				if (result.success) {
					const baseTokens = result.systemPromptTokens + result.toolsTokensTotal;
					set($baseContextTokens, {
						modelId: currentSession.modelId,
						agentId: currentSession.agentId,
						ruleIds: currentSession.enabledRuleIds.sort().join(","),
						tokens: baseTokens,
					});
				}
			})
			.catch((error) => {
				console.error("[useTokenCalculation] Failed to fetch base context:", error);
			});
	}, [
		currentSession?.modelId,
		currentSession?.agentId,
		currentSession?.enabledRuleIds.join(","),
	]);

	return useMemo(() => {
		if (!currentSession) {
			return 0;
		}

		// Get cached base context tokens
		const cached = get($baseContextTokens);
		const baseTokens = cached?.tokens || 30000; // Fallback estimate if cache not ready

		// Estimate message tokens from content
		let messageTokens = 0;
		for (const message of currentSession.messages) {
			messageTokens += estimateTokens(message.content);
		}

		return baseTokens + messageTokens;
	}, [
		currentSession?.id,
		currentSession?.messages.length,
		currentSession?.messages.map((m) => m.content).join("").length, // Depend on content length
	]);
}
