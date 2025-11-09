/**
 * AI Domain Signals Tests
 * Tests AI configuration and provider state management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AIConfig, LanguageModel } from '@sylphx/code-core';
import * as ai from './index.js';

// Mock AI config for testing
const mockAIConfig: AIConfig = {
  defaultProvider: 'openrouter',
  defaultEnabledRuleIds: ['core'],
  defaultAgentId: 'writer',
  providers: {
    openrouter: {
      defaultModel: 'x-ai/grok-code-fast-1',
      apiKey: 'sk-or-v1-test-key'
    },
    anthropic: {
      defaultModel: 'claude-3-sonnet',
      apiKey: 'sk-ant-test-key'
    }
  }
};

describe('AI Domain Signals', () => {
  beforeEach(() => {
    // Reset all signals to initial state
    ai.setAIConfig(null);
    ai.setSelectedProvider(null);
    ai.setSelectedModel(null);
    ai.setConfigLoading(false);
    ai.setConfigError(null);
  });

  afterEach(() => {
    // Clean up state
    ai.setAIConfig(null);
  });

  describe('Core AI Signals', () => {
    it('should initialize with null values', () => {
      const { useAIConfig, useSelectedProvider, useSelectedModel } = ai;

      expect(useAIConfig()).toBe(null);
      expect(useSelectedProvider()).toBe(null);
      expect(useSelectedModel()).toBe(null);
    });

    it('should update AI config correctly', () => {
      ai.setAIConfig(mockAIConfig);

      expect(ai.useAIConfig()).toEqual(mockAIConfig);
      expect(ai.useSelectedProvider()).toBe('openrouter');
      expect(ai.useSelectedModel()).toBe('x-ai/grok-code-fast-1');
    });

    it('should set loading state correctly', () => {
      ai.setConfigLoading(true);
      expect(ai.useIsConfigLoading()).toBe(true);

      ai.setConfigLoading(false);
      expect(ai.useIsConfigLoading()).toBe(false);
    });

    it('should set config error correctly', () => {
      const error = 'Failed to load configuration';
      ai.setConfigError(error);

      expect(ai.useConfigError()).toBe(error);
    });
  });

  describe('Computed Signals', () => {
    it('should compute hasConfig correctly', () => {
      expect(ai.useHasAIConfig()).toBe(false);

      ai.setAIConfig(mockAIConfig);
      expect(ai.useHasAIConfig()).toBe(true);

      ai.setAIConfig(null);
      expect(ai.useHasAIConfig()).toBe(false);
    });

    it('should compute defaultProvider correctly', () => {
      expect(ai.useDefaultProvider()).toBe(null);

      ai.setAIConfig(mockAIConfig);
      expect(ai.useDefaultProvider()).toBe('openrouter');

      const configWithoutDefault = { ...mockAIConfig, defaultProvider: undefined };
      ai.setAIConfig(configWithoutDefault);
      expect(ai.useDefaultProvider()).toBe(null);
    });

    it('should compute availableProviders correctly', () => {
      expect(ai.useAvailableProviders()).toEqual([]);

      ai.setAIConfig(mockAIConfig);
      expect(ai.useAvailableProviders()).toEqual(['openrouter', 'anthropic']);
    });

    it('should compute providerModels correctly', () => {
      expect(ai.useProviderModels()).toEqual([]);

      ai.setAIConfig(mockAIConfig);
      ai.setSelectedProvider('openrouter');

      const models = ai.useProviderModels();
      expect(models).toEqual(mockAIConfig.providers.openrouter.models);

      ai.setSelectedProvider('anthropic');
      expect(ai.useProviderModels()).toEqual(mockAIConfig.providers.anthropic.models);
    });

    it('should compute selectedModelConfig correctly', () => {
      expect(ai.useSelectedModelConfig()).toBe(null);

      ai.setAIConfig(mockAIConfig);
      ai.setSelectedProvider('openrouter');
      ai.setSelectedModel('x-ai/grok-code-fast-1');

      const modelConfig = ai.useSelectedModelConfig();
      expect(modelConfig).toEqual(mockAIConfig.providers.openrouter.models.find(m => m.id === 'x-ai/grok-code-fast-1'));
    });
  });

  describe('Provider Management', () => {
    beforeEach(() => {
      ai.setAIConfig(mockAIConfig);
    });

    it('should update provider correctly', () => {
      const updatedProvider = {
        defaultModel: 'claude-3-opus',
        apiKey: 'new-key'
      };

      ai.updateProvider('anthropic', updatedProvider);

      const config = ai.useAIConfig();
      expect(config?.providers.anthropic).toEqual({
        ...mockAIConfig.providers.anthropic,
        ...updatedProvider
      });
    });

    it('should remove provider correctly', () => {
      ai.removeProvider('anthropic');

      const config = ai.useAIConfig();
      expect(config?.providers.anthropic).toBeUndefined();
      expect(Object.keys(config?.providers || {})).toEqual(['openrouter']);
    });

    it('should update defaultProvider when removing current default', () => {
      ai.removeProvider('openrouter');

      const config = ai.useAIConfig();
      expect(config?.defaultProvider).toBeUndefined();
    });

    it('should not affect other providers when removing', () => {
      ai.removeProvider('openrouter');

      const config = ai.useAIConfig();
      expect(config?.providers.anthropic).toEqual(mockAIConfig.providers.anthropic);
    });
  });

  describe('Model Selection', () => {
    beforeEach(() => {
      ai.setAIConfig(mockAIConfig);
    });

    it('should set selected provider correctly', () => {
      ai.setSelectedProvider('anthropic');
      expect(ai.useSelectedProvider()).toBe('anthropic');
      expect(ai.useSelectedModel()).toBe(null); // Should reset selected model
    });

    it('should set selected model correctly', () => {
      ai.setSelectedProvider('anthropic');
      ai.setSelectedModel('claude-3-sonnet');

      expect(ai.useSelectedProvider()).toBe('anthropic');
      expect(ai.useSelectedModel()).toBe('claude-3-sonnet');
    });

    it('should reset selected model when provider changes', () => {
      ai.setSelectedProvider('openrouter');
      ai.setSelectedModel('x-ai/grok-code-fast-1');

      ai.setSelectedProvider('anthropic');
      expect(ai.useSelectedModel()).toBe(null);
    });
  });

  describe('Configuration Loading Flow', () => {
    it('should handle config loading with error state', () => {
      ai.setConfigLoading(true);
      expect(ai.useIsConfigLoading()).toBe(true);
      expect(ai.useConfigError()).toBe(null);

      const error = 'Network error';
      ai.setConfigError(error);
      expect(ai.useConfigError()).toBe(error);

      ai.setConfigLoading(false);
      expect(ai.useIsConfigLoading()).toBe(false);
    });

    it('should auto-select provider and model from config', () => {
      expect(ai.useSelectedProvider()).toBe(null);
      expect(ai.useSelectedModel()).toBe(null);

      ai.setAIConfig(mockAIConfig);

      expect(ai.useSelectedProvider()).toBe('openrouter');
      expect(ai.useSelectedModel()).toBe('x-ai/grok-code-fast-1');
    });

    it('should handle config without default provider', () => {
      const configWithoutDefault = { ...mockAIConfig, defaultProvider: undefined };

      ai.setAIConfig(configWithoutDefault);

      expect(ai.useSelectedProvider()).toBe(null);
      expect(ai.useSelectedModel()).toBe(null);
    });

    it('should handle provider without default model', () => {
      const configWithProviderNoDefault = {
        ...mockAIConfig,
        providers: {
          openrouter: {
            ...mockAIConfig.providers.openrouter,
            defaultModel: undefined
          }
        }
      };

      ai.setAIConfig(configWithProviderNoDefault);

      expect(ai.useSelectedProvider()).toBe('openrouter');
      expect(ai.useSelectedModel()).toBe(null);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty providers object', () => {
      const configWithEmptyProviders = {
        ...mockAIConfig,
        providers: {}
      };

      ai.setAIConfig(configWithEmptyProviders);

      expect(ai.useAvailableProviders()).toEqual([]);
      expect(ai.useProviderModels()).toEqual([]);
    });

    it('should handle provider with no models', () => {
      const configWithProviderNoModels = {
        ...mockAIConfig,
        providers: {
          openrouter: {
            ...mockAIConfig.providers.openrouter,
            models: []
          }
        }
      };

      ai.setAIConfig(configWithProviderNoModels);
      ai.setSelectedProvider('openrouter');

      expect(ai.useProviderModels()).toEqual([]);
      expect(ai.useSelectedModelConfig()).toBe(null);
    });

    it('should handle non-existent model selection', () => {
      ai.setAIConfig(mockAIConfig);
      ai.setSelectedProvider('openrouter');
      ai.setSelectedModel('non-existent-model');

      expect(ai.useSelectedModel()).toBe('non-existent-model');
      expect(ai.useSelectedModelConfig()).toBe(null);
    });
  });
});