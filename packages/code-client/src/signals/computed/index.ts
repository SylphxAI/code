/**
 * Cross-Domain Computed Signals
 * Combines signals from different domains for derived state
 */

import { computed } from "@sylphx/zen";
import { useZen } from "../react-bridge.js";
import * as ai from "../domain/ai/index.js";
import * as session from "../domain/session/index.js";
import * as ui from "../domain/ui/index.js";

// App readiness computed signal
export const isAppReady = computed(() => ai.hasConfig.value && session.hasCurrentSession.value);

// Chat availability computed signal
export const canStartChat = computed(() => {
	return ai.hasConfig.value && session.currentSessionId.value !== null && ui.currentScreen.value === "chat";
});

// Active provider configuration
export const activeProviderConfig = computed(() => {
	const config = ai.aiConfig.value;
	const providerId = ai.selectedProvider.value;
	if (!config || !providerId) return null;
	return config.providers?.[providerId] || null;
});

// Current model configuration
export const currentModelConfig = computed(() => {
	const config = ai.aiConfig.value;
	const providerId = ai.selectedProvider.value;
	const modelId = ai.selectedModel.value;
	if (!config || !providerId || !modelId) return null;
	return config.providers?.[providerId]?.models?.find((m: any) => m.id === modelId) || null;
});

// Session context for AI requests
export const sessionContext = computed(() => {
	const currentSession = session.currentSession.value;
	const messages = session.messages.value;
	return {
		sessionId: currentSession?.id,
		messageCount: messages.length,
		hasMessages: messages.length > 0,
	};
});

// UI state combined with loading states
export const isAnyLoading = computed(
	() => ai.isConfigLoading.value || session.sessionsLoading.value || ui.isLoading.value,
);

// Error state aggregation
export const hasAnyError = computed(() => !!(ui.error.value || ai.configError.value));

export const firstError = computed(() => ui.error.value || ai.configError.value || null);

// Hooks for React components
export const useIsAppReady = () => useZen(isAppReady);
export const useCanStartChat = () => useZen(canStartChat);
export const useActiveProviderConfig = () => useZen(activeProviderConfig);
export const useCurrentModelConfig = () => useZen(currentModelConfig);
export const useSessionContext = () => useZen(sessionContext);
export const useIsAnyLoading = () => useZen(isAnyLoading);
export const useHasAnyError = () => useZen(hasAnyError);
export const useFirstError = () => useZen(firstError);
