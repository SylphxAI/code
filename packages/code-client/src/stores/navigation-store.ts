/**
 * Navigation Store
 * Manages screen navigation state
 *
 * Single Responsibility: Screen navigation
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type Screen =
  | 'main-menu'
  | 'provider-management'
  | 'model-selection'
  | 'chat'
  | 'command-palette'
  | 'logs'
  | 'dashboard';

export interface NavigationState {
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;
}

export const useNavigationStore = create<NavigationState>()(
  immer((set) => ({
    currentScreen: 'chat',

    navigateTo: (screen) =>
      set((state) => {
        state.currentScreen = screen;
      }),
  }))
);
