/**
 * Google Provider
 * Supports both AI Studio (apiKey) and Vertex AI (projectId + location)
 */

import { google } from '@ai-sdk/google';
import type { LanguageModelV1 } from 'ai';
import type { AIProvider, ProviderModelDetails, ConfigField, ProviderConfig, ModelInfo, ModelCapabilities, ModelCapability } from './base-provider.js';
import { hasRequiredFields } from './base-provider.js';

import { getModelMetadata } from '../../utils/models-dev.js';

const GOOGLE_MODELS: ModelInfo[] = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
];

const MODEL_DETAILS: Record<string, ProviderModelDetails> = {
  'gemini-2.0-flash-exp': {
    contextLength: 1000000,
    maxOutput: 8192,
  },
  'gemini-1.5-pro': {
    contextLength: 2000000,
    maxOutput: 8192,
  },
  'gemini-1.5-flash': {
    contextLength: 1000000,
    maxOutput: 8192,
  },
};

export class GoogleProvider implements AIProvider {
  readonly id = 'google' as const;
  readonly name = 'Google';
  readonly description = 'Gemini models by Google';

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'apiKey',
        label: 'API Key (AI Studio)',
        type: 'string',
        required: false,
        secret: true,
        description: 'Get your API key from https://aistudio.google.com',
        placeholder: 'AIza...',
      },
      {
        key: 'projectId',
        label: 'Project ID (Vertex AI)',
        type: 'string',
        required: false,
        description: 'Google Cloud project ID for Vertex AI',
        placeholder: 'my-project-123',
      },
      {
        key: 'location',
        label: 'Location (Vertex AI)',
        type: 'string',
        required: false,
        description: 'Vertex AI location (default: us-central1)',
        placeholder: 'us-central1',
      },
    ];
  }

  isConfigured(config: ProviderConfig): boolean {
    // Either AI Studio (apiKey) OR Vertex AI (projectId + location)
    const hasAIStudio = !!config.apiKey;
    const hasVertexAI = !!config.projectId && !!config.location;
    return hasAIStudio || hasVertexAI;
  }

  async fetchModels(_config: ProviderConfig): Promise<ModelInfo[]> {
    return GOOGLE_MODELS;
  }

  async getModelDetails(modelId: string, _config?: ProviderConfig): Promise<ProviderModelDetails | null> {
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

    // Most Gemini models support tools
    if (modelIdLower.includes('gemini')) {
      capabilities.add('tools');
    }

    // Gemini Pro and Flash models support vision
    if (
      modelIdLower.includes('gemini') &&
      (modelIdLower.includes('pro') ||
        modelIdLower.includes('flash') ||
        modelIdLower.includes('vision'))
    ) {
      capabilities.add('image-input');
    }

    // Gemini thinking/reasoning models
    if (
      modelIdLower.includes('thinking') ||
      modelIdLower.includes('reasoning')
    ) {
      capabilities.add('reasoning');
    }

    // Gemini 1.5+ and 2.0+ support structured output
    if (
      modelIdLower.includes('gemini-1.5') ||
      modelIdLower.includes('gemini-2')
    ) {
      capabilities.add('structured-output');
    }

    return capabilities;
  }

  createClient(config: ProviderConfig, modelId: string): LanguageModelV1 {
    const apiKey = config.apiKey as string | undefined;
    const projectId = config.projectId as string | undefined;
    const location = (config.location as string | undefined) || 'us-central1';

    if (apiKey) {
      // AI Studio mode
      return google(modelId, { apiKey });
    } else if (projectId) {
      // Vertex AI mode
      return google(modelId, {
        vertexai: { projectId, location }
      });
    } else {
      throw new Error('Google provider requires either apiKey or projectId');
    }
  }
}
