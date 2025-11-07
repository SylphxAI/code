/**
 * Settings Store
 * Manages user settings (agent, rules)
 *
 * Single Responsibility: User preference management
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getTRPCClient } from '../trpc-provider.js';

export interface SettingsState {
  // Agent selection
  selectedAgentId: string;
  setSelectedAgent: (agentId: string) => Promise<void>;

  // Rule selection
  enabledRuleIds: string[];
  setEnabledRuleIds: (ruleIds: string[]) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  immer((set, get) => ({
    selectedAgentId: 'coder',
    enabledRuleIds: [],

    /**
     * Set selected agent and persist to config
     */
    setSelectedAgent: async (agentId) => {
      // Update client state immediately (optimistic)
      set((state) => {
        state.selectedAgentId = agentId;
      });

      // Persist to global config (remember last selected agent)
      const { useAIConfigStore } = await import('./ai-config-store.js');
      const { aiConfig } = useAIConfigStore.getState();

      const client = getTRPCClient();
      await client.config.save.mutate({
        config: {
          ...aiConfig,
          defaultAgentId: agentId,
        },
      });

      // Update AI config store cache
      useAIConfigStore.setState((state) => {
        if (state.aiConfig) {
          state.aiConfig.defaultAgentId = agentId;
        }
      });
    },

    /**
     * Set enabled rules and persist
     * Saves to session if exists, otherwise to global config
     */
    setEnabledRuleIds: async (ruleIds) => {
      // Update client state immediately (optimistic)
      set((state) => {
        state.enabledRuleIds = ruleIds;
      });

      // Get session and AI config stores
      const { useSessionStore } = await import('./session-store.js');
      const { useAIConfigStore } = await import('./ai-config-store.js');
      const { currentSessionId } = useSessionStore.getState();
      const { aiConfig } = useAIConfigStore.getState();

      if (currentSessionId) {
        // Has session: persist to session database
        await useSessionStore.getState().updateSessionRules(currentSessionId, ruleIds);
      } else {
        // No session: persist to global config (user settings)
        const client = getTRPCClient();
        await client.config.save.mutate({
          config: {
            ...aiConfig,
            defaultEnabledRuleIds: ruleIds,
          },
        });

        // Update AI config store cache
        useAIConfigStore.setState((state) => {
          if (state.aiConfig) {
            state.aiConfig.defaultEnabledRuleIds = ruleIds;
          }
        });
      }
    },
  }))
);
