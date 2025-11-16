/**
 * Z.ai Provider
 * Uses OpenAI-compatible API
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

/**
 * Lazy load OpenAI-compatible SDK to reduce initial bundle size
 * SDK is only loaded when provider is actually used
 */
let openaiCompatibleModule: typeof import("@ai-sdk/openai-compatible") | null = null;
async function getOpenAICompatibleSdk() {
	if (!openaiCompatibleModule) {
		openaiCompatibleModule = await import("@ai-sdk/openai-compatible");
	}
	return openaiCompatibleModule;
}

export class ZaiProvider implements AIProvider {
	readonly id = "zai" as const;
	readonly name = "Z.ai";
	readonly description = "ZAI AI platform";

	getConfigSchema(): ConfigField[] {
		return [
			{
				key: "apiKey",
				label: "API Key",
				type: "string",
				required: true,
				secret: true,
				description: "Get your API key from Z.ai",
				placeholder: "zai-...",
			},
			{
				key: "codingPlan",
				label: "Coding Plan",
				type: "boolean",
				required: false,
				description: "Enable Coding Plan mode (uses different API endpoint)",
			},
		];
	}

	isConfigured(config: ProviderConfig): boolean {
		return hasRequiredFields(this.getConfigSchema(), config);
	}

	async fetchModels(config: ProviderConfig): Promise<ModelInfo[]> {
		const codingPlan = config.codingPlan as boolean | undefined;

		// Get API key (may be in config.apiKey or resolved from credential)
		const apiKey = config.apiKey as string | undefined;
		if (!apiKey) {
			throw new Error("API key is required to fetch Z.ai models. Please configure it with /provider configure zai set apiKey <your-key>");
		}

		// Use different base URL for coding plan
		const baseUrl = codingPlan
			? "https://api.z.ai/api/coding/paas/v4"
			: "https://api.z.ai/api/paas/v4";

		const response = await fetch(`${baseUrl}/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
			signal: AbortSignal.timeout(10000),
		});

		if (!response.ok) {
			throw new Error(`Z.ai API returned ${response.status}: ${response.statusText}`);
		}

		const data = (await response.json()) as {
			data?: Array<{ id: string; name?: string }>;
		};

		if (!data.data || data.data.length === 0) {
			throw new Error("No models returned from Z.ai API");
		}

		return data.data.map((model) => ({
			id: model.id,
			name: model.name || model.id,
		}));
	}

	async getModelDetails(
		modelId: string,
		config?: ProviderConfig,
	): Promise<ProviderModelDetails | null> {
		const apiKey = config?.apiKey as string | undefined;
		if (!apiKey) {
			return null;
		}

		const codingPlan = config?.codingPlan as boolean | undefined;
		const baseUrl = codingPlan
			? "https://api.z.ai/api/coding/paas/v4"
			: "https://api.z.ai/api/paas/v4";

		try {
			const response = await fetch(`${baseUrl}/models`, {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
				signal: AbortSignal.timeout(10000),
			});

			if (!response.ok) {
				return null;
			}

			const data = (await response.json()) as {
				data?: Array<{
					id: string;
					name?: string;
					context_length?: number;
					max_output_tokens?: number;
					input_price?: number;
					output_price?: number;
				}>;
			};

			const model = data.data?.find((m) => m.id === modelId);
			if (!model) {
				return null;
			}

			return {
				contextLength: model.context_length || null,
				maxOutput: model.max_output_tokens || null,
				inputPrice: model.input_price || 0,
				outputPrice: model.output_price || 0,
			};
		} catch (error) {
			console.error(`[ZaiProvider] Failed to fetch model details for ${modelId}:`, error);
			return null;
		}
	}

	getModelCapabilities(modelId: string): ModelCapabilities {
		const modelIdLower = modelId.toLowerCase();
		const capabilities = new Set<ModelCapability>();

		// GLM models support tools
		if (modelIdLower.includes("glm") || modelIdLower.includes("chatglm")) {
			capabilities.add("tools");
		}

		// GLM-4V and vision models support image input
		if (modelIdLower.includes("glm-4v") || modelIdLower.includes("vision")) {
			capabilities.add("image-input");
		}

		// Check for image generation models
		if (modelIdLower.includes("cogview") || modelIdLower.includes("image")) {
			capabilities.add("image-output");
		}

		// DeepSeek and reasoning models
		if (
			modelIdLower.includes("deepseek") ||
			modelIdLower.includes("thinking") ||
			modelIdLower.includes("reasoning")
		) {
			capabilities.add("reasoning");
		}

		// GLM-4+ models support structured output
		if (modelIdLower.includes("glm-4") || modelIdLower.includes("glm-5")) {
			capabilities.add("structured-output");
		}

		return capabilities;
	}

	async createClient(config: ProviderConfig, modelId: string): Promise<LanguageModelV1> {
		const { createOpenAICompatible } = await getOpenAICompatibleSdk();
		const apiKey = config.apiKey as string;
		const codingPlan = config.codingPlan as boolean | undefined;

		// Use different base URL for coding plan
		const baseURL = codingPlan
			? "https://api.z.ai/api/coding/paas/v4/"
			: "https://api.z.ai/api/paas/v4/";

		const zai = createOpenAICompatible({
			baseURL,
			apiKey,
			name: "zai",
		});

		return zai(modelId);
	}
}
