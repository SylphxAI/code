/**
 * Total Tokens Hook (SSOT)
 * Calculates total tokens using SAME logic as /context command
 *
 * ARCHITECTURE: Pure UI - server calculates, client displays
 * - SSOT: Uses buildModelMessages + calculateModelMessagesTokens
 * - With session: base context + messages tokens
 * - Without session: base context only
 * - Multi-client sync: all clients see same tokens (from server)
 *
 * This ensures StatusBar and /context show IDENTICAL numbers.
 */

import { useEffect, useState } from "react";
import { useTRPCClient } from "../trpc-provider.js";

/**
 * Calculate total tokens for current UI state
 * SSOT: Same calculation as /context command
 *
 * @param sessionId - Current session ID (null = no session)
 * @param provider - Selected provider (null = not selected yet)
 * @param model - Selected model (null = not selected yet)
 * @param agentId - Selected agent ID
 * @param enabledRuleIds - Enabled rule IDs
 * @returns Total tokens or 0 if not calculable
 */
export function useTotalTokens(
	sessionId: string | null,
	provider: string | null,
	model: string | null,
	agentId: string | null,
	enabledRuleIds: string[],
): number {
	const trpc = useTRPCClient();
	const [totalTokens, setTotalTokens] = useState(0);
	const [loading, setLoading] = useState(false);

	// Initial fetch when dependencies change
	useEffect(() => {
		// Only calculate if we have provider and model
		if (!provider || !model) {
			console.log("[useTotalTokens] No provider/model selected");
			setTotalTokens(0);
			return;
		}

		let mounted = true;

		async function fetchTotalTokens() {
			try {
				setLoading(true);

				console.log("[useTotalTokens] Fetching for:", {
					sessionId,
					provider,
					model,
					agentId: agentId || "coder",
					enabledRuleIds,
					ruleCount: enabledRuleIds.length,
				});

				const result = await trpc.session.getTotalTokens.query({
					sessionId,
					model,
					agentId: agentId || "coder",
					enabledRuleIds: enabledRuleIds || [],
				});

				console.log("[useTotalTokens] Raw result:", JSON.stringify(result, null, 2));

				if (mounted) {
					if (result.success) {
						console.log("[useTotalTokens] Success, updating state to:", result.totalTokens);
						setTotalTokens(result.totalTokens);
						console.log("[useTotalTokens] State updated, breakdown:", {
							totalTokens: result.totalTokens,
							baseContextTokens: result.baseContextTokens,
							messagesTokens: result.messagesTokens,
						});
					} else {
						console.error("[useTotalTokens] Failed:", result.error);
						setTotalTokens(0);
					}
				} else {
					console.log("[useTotalTokens] Component unmounted, skipping state update");
				}
			} catch (error) {
				if (mounted) {
					console.error("[useTotalTokens] Error:", error);
					setTotalTokens(0);
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		}

		fetchTotalTokens();

		return () => {
			mounted = false;
		};
	}, [trpc, sessionId, provider, model, agentId, JSON.stringify(enabledRuleIds)]);

	// Subscribe to token update events (real-time sync)
	// This ensures StatusBar updates immediately when tokens change
	// (e.g., after streaming completes, after /context calculation)
	useEffect(() => {
		if (!sessionId) return;

		const { eventBus } = require("../lib/event-bus.js");

		const unsubscribe = eventBus.on("streaming:completed", () => {
			// Refetch tokens after streaming completes
			console.log("[useTotalTokens] Streaming completed, refetching...");
			if (provider && model) {
				trpc.session
					.getTotalTokens.query({
						sessionId,
						model,
						agentId: agentId || "coder",
						enabledRuleIds: enabledRuleIds || [],
					})
					.then((result) => {
						if (result.success) {
							setTotalTokens(result.totalTokens);
						}
					})
					.catch(console.error);
			}
		});

		return unsubscribe;
	}, [trpc, sessionId, provider, model, agentId, enabledRuleIds]);

	return totalTokens;
}
