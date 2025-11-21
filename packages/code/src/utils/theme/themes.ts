/**
 * Built-in Theme Definitions
 */

import type { Theme } from "./types.js";

/**
 * Dark theme - default
 */
export const darkTheme: Theme = {
	id: "dark",
	name: "Dark",
	isDark: true,
	colors: {
		// Text
		text: "#ffffff",
		textDim: "#888888",
		textMuted: "#555555",

		// Background
		background: "#1e1e1e",
		backgroundAlt: "#252525",

		// Borders
		border: "#444444",
		borderSubtle: "#333333",

		// Status
		primary: "cyan",
		secondary: "blue",
		success: "green",
		warning: "yellow",
		error: "red",
		info: "magenta",

		// Roles
		user: "cyan",
		assistant: "green",
		system: "yellow",

		// Interactive
		link: "cyan",
		linkHover: "#00ffff",

		// Code
		code: "#e6e6e6",
		codeBackground: "#2d2d2d",
	},
};

/**
 * Light theme
 */
export const lightTheme: Theme = {
	id: "light",
	name: "Light",
	isDark: false,
	colors: {
		// Text
		text: "#1e1e1e",
		textDim: "#666666",
		textMuted: "#999999",

		// Background
		background: "#ffffff",
		backgroundAlt: "#f5f5f5",

		// Borders
		border: "#cccccc",
		borderSubtle: "#e0e0e0",

		// Status
		primary: "blue",
		secondary: "cyan",
		success: "green",
		warning: "#b8860b", // Dark goldenrod for visibility
		error: "red",
		info: "magenta",

		// Roles
		user: "blue",
		assistant: "green",
		system: "#b8860b",

		// Interactive
		link: "blue",
		linkHover: "#0000cc",

		// Code
		code: "#333333",
		codeBackground: "#f0f0f0",
	},
};

/**
 * Dracula theme
 */
export const draculaTheme: Theme = {
	id: "dracula",
	name: "Dracula",
	isDark: true,
	colors: {
		// Text
		text: "#f8f8f2",
		textDim: "#6272a4",
		textMuted: "#44475a",

		// Background
		background: "#282a36",
		backgroundAlt: "#44475a",

		// Borders
		border: "#44475a",
		borderSubtle: "#383a46",

		// Status
		primary: "#bd93f9", // Purple
		secondary: "#8be9fd", // Cyan
		success: "#50fa7b", // Green
		warning: "#f1fa8c", // Yellow
		error: "#ff5555", // Red
		info: "#ff79c6", // Pink

		// Roles
		user: "#bd93f9",
		assistant: "#50fa7b",
		system: "#f1fa8c",

		// Interactive
		link: "#8be9fd",
		linkHover: "#bd93f9",

		// Code
		code: "#f8f8f2",
		codeBackground: "#44475a",
	},
};

/**
 * Nord theme
 */
export const nordTheme: Theme = {
	id: "nord",
	name: "Nord",
	isDark: true,
	colors: {
		// Text
		text: "#eceff4",
		textDim: "#81a1c1",
		textMuted: "#4c566a",

		// Background
		background: "#2e3440",
		backgroundAlt: "#3b4252",

		// Borders
		border: "#4c566a",
		borderSubtle: "#3b4252",

		// Status
		primary: "#88c0d0", // Frost
		secondary: "#81a1c1", // Frost
		success: "#a3be8c", // Aurora green
		warning: "#ebcb8b", // Aurora yellow
		error: "#bf616a", // Aurora red
		info: "#b48ead", // Aurora purple

		// Roles
		user: "#88c0d0",
		assistant: "#a3be8c",
		system: "#ebcb8b",

		// Interactive
		link: "#88c0d0",
		linkHover: "#8fbcbb",

		// Code
		code: "#eceff4",
		codeBackground: "#3b4252",
	},
};

/**
 * Monokai theme
 */
export const monokaiTheme: Theme = {
	id: "monokai",
	name: "Monokai",
	isDark: true,
	colors: {
		// Text
		text: "#f8f8f2",
		textDim: "#75715e",
		textMuted: "#49483e",

		// Background
		background: "#272822",
		backgroundAlt: "#3e3d32",

		// Borders
		border: "#49483e",
		borderSubtle: "#3e3d32",

		// Status
		primary: "#66d9ef", // Cyan
		secondary: "#ae81ff", // Purple
		success: "#a6e22e", // Green
		warning: "#e6db74", // Yellow
		error: "#f92672", // Pink/Red
		info: "#ae81ff", // Purple

		// Roles
		user: "#66d9ef",
		assistant: "#a6e22e",
		system: "#e6db74",

		// Interactive
		link: "#66d9ef",
		linkHover: "#ae81ff",

		// Code
		code: "#f8f8f2",
		codeBackground: "#3e3d32",
	},
};

/**
 * All built-in themes
 */
export const builtInThemes: Theme[] = [
	darkTheme,
	lightTheme,
	draculaTheme,
	nordTheme,
	monokaiTheme,
];

/**
 * Get theme by ID
 */
export function getThemeById(id: string): Theme | undefined {
	return builtInThemes.find((t) => t.id === id);
}
