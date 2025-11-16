/**
 * Shared types for Chat components
 */

export interface ChatProps {
	commandFromPalette?: string | null;
}

export const DEFAULT_NOTIFICATION_SETTINGS = {
	notifyOnCompletion: true,
	notifyOnError: true,
} as const;
