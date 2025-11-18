/**
 * Signal Effects
 * Handles side effects and cross-domain communication
 */

import { effect } from "@sylphx/zen";
import * as ai from "../domain/ai";
import * as session from "../domain/session";
import * as ui from "../domain/ui";
import { emitAIEvent, emitSessionEvent, emitUIEvent } from "../events";

export let initialized = false;

export const initializeEffects = () => {
	if (initialized) return;
	initialized = true;

	// Session domain effects
	effect(() => {
		const currentSessionValue = session.currentSession.value;
		if (currentSessionValue) {
			emitSessionEvent("session:loaded", { sessionId: currentSessionValue.id });
		}
	});

	effect(() => {
		const isStreamingValue = session.isStreaming.value;
		emitUIEvent(isStreamingValue ? "loading:started" : "loading:finished", {
			context: "streaming",
		});
	});

	// AI domain effects
	effect(() => {
		const config = ai.aiConfig.value;
		if (config) {
			emitAIEvent("config:loaded", { config });
		}
	});

	effect(() => {
		const providerId = ai.selectedProvider.value;
		if (providerId) {
			emitAIEvent("provider:selected", { providerId });
		}
	});

	effect(() => {
		const providerId = ai.selectedProvider.value;
		const modelId = ai.selectedModel.value;
		if (providerId && modelId) {
			emitAIEvent("model:selected", { providerId, modelId: modelId });
		}
	});

	effect(() => {
		const error = ai.configError.value;
		if (error) {
			emitUIEvent("error:shown", { error });
		}
	});

	// UI domain effects
	effect(() => {
		const currentScreenValue = ui.currentScreen.value;
		const previousScreenValue = ui.previousScreen.value;
		if (previousScreenValue && previousScreenValue !== currentScreenValue) {
			emitUIEvent("navigation:changed", {
				from: previousScreenValue,
				to: currentScreenValue,
			});
		}
	});

	// Cross-domain effects
	effect(() => {
		const config = ai.aiConfig.value;
		// When AI config loads, set default provider if not already set
		if (config?.defaultProvider && !ai.selectedProvider.value) {
			(ai.selectedProvider as any).value = config.defaultProvider;
		}
	});

	// Auto-select session when config loads
	effect(() => {
		const config = ai.aiConfig.value;
		const currentSessionId = session.currentSessionId.value;
		if (config && !currentSessionId) {
			// Auto-create temp session when config is ready
			(session.currentSessionId as any).value = "temp-session";
		}
	});

	// Clean global loading state
	effect(() => {
		const loading = ai.isConfigLoading.value;
		ui.setLoading?.(loading);
	});
};
