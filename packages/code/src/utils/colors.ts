/**
 * Terminal Colors
 * Uses semantic color names that adapt to terminal theme
 *
 * DESIGN: Use terminal's basic colors instead of hex codes
 * - Light theme: Terminal adjusts to darker shades
 * - Dark theme: Terminal adjusts to lighter shades
 */

/**
 * Semantic colors for consistent theming
 * These use terminal's basic colors which adapt to theme
 */
export const colors = {
	// Primary UI colors
	primary: "cyan" as const, // User messages, highlights
	secondary: "blue" as const, // Secondary elements

	// Status colors
	success: "green" as const, // Success states, checkmarks
	warning: "yellow" as const, // Warnings, pending states
	error: "red" as const, // Errors, failures
	info: "magenta" as const, // System messages, info

	// Text colors
	text: "white" as const, // Primary text (adapts to theme)
	textDim: "gray" as const, // Secondary text, descriptions

	// Special
	accent: "yellow" as const, // Accent elements, badges
} as const;

/**
 * Role-specific colors
 */
export const roleColors = {
	user: colors.primary, // Cyan - stands out
	assistant: colors.success, // Green - friendly
	system: colors.warning, // Yellow - attention
} as const;

/**
 * Status colors
 */
export const statusColors = {
	completed: colors.success,
	pending: colors.warning,
	failed: colors.error,
	aborted: colors.warning,
} as const;

export type Color = (typeof colors)[keyof typeof colors];
export type RoleColor = (typeof roleColors)[keyof typeof roleColors];
export type StatusColor = (typeof statusColors)[keyof typeof statusColors];
