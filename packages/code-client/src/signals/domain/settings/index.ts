/**
 * Settings Domain Signals
 * Manages user settings (agent selection, enabled rules)
 */

import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";
import { eventBus } from "../../../lib/event-bus.js";
import { getTRPCClient } from "../../../trpc-provider.js";
import * as ai from "../ai/index.js";

// Core settings signals
export const selectedAgentId = zen<string>("coder");
export const enabledRuleIds = zen<string[]>([]);

// Setter functions for backwards compatibility
export const setSelectedAgentId = (value: string) => { (selectedAgentId as any).value = value };
export const setEnabledRuleIds = (value: string[]) => { (enabledRuleIds as any).value = value };

// Actions
export const setSelectedAgent = async (agentId: string) => {
	// Update client state immediately (optimistic)
	(selectedAgentId as any).value = agentId;

	// Persist to global config (remember last selected agent)
	const config = ai.aiConfig.value;
	if (config) {
		const client = getTRPCClient();
		// @ts-expect-error - tRPC router types not fully resolved
		await client.config.save.mutate({
			config: {
				...config,
				defaultAgentId: agentId,
			},
		});

		// Update AI config cache
		(ai.aiConfig as any).value = {
			...config,
			defaultAgentId: agentId,
		};
	}
};

export const setGlobalEnabledRules = async (ruleIds: string[]) => {
	// Update client state immediately (optimistic)
	(enabledRuleIds as any).value = ruleIds;

	// Persist to global config (always)
	const client = getTRPCClient();
	// @ts-expect-error - tRPC router types not fully resolved
	await client.config.updateRules.mutate({
		ruleIds,
		// No sessionId - always saves to global config
	});
};

/**
 * @deprecated Use setGlobalEnabledRules + updateSessionRules instead
 * This function has ambiguous behavior (server decides where to save)
 */
export const setEnabledRuleIdsDeprecated = async (ruleIds: string[], sessionId?: string | null) => {
	// Update client state immediately (optimistic)
	(enabledRuleIds as any).value = ruleIds;

	// Call server endpoint - SERVER decides where to persist
	const client = getTRPCClient();
	// @ts-expect-error - tRPC router types not fully resolved
	await client.config.updateRules.mutate({
		ruleIds,
		sessionId: sessionId || undefined,
	});
};

// Hooks for React components
export const useSelectedAgentId = () => useZen(selectedAgentId);
export const useEnabledRuleIds = () => useZen(enabledRuleIds);

// Setup event listeners
eventBus.on("session:changed", ({ sessionId }: { sessionId: string | null }) => {
	// Clear enabled rules when no session
	if (!sessionId) {
		(enabledRuleIds as any).value = [];
	}
});

eventBus.on("session:created", ({ enabledRuleIds: ruleIds }: { enabledRuleIds: string[] }) => {
	// Update settings with new session's rules
	(enabledRuleIds as any).value = ruleIds;
});

eventBus.on("session:loaded", ({ enabledRuleIds: ruleIds }: { enabledRuleIds: string[] }) => {
	// Update settings when session loaded from server
	(enabledRuleIds as any).value = ruleIds;
});

eventBus.on("session:rulesUpdated", ({ enabledRuleIds: ruleIds }: { enabledRuleIds: string[] }) => {
	// Update settings when current session's rules change
	(enabledRuleIds as any).value = ruleIds;
});
