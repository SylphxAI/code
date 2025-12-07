/**
 * Embedded Context Helpers
 * Temporary bridge to access embedded server's AppContext
 *
 * TEMPORARY: These functions are a compatibility layer for the TUI.
 * They will be replaced with proper tRPC calls in the future.
 */

import { getEnabledRuleIds, setEnabledRuleIds, getCurrentSessionId, setSelectedAgentId } from "./session-state.js";
import type { Agent, Rule } from "@sylphx/code-core";
import type { CodeServer } from "@sylphx/code-server";

let embeddedServerInstance: CodeServer | null = null;

/**
 * Set the embedded server instance
 * Called once during TUI initialization
 */
export function setEmbeddedServer(server: CodeServer): void {
	embeddedServerInstance = server;
}

/**
 * Get all available agents
 */
export function getAllAgents(): Agent[] {
	if (!embeddedServerInstance) {
		throw new Error("Embedded server not initialized");
	}
	return embeddedServerInstance.getAppContext().agentManager.getAll();
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): Agent | null {
	if (!embeddedServerInstance) {
		throw new Error("Embedded server not initialized");
	}
	return embeddedServerInstance.getAppContext().agentManager.getById(id);
}

// REMOVED: getCurrentAgent - use useAppStore.getState().selectedAgentId + getAgentById
// REMOVED: switchAgent - use useAppStore.getState().setSelectedAgent

/**
 * Get all available rules
 */
export function getAllRules(): Rule[] {
	if (!embeddedServerInstance) {
		throw new Error("Embedded server not initialized");
	}
	return embeddedServerInstance.getAppContext().ruleManager.getAll();
}

/**
 * Get rule by ID
 */
export function getRuleById(id: string): Rule | null {
	if (!embeddedServerInstance) {
		throw new Error("Embedded server not initialized");
	}
	return embeddedServerInstance.getAppContext().ruleManager.getById(id);
}

/**
 * Get enabled rule IDs from SolidJS signals
 */
export function getCurrentEnabledRuleIds(): string[] {
	return getEnabledRuleIds();
}

/**
 * Set enabled rules in local state
 * UNIFIED ARCHITECTURE: Always updates both global AND session (if exists)
 * - Global: To predict user's future preferences
 * - Session: To apply immediately to current conversation
 * - Old sessions: Never affected
 */
export async function setEnabledRules(ruleIds: string[]): Promise<boolean> {
	// Update local state (global default)
	setEnabledRuleIds(ruleIds);

	// Session updates handled via lens mutations (caller's responsibility)
	return true;
}

/**
 * Toggle a rule on/off
 * UNIFIED ARCHITECTURE: Always updates both global AND session (if exists)
 */
export async function toggleRule(ruleId: string): Promise<boolean> {
	const rule = getRuleById(ruleId);
	if (!rule) {
		return false;
	}

	const currentEnabled = getCurrentEnabledRuleIds();

	const newRuleIds = currentEnabled.includes(ruleId)
		? currentEnabled.filter((id) => id !== ruleId) // Disable: remove from list
		: [...currentEnabled, ruleId]; // Enable: add to list

	// Update local state
	setEnabledRuleIds(newRuleIds);

	// Session updates handled via lens mutations (caller's responsibility)
	return true;
}

/**
 * Set selected agent in local state
 */
export async function setSelectedAgent(agentId: string): Promise<void> {
	setSelectedAgentId(agentId);
}
