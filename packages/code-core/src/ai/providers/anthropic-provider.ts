/**
 * Anthropic Provider
 */

import { anthropic } from "@ai-sdk/anthropic";
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

const ANTHROPIC_MODELS: ModelInfo[] = [
	{ id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (Latest)" },
	{ id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
	{ id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
	{ id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
	{ id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
];

const MODEL_DETAILS: Record<string, ProviderModelDetails> = {
	"claude-3-5-sonnet-20241022": {
		contextLength: 200000,
		maxOutput: 8192,
	},
	"claude-3-5-haiku-20241022": {
		contextLength: 200000,
		maxOutput: 8192,
	},
	"claude-3-opus-20240229": {
		contextLength: 200000,
		maxOutput: 4096,
	},
	"claude-3-sonnet-20240229": {
		contextLength: 200000,
		maxOutput: 4096,
	},
	"claude-3-haiku-20240307": {
		contextLength: 200000,
		maxOutput: 4096,
	},
};

export class AnthropicProvider implements AIProvider {
	readonly id = "anthropic" as const;
	readonly name = "Anthropic";
	readonly description = "Claude models by Anthropic";

	getConfigSchema(): ConfigField[] {
		return [
			{
				key: "apiKey",
				label: "API Key",
				type: "string",
				required: true,
				secret: true,
				description: "Get your API key from https://console.anthropic.com",
				placeholder: "sk-ant-...",
			},
		];
	}

	isConfigured(config: ProviderConfig): boolean {
		return hasRequiredFields(this.getConfigSchema(), config);
	}

	async fetchModels(_config: ProviderConfig): Promise<ModelInfo[]> {
		return ANTHROPIC_MODELS;
	}

	async getModelDetails(
		modelId: string,
		_config?: ProviderConfig,
	): Promise<ProviderModelDetails | null> {
		// Try provider knowledge first
		if (MODEL_DETAILS[modelId]) {
			return MODEL_DETAILS[modelId];
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

	createClient(config: ProviderConfig, modelId: string): LanguageModelV1 {
		return anthropic(modelId, { apiKey: config.apiKey as string });
	}
}
