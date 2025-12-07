/**
 * Notification State - Simple module-level state with React hooks
 * For local notification settings that don't need server persistence
 */

import { useSyncExternalStore } from "react";

// ============================================================================
// State + Listeners pattern
// ============================================================================

type Listener = () => void;

function createState<T>(initial: T) {
	let value = initial;
	const listeners = new Set<Listener>();

	return {
		get: () => value,
		set: (newValue: T) => {
			value = newValue;
			listeners.forEach((l) => l());
		},
		subscribe: (listener: Listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

function useStore<T>(store: ReturnType<typeof createState<T>>): T {
	return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ============================================================================
// Notification Settings
// ============================================================================

export interface NotificationSettings {
	osNotifications: boolean;
	terminalNotifications: boolean;
	sound: boolean;
}

const notificationSettingsState = createState<NotificationSettings>({
	osNotifications: false,
	terminalNotifications: true,
	sound: true,
});

export const getNotificationSettings = notificationSettingsState.get;
export const setNotificationSettings = notificationSettingsState.set;
export const useNotificationSettings = () => useStore(notificationSettingsState);

/**
 * Update notification settings (partial updates supported)
 */
export const updateNotificationSettings = (updates: Partial<NotificationSettings>) => {
	const current = notificationSettingsState.get();
	notificationSettingsState.set({ ...current, ...updates });
};
