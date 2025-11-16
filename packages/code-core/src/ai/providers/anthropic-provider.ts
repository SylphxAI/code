/**
 * Anthropic Provider
 */

import type { LanguageModelV1 } from "ai";
import type {
	AIProvider,
	ProviderModelDetails,
	ConfigField,
	ProviderConfig,
	ModelInfo,
	ModelCapabilities,
	ModelCapability,
} from "./base-provider.js";
import { hasRequiredFields } from "./base-provider.js";

import { getModelMetadata } from "../../utils/models-dev.js";
import { MODEL_REGISTRY, getProviderConsoleUrl } from "../models/model-registry.js";

/**
 * Lazy load Anthropic SDK to reduce initial bundle size
 * SDK is only loaded when provider is actually used
 */
let anthropicModule: typeof import("@ai-sdk/anthropic") | null = null;
async function getAnthropicSdk() {
	if (!anthropicModule) {
		anthropicModule = await import("@ai-sdk/anthropic");
	}
	return anthropicModule;
}

export class AnthropicProvider implements AIProvider {
	readonly id = "anthropic" as const;
	readonly name = "Anthropic";
	readonly description = "Claude models by Anthropic";

	getConfigSchema(): ConfigField[] {
		const consoleUrl = getProviderConsoleUrl("anthropic") || "https://console.anthropic.com";
		return [
			{
				key: "apiKey",
				label: "API Key",
				type: "string",
				required: true,
				secret: true,
				description: `Get your API key from ${consoleUrl}`,
				placeholder: "sk-ant-...",
			},
		];
	}

	isConfigured(config: ProviderConfig): boolean {
		return hasRequiredFields(this.getConfigSchema(), config);
	}

	async fetchModels(_config: ProviderConfig): Promise<ModelInfo[]> {
		return MODEL_REGISTRY.anthropic.models;
	}

	async getModelDetails(
		modelId: string,
		_config?: ProviderConfig,
	): Promise<ProviderModelDetails | null> {
		// Try provider knowledge first
		const staticDetails = MODEL_REGISTRY.anthropic.details[modelId];
		if (staticDetails) {
			return staticDetails;
		}

		// Fall back to models.dev
		const metadata = await getModelMetadata(modelId);
		if (metadata) {
			return {
				contextLength: metadata.contextLength,
				maxOutput: metadata.maxOutput,
				inputPrice: metadata.inputPrice,
				outputPrice: metadata.outputPrice,
			};
		}

		return null;
	}

	getModelCapabilities(modelId: string): ModelCapabilities {
		const modelIdLower = modelId.toLowerCase();
		const capabilities = new Set<ModelCapability>();

		// All Claude models support tools
		capabilities.add("tools");

		// Claude 3+ models support vision
		if (
			modelIdLower.includes("claude-3") ||
			modelIdLower.includes("claude-sonnet") ||
			modelIdLower.includes("claude-opus") ||
			modelIdLower.includes("claude-haiku")
		) {
			capabilities.add("image-input");
		}

		// Extended thinking models (Claude with extended thinking)
		if (modelIdLower.includes("extended") || modelIdLower.includes("thinking")) {
			capabilities.add("reasoning");
		}

		// Claude 3+ supports structured output
		if (
			modelIdLower.includes("claude-3") ||
			modelIdLower.includes("claude-sonnet") ||
			modelIdLower.includes("claude-opus") ||
			modelIdLower.includes("claude-haiku")
		) {
			capabilities.add("structured-output");
		}

		return capabilities;
	}

	async createClient(config: ProviderConfig, modelId: string): Promise<LanguageModelV1> {
		const { anthropic } = await getAnthropicSdk();
		return anthropic(modelId, { apiKey: config.apiKey as string });
	}
}
