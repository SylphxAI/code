/**
 * UI Store
 * Manages global UI state (loading, errors)
 *
 * Single Responsibility: UI state management
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface UIState {
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    isLoading: false,
    error: null,

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),
  }))
);
