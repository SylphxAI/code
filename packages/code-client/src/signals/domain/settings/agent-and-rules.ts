/**
 * Agent and Rules Settings Domain Signals
 * Manages global defaults for agent and rule selection
 *
 * Architecture note:
 * - These are GLOBAL defaults, used when creating new sessions
 * - Each session has its own agent/rules in session.enabledRuleIds
 * - When user changes global defaults, it affects NEW sessions only
 * - Use updateSessionRules() from session signals to update current session
 */

import { loadSettings, saveSettings } from "@sylphx/code-core";
import { zen } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";

// Global default signals
export const selectedAgentId = zen<string | null>(null);
export const globalEnabledRules = zen<string[]>([]);

// React hooks
export function useSelectedAgentId(): string | null {
	return useZen(selectedAgentId);
}

export function useGlobalEnabledRules(): string[] {
	return useZen(globalEnabledRules);
}

// Legacy alias for backwards compatibility
export function useEnabledRuleIds(): string[] {
	return useZen(globalEnabledRules);
}

// Getter functions for non-React code
export function getSelectedAgentId(): string | null {
	return selectedAgentId.value;
}

export function getGlobalEnabledRules(): string[] {
	return globalEnabledRules.value;
}

// Legacy alias for backwards compatibility with embedded-context.ts
export function enabledRuleIds(): string[] {
	return globalEnabledRules.value;
}

// Setter functions
export function setSelectedAgentId(agentId: string | null): void {
	selectedAgentId.value = agentId;
}

export function setEnabledRuleIds(ruleIds: string[]): void {
	globalEnabledRules.value = ruleIds;
}

// Actions (async, persisted to config)

/**
 * Set global default enabled rules and persist to config
 * This affects NEW sessions only (current session unchanged)
 */
export async function setGlobalEnabledRules(ruleIds: string[]): Promise<void> {
	// Update signal
	globalEnabledRules.value = ruleIds;

	// Persist to config file
	const result = await saveSettings({ defaultEnabledRuleIds: ruleIds });
	if (!result.success) {
		console.error("[setGlobalEnabledRules] Failed to persist:", result.error);
	}
}

/**
 * Set global default agent and persist to config
 * This affects NEW sessions only (current session unchanged)
 */
export async function setGlobalAgentId(agentId: string | null): Promise<void> {
	// Update signal
	selectedAgentId.value = agentId;

	// Persist to config file
	const result = await saveSettings({ defaultAgentId: agentId || undefined });
	if (!result.success) {
		console.error("[setGlobalAgentId] Failed to persist:", result.error);
	}
}

/**
 * Load global defaults from config file
 * Called once during app initialization
 */
export async function loadGlobalDefaults(): Promise<void> {
	const result = await loadSettings();
	if (result.success) {
		if (result.data.defaultAgentId) {
			selectedAgentId.value = result.data.defaultAgentId;
		}
		if (result.data.defaultEnabledRuleIds) {
			globalEnabledRules.value = result.data.defaultEnabledRuleIds;
		}
	}
}
