/**
 * Cross-Domain Computed Signals
 * Combines signals from different domains for derived state
 */

import { createMemo } from "solid-js";
import { useStore } from "@sylphx/zen-react";
import * as ai from "../domain/ai/index.js";
import * as session from "../domain/session/index.js";
import * as ui from "../domain/ui/index.js";

// App readiness computed signal
export const isAppReady = createMemo(() => ai.hasConfig() && session.hasCurrentSession());

// Chat availability computed signal
export const canStartChat = createMemo(() => {
	return ai.hasConfig() && session.currentSessionId() !== null && ui.currentScreen() === "chat";
});

// Active provider configuration
export const activeProviderConfig = createMemo(() => {
	const config = ai.aiConfig();
	const providerId = ai.selectedProvider();
	if (!config || !providerId) return null;
	return config.providers?.[providerId] || null;
});

// Current model configuration
export const currentModelConfig = createMemo(() => {
	const config = ai.aiConfig();
	const providerId = ai.selectedProvider();
	const modelId = ai.selectedModel();
	if (!config || !providerId || !modelId) return null;
	return config.providers?.[providerId]?.models?.find((m) => m.id === modelId) || null;
});

// Session context for AI requests
export const sessionContext = createMemo(() => {
	const currentSession = session.currentSession();
	const messages = session.messages();
	return {
		sessionId: currentSession?.id,
		messageCount: messages.length,
		hasMessages: messages.length > 0,
	};
});

// UI state combined with loading states
export const isAnyLoading = createMemo(
	() => ai.isConfigLoading() || session.sessionsLoading() || ui.isLoading(),
);

// Error state aggregation
export const hasAnyError = createMemo(() => !!(ui.error() || ai.configError()));

export const firstError = createMemo(() => ui.error() || ai.configError() || null);

// Hooks for React components
export const useIsAppReady = () => useStore(isAppReady);
export const useCanStartChat = () => useStore(canStartChat);
export const useActiveProviderConfig = () => useStore(activeProviderConfig);
export const useCurrentModelConfig = () => useStore(currentModelConfig);
export const useSessionContext = () => useStore(sessionContext);
export const useIsAnyLoading = () => useStore(isAnyLoading);
export const useHasAnyError = () => useStore(hasAnyError);
export const useFirstError = () => useStore(firstError);
