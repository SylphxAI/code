/**
 * Settings Domain Signals
 * Manages user settings (agent selection, enabled rules)
 */

import { createSignal } from "solid-js";
import { useSignal } from "../../react-bridge.js";
import { eventBus } from "../../../lib/event-bus.js";
import { getTRPCClient } from "../../../trpc-provider.js";
import * as ai from "../ai/index.js";

// Core settings signals
export const [selectedAgentId, setSelectedAgentId] = createSignal<string>("coder");
export const [enabledRuleIds, setEnabledRuleIds] = createSignal<string[]>([]);

// Actions
export const setSelectedAgent = async (agentId: string) => {
	// Update client state immediately (optimistic)
	setSelectedAgentId(agentId);

	// Persist to global config (remember last selected agent)
	const config = ai.aiConfig();
	if (config) {
		const client = getTRPCClient();
		await client.config.save.mutate({
			config: {
				...config,
				defaultAgentId: agentId,
			},
		});

		// Update AI config cache
		ai.setAiConfig({
			...config,
			defaultAgentId: agentId,
		});
	}
};

export const setGlobalEnabledRules = async (ruleIds: string[]) => {
	// Update client state immediately (optimistic)
	setEnabledRuleIds(ruleIds);

	// Persist to global config (always)
	const client = getTRPCClient();
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
	setEnabledRuleIds(ruleIds);

	// Call server endpoint - SERVER decides where to persist
	const client = getTRPCClient();
	await client.config.updateRules.mutate({
		ruleIds,
		sessionId: sessionId || undefined,
	});
};

// Hooks for React components
export const useSelectedAgentId = () => useSignal(selectedAgentId);
export const useEnabledRuleIds = () => useSignal(enabledRuleIds);

// Setup event listeners
eventBus.on("session:changed", ({ sessionId }: { sessionId: string | null }) => {
	// Clear enabled rules when no session
	if (!sessionId) {
		setEnabledRuleIds([]);
	}
});

eventBus.on("session:created", ({ enabledRuleIds: ruleIds }: { enabledRuleIds: string[] }) => {
	// Update settings with new session's rules
	setEnabledRuleIds(ruleIds);
});

eventBus.on("session:loaded", ({ enabledRuleIds: ruleIds }: { enabledRuleIds: string[] }) => {
	// Update settings when session loaded from server
	setEnabledRuleIds(ruleIds);
});

eventBus.on("session:rulesUpdated", ({ enabledRuleIds: ruleIds }: { enabledRuleIds: string[] }) => {
	// Update settings when current session's rules change
	setEnabledRuleIds(ruleIds);
});
