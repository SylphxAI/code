/**
 * Cross-Domain Computed Signals
 * Combines signals from different domains for derived state
 */

import { createMemo } from "solid-js";
import { useSignal } from "../../react-bridge.js";
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
	return config.providers?.[providerId]?.models?.find((m: any) => m.id === modelId) || null;
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
export const useIsAppReady = () => useSignal(isAppReady);
export const useCanStartChat = () => useSignal(canStartChat);
export const useActiveProviderConfig = () => useSignal(activeProviderConfig);
export const useCurrentModelConfig = () => useSignal(currentModelConfig);
export const useSessionContext = () => useSignal(sessionContext);
export const useIsAnyLoading = () => useSignal(isAnyLoading);
export const useHasAnyError = () => useSignal(hasAnyError);
export const useFirstError = () => useSignal(firstError);
