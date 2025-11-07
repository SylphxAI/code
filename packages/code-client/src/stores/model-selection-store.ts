/**
 * Model Selection Store
 * Manages currently selected AI provider and model
 *
 * Single Responsibility: Model selection state
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ProviderId } from '@sylphx/code-core';

export interface ModelSelectionState {
  selectedProvider: ProviderId | null;
  selectedModel: string | null;
  setSelectedProvider: (provider: ProviderId | null) => void;
  setSelectedModel: (model: string | null) => void;
}

export const useModelSelectionStore = create<ModelSelectionState>()(
  immer((set) => ({
    selectedProvider: null,
    selectedModel: null,

    setSelectedProvider: (provider) =>
      set((state) => {
        state.selectedProvider = provider;
      }),

    setSelectedModel: (model) =>
      set((state) => {
        state.selectedModel = model;
      }),
  }))
);
