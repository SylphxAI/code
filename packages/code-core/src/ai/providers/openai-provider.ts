/**
 * OpenAI Provider
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
 * Lazy load OpenAI SDK to reduce initial bundle size
 * SDK is only loaded when provider is actually used
 */
let openaiModule: typeof import("@ai-sdk/openai") | null = null;
async function getOpenAISdk() {
	if (!openaiModule) {
		openaiModule = await import("@ai-sdk/openai");
	}
	return openaiModule;
}

export class OpenAIProvider implements AIProvider {
	readonly id = "openai" as const;
	readonly name = "OpenAI";
	readonly description = "GPT models by OpenAI";

	getConfigSchema(): ConfigField[] {
		const consoleUrl = getProviderConsoleUrl("openai") || "https://platform.openai.com";
		return [
			{
				key: "apiKey",
				label: "API Key",
				type: "string",
				required: true,
				secret: true,
				description: `Get your API key from ${consoleUrl}`,
				placeholder: "sk-...",
			},
			{
				key: "baseUrl",
				label: "Base URL",
				type: "string",
				required: false,
				description: "Custom API endpoint (for Azure OpenAI, etc.)",
				placeholder: "https://api.openai.com/v1",
			},
		];
	}

	isConfigured(config: ProviderConfig): boolean {
		return hasRequiredFields(this.getConfigSchema(), config);
	}

	async fetchModels(config: ProviderConfig): Promise<ModelInfo[]> {
		const apiKey = config.apiKey as string | undefined;
		if (!apiKey) {
			// No API key - return known models (can't fetch from API without auth)
			return MODEL_REGISTRY.openai.models;
		}

		const baseUrl = (config.baseUrl as string) || "https://api.openai.com/v1";
		const response = await fetch(`${baseUrl}/models`, {
			headers: { Authorization: `Bearer ${apiKey}` },
			signal: AbortSignal.timeout(10000),
		});

		if (!response.ok) {
			throw new Error(`OpenAI API returned ${response.status}: ${response.statusText}`);
		}

		const data = (await response.json()) as { data: Array<{ id: string }> };
		const models = data.data
			.filter((model) => model.id.startsWith("gpt-"))
			.map((model) => ({
				id: model.id,
				name: model.id,
			}));

		if (models.length === 0) {
			throw new Error("No GPT models found in OpenAI API response");
		}

		return models;
	}

	async getModelDetails(
		modelId: string,
		_config?: ProviderConfig,
	): Promise<ProviderModelDetails | null> {
		// Try provider knowledge first
		const staticDetails = MODEL_REGISTRY.openai.details[modelId];
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

		// GPT-4+ and GPT-3.5-turbo support tools (except instruct models)
		if (
			!modelIdLower.includes("instruct") &&
			(modelIdLower.includes("gpt-4") || modelIdLower.includes("gpt-3.5-turbo"))
		) {
			capabilities.add("tools");
		}

		// GPT-4o, GPT-4-turbo, and GPT-4-vision support vision
		if (
			modelIdLower.includes("gpt-4o") ||
			modelIdLower.includes("gpt-4-turbo") ||
			modelIdLower.includes("vision")
		) {
			capabilities.add("image-input");
		}

		// DALL-E models support image output
		if (modelIdLower.includes("dall-e")) {
			capabilities.add("image-output");
		}

		// o1 and o3 models support reasoning
		if (modelIdLower.includes("o1") || modelIdLower.includes("o3")) {
			capabilities.add("reasoning");
		}

		// GPT-4+ supports structured output
		if (modelIdLower.includes("gpt-4")) {
			capabilities.add("structured-output");
		}

		return capabilities;
	}

	async createClient(config: ProviderConfig, modelId: string): Promise<LanguageModelV1> {
		const { openai } = await getOpenAISdk();
		const apiKey = config.apiKey as string;
		const baseUrl = config.baseUrl as string | undefined;
		return openai(modelId, { apiKey, baseURL: baseUrl });
	}
}
