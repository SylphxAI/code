/**
 * Notification Store
 * Manages notification settings
 *
 * Single Responsibility: Notification preferences
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface NotificationSettings {
  osNotifications: boolean;
  terminalNotifications: boolean;
  sound: boolean;
  autoGenerateTitle: boolean;
}

export interface NotificationState {
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
}

export const useNotificationStore = create<NotificationState>()(
  immer((set) => ({
    notificationSettings: {
      osNotifications: true,
      terminalNotifications: true,
      sound: true,
      autoGenerateTitle: true,
    },

    updateNotificationSettings: (settings) =>
      set((state) => {
        state.notificationSettings = {
          ...state.notificationSettings,
          ...settings,
        };
      }),
  }))
);
