/**
 * Model Command
 * Switch AI model using component-based UI
 */

import { getModelCompletions } from "../../completions/model.js";
import { ModelSelection } from "../../screens/chat/components/ModelSelection.js";
import type { Command } from "../types.js";

export const modelCommand: Command = {
	id: "model",
	label: "/model",
	description: "Switch AI model",
	silent: true, // UI-only command, don't add to conversation
	args: [
		{
			name: "model-name",
			description: "Model to switch to",
			required: false,
			loadOptions: async () => {
				return getModelCompletions();
			},
		},
	],
	execute: async (context) => {
		// Get zen signals
		const { get } = await import("@sylphx/code-client");
		const {
			aiConfig: aiConfigSignal,
			currentSession: currentSessionSignal,
			selectedProvider: selectedProviderSignal,
			currentSessionId: currentSessionIdSignal,
			setAIConfig,
			updateSessionModel,
		} = await import("@sylphx/code-client");

		// If arg provided, switch directly
		if (context.args.length > 0) {
			const modelId = context.args[0];
			const currentSession = currentSessionSignal.value;
			const aiConfig = aiConfigSignal.value;
			const provider = currentSession?.provider || aiConfig?.defaultProvider;

			if (!provider) {
				return "No provider configured. Please use /provider to select a provider first.";
			}

			if (!aiConfig?.providers?.[provider]) {
				return `Provider ${provider} is not configured. Please configure it using /provider first.`;
			}

			// Validate the model exists for this provider
			try {
				context.addLog(`Loading models from ${provider}...`);
				const { getTRPCClient } = await import("@sylphx/code-client");
				const trpc = getTRPCClient();
				const result = await trpc.config.fetchModels.query({ providerId: provider });

				if (result.success) {
					const modelExists = result.models.some((m) => m.id === modelId);

					if (!modelExists) {
						const availableModels = result.models.map((m) => m.id).join(", ");
						return `Model '${modelId}' not found for ${provider}. Available models: ${availableModels}`;
					}
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				context.addLog(`Warning: Could not verify model '${modelId}' for ${provider}: ${errorMsg}`);
			}

			// Update model and save to provider config
			const newConfig = {
				...aiConfig!,
				defaultModel: modelId,
				providers: {
					...aiConfig?.providers,
					[provider]: {
						...aiConfig?.providers?.[provider],
						defaultModel: modelId,
					},
				},
			};
			setAIConfig(newConfig);

			// Save config to file
			await context.saveConfig(newConfig);

			// Update current session's model (preserve history)
			const currentSessionId = currentSessionIdSignal.value;
			if (currentSessionId) {
				await updateSessionModel(currentSessionId, modelId);
			}

			return `Switched to model: ${modelId} for ${provider}`;
		}

		// No args - show model selection UI
		// Get current session's provider or selected provider from zen signals
		const currentSession = currentSessionSignal.value;
		const selectedProvider = selectedProviderSignal.value;
		const aiConfig = aiConfigSignal.value;
		const currentProviderId =
			currentSession?.provider || selectedProvider || aiConfig?.defaultProvider;

		if (!currentProviderId) {
			return "No provider selected. Use /provider to select a provider first.";
		}

		// Show loading UI immediately, then fetch models asynchronously
		const modelsState: {
			loading: boolean;
			models: Array<{ id: string; name: string }> | null;
			error: string | null;
		} = {
			loading: true,
			models: null,
			error: null,
		};

		// Render ModelSelection component with loading state
		const renderModelSelection = () => (
			<ModelSelection
				models={modelsState.models}
				currentProvider={currentProviderId}
				loading={modelsState.loading}
				error={modelsState.error || undefined}
				onSelect={async (modelId) => {
					const provider = currentProviderId;

					// Get fresh zen signal values
					const { get } = await import("@sylphx/code-client");
					const { aiConfig, currentSessionId, setAIConfig, updateSessionModel } = await import(
						"@sylphx/code-client"
					);
					const freshAIConfig = aiConfig.value;
					const freshCurrentSessionId = currentSessionId.value;

					// Update model and save to provider config
					const newConfig = {
						...freshAIConfig!,
						defaultModel: modelId,
						providers: {
							...freshAIConfig?.providers,
							[provider]: {
								...freshAIConfig?.providers?.[provider],
								defaultModel: modelId,
							},
						},
					};
					setAIConfig(newConfig);

					// Save config to file
					await context.saveConfig(newConfig);

					// Update current session's model (preserve history)
					if (freshCurrentSessionId) {
						await updateSessionModel(freshCurrentSessionId, modelId);
					}

					context.setInputComponent(null);
					context.addLog(`[model] Switched to model: ${modelId}`);
				}}
				onCancel={() => {
					context.setInputComponent(null);
					context.addLog("[model] Model selection cancelled");
				}}
			/>
		);

		// Show loading UI immediately
		context.setInputComponent(renderModelSelection(), "Model Selection");

		// Fetch models asynchronously
		const { getTRPCClient } = await import("@sylphx/code-client");
		const trpc = getTRPCClient();

		try {
			const result = await trpc.config.fetchModels.query({
				providerId: currentProviderId,
			});

			if (!result.success) {
				modelsState.loading = false;
				modelsState.error = result.error;
				context.setInputComponent(renderModelSelection(), "Model Selection");
				return;
			}

			modelsState.loading = false;
			modelsState.models = result.models;
			context.setInputComponent(renderModelSelection(), "Model Selection");
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			modelsState.loading = false;
			modelsState.error = errorMsg;
			context.setInputComponent(renderModelSelection(), "Model Selection");
		}
	},
};

export default modelCommand;
