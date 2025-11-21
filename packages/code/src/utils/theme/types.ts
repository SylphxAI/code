/**
 * Theme System Types
 * Defines all color tokens and theme structure
 */

/**
 * All semantic color tokens used in the app
 */
export interface ThemeColors {
	// Text colors
	text: string; // Primary text
	textDim: string; // Secondary/dimmed text
	textMuted: string; // Very subtle text (placeholders)

	// Background colors
	background: string; // Main background
	backgroundAlt: string; // Alternate background (cards, panels)

	// Border/separator colors
	border: string; // Standard borders
	borderSubtle: string; // Very subtle borders/separators

	// Status colors
	primary: string; // Primary accent (user messages, highlights)
	secondary: string; // Secondary accent
	success: string; // Success states
	warning: string; // Warning states
	error: string; // Error states
	info: string; // Info/system messages

	// Role-specific colors
	user: string; // User message indicator
	assistant: string; // Assistant message indicator
	system: string; // System message indicator

	// Interactive colors
	link: string; // Links
	linkHover: string; // Link hover state

	// Code colors
	code: string; // Inline code
	codeBackground: string; // Code block background
}

/**
 * Theme definition
 */
export interface Theme {
	id: string;
	name: string;
	isDark: boolean;
	colors: ThemeColors;
}

/**
 * Theme ID type for built-in themes
 */
export type BuiltInThemeId = "dark" | "light" | "dracula" | "nord" | "monokai";
