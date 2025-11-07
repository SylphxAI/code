/**
 * Debug Store
 * Manages debug logging for development
 *
 * Single Responsibility: Debug log collection and management
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface DebugState {
  debugLogs: string[];
  addDebugLog: (message: string) => void;
  clearDebugLogs: () => void;
}

export const useDebugStore = create<DebugState>()(
  immer((set) => ({
    debugLogs: [],

    addDebugLog: (message) =>
      set((state) => {
        if (!process.env.DEBUG) {
          return;
        }

        const timestamp = new Date().toLocaleTimeString();
        state.debugLogs.push(`[${timestamp}] ${message}`);

        // Keep only last 500 logs (was 1000, reduced for memory)
        const MAX_LOGS = 1000;
        if (state.debugLogs.length > MAX_LOGS) {
          state.debugLogs = state.debugLogs.slice(-MAX_LOGS / 2);
        }
      }),

    clearDebugLogs: () =>
      set((state) => {
        state.debugLogs = [];
      }),
  }))
);
