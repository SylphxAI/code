/**
 * Terminal Colors
 * Uses semantic color names that adapt to terminal theme
 *
 * DESIGN: Use terminal's basic colors instead of hex codes
 * - Light theme: Terminal adjusts to darker shades
 * - Dark theme: Terminal adjusts to lighter shades
 */

/**
 * Detect if terminal is using a light theme
 * Checks COLORFGBG env var (format: "fg;bg" where bg > 7 typically means light)
 * Also checks common terminal theme indicators
 */
export function isLightTheme(): boolean {
	// Check COLORFGBG (set by some terminals like xterm, iTerm2)
	const colorFgBg = process.env.COLORFGBG;
	if (colorFgBg) {
		const parts = colorFgBg.split(";");
		const bg = parseInt(parts[parts.length - 1], 10);
		// Background color index > 7 typically indicates light theme
		// (0-7 are dark colors, 8-15 are light colors in standard palette)
		if (!isNaN(bg) && bg > 7) return true;
		if (!isNaN(bg) && bg <= 7) return false;
	}

	// Check TERM_PROGRAM specific settings
	const termProgram = process.env.TERM_PROGRAM;
	if (termProgram === "Apple_Terminal") {
		// Apple Terminal defaults to light theme
		return true;
	}

	// Check macOS appearance (if available via environment)
	const appearance = process.env.DARKMODE;
	if (appearance === "0") return true;
	if (appearance === "1") return false;

	// Default to dark theme (most developer terminals are dark)
	return false;
}

/**
 * Get theme-aware colors
 */
export function getThemeColors() {
	const light = isLightTheme();
	return {
		// Subtle separator line color
		separator: light ? "#ccc" : "#444",
		// Very subtle (almost invisible)
		separatorSubtle: light ? "#eee" : "#333",
	};
}

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

/**
 * Message indicator symbols
 */
export const indicators = {
	user: "▷", // Empty triangle - user messages
	assistant: "◆", // Filled diamond - assistant messages
	system: "◇", // Empty diamond - system messages
} as const;
