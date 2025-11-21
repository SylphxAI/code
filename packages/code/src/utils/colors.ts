/**
 * Terminal Colors
 * Re-exports from theme system for backwards compatibility
 *
 * MIGRATION: This file is deprecated. Import from utils/theme instead.
 */

import { getColors, isDarkTheme } from "@sylphx/code-client";

/**
 * Detect if terminal is using a light theme
 * @deprecated Use isDarkTheme() from utils/theme instead
 */
export function isLightTheme(): boolean {
	return !isDarkTheme();
}

/**
 * Get theme-aware colors
 * @deprecated Use getColors() from utils/theme instead
 */
export function getThemeColors() {
	const colors = getColors();
	return {
		// Subtle separator line color
		separator: colors.border,
		// Subtle - close to background
		separatorSubtle: colors.borderSubtle,
	};
}

/**
 * Semantic colors for consistent theming
 * @deprecated Use getColors() from utils/theme instead
 */
export const colors = {
	// Primary UI colors
	get primary() {
		return getColors().primary;
	},
	get secondary() {
		return getColors().secondary;
	},

	// Status colors
	get success() {
		return getColors().success;
	},
	get warning() {
		return getColors().warning;
	},
	get error() {
		return getColors().error;
	},
	get info() {
		return getColors().info;
	},

	// Text colors
	get text() {
		return getColors().text;
	},
	get textDim() {
		return getColors().textDim;
	},

	// Special
	get accent() {
		return getColors().warning;
	},
} as const;

/**
 * Role-specific colors
 * @deprecated Use getColors() from utils/theme instead
 */
export const roleColors = {
	get user() {
		return getColors().user;
	},
	get assistant() {
		return getColors().assistant;
	},
	get system() {
		return getColors().system;
	},
} as const;

/**
 * Status colors
 * @deprecated Use getColors() from utils/theme instead
 */
export const statusColors = {
	get completed() {
		return getColors().success;
	},
	get pending() {
		return getColors().warning;
	},
	get failed() {
		return getColors().error;
	},
	get aborted() {
		return getColors().warning;
	},
} as const;

export type Color = string;
export type RoleColor = string;
export type StatusColor = string;

/**
 * Message indicator symbols
 */
export const indicators = {
	user: "▷", // Empty triangle - user messages
	assistant: "◆", // Filled diamond - assistant messages
	system: "◇", // Empty diamond - system messages
} as const;
