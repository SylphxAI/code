/**
 * Signal Effects
 * Handles side effects and cross-domain communication
 */

import { createEffect, onCleanup } from "solid-js";
import * as ai from "../domain/ai";
import * as session from "../domain/session";
import * as ui from "../domain/ui";
import { emitAIEvent, emitSessionEvent, emitUIEvent } from "../events";

export let initialized = false;

export const initializeEffects = () => {
	if (initialized) return;
	initialized = true;

	// Session domain effects
	createEffect(() => {
		const currentSessionValue = session.currentSession();
		if (currentSessionValue) {
			emitSessionEvent("session:loaded", { sessionId: currentSessionValue.id });
		}
	});

	createEffect(() => {
		const isStreamingValue = session.isStreaming();
		emitUIEvent(isStreamingValue ? "loading:started" : "loading:finished", {
			context: "streaming",
		});
	});

	// AI domain effects
	createEffect(() => {
		const config = ai.aiConfig();
		if (config) {
			emitAIEvent("config:loaded", { config });
		}
	});

	createEffect(() => {
		const providerId = ai.selectedProvider();
		if (providerId) {
			emitAIEvent("provider:selected", { providerId });
		}
	});

	createEffect(() => {
		const providerId = ai.selectedProvider();
		const modelId = ai.selectedModel();
		if (providerId && modelId) {
			emitAIEvent("model:selected", { providerId, modelId: modelId });
		}
	});

	createEffect(() => {
		const error = ai.configError();
		if (error) {
			emitUIEvent("error:shown", { error });
		}
	});

	// UI domain effects
	createEffect(() => {
		const currentScreenValue = ui.currentScreen();
		const previousScreenValue = ui.previousScreen();
		if (previousScreenValue && previousScreenValue !== currentScreenValue) {
			emitUIEvent("navigation:changed", {
				from: previousScreenValue,
				to: currentScreenValue,
			});
		}
	});

	// Cross-domain effects
	createEffect(() => {
		const config = ai.aiConfig();
		// When AI config loads, set default provider if not already set
		if (config?.defaultProvider && !ai.selectedProvider()) {
			ai.setSelectedProvider(config.defaultProvider);
		}
	});

	// Auto-select session when config loads
	createEffect(() => {
		const config = ai.aiConfig();
		const currentSessionId = session.currentSessionId();
		if (config && !currentSessionId) {
			// Auto-create temp session when config is ready
			session.setCurrentSessionId("temp-session");
		}
	});

	// Clean global loading state
	createEffect(() => {
		const loading = ai.isConfigLoading();
		ui.setLoading?.(loading);
	});

	// SolidJS cleanup is handled automatically
	onCleanup(() => {
		// Effects are automatically disposed
	});
};
