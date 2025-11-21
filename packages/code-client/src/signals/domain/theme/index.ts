/**
 * Theme Domain Signals
 * Manages application theme state with persistence
 */

import { zen, computed } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// Theme types
export interface ThemeColors {
	// Text colors
	text: string;
	textDim: string;
	textMuted: string;

	// Background colors
	background: string;
	backgroundAlt: string;

	// Border/separator colors
	border: string;
	borderSubtle: string;

	// Status colors
	primary: string;
	secondary: string;
	success: string;
	warning: string;
	error: string;
	info: string;

	// Role-specific colors
	user: string;
	assistant: string;
	system: string;

	// Interactive colors
	link: string;
	linkHover: string;

	// Code colors
	code: string;
	codeBackground: string;
}

export interface Theme {
	id: string;
	name: string;
	isDark: boolean;
	colors: ThemeColors;
}

export type BuiltInThemeId = "dark" | "light" | "dracula" | "nord" | "monokai";

// Built-in themes
const darkTheme: Theme = {
	id: "dark",
	name: "Dark",
	isDark: true,
	colors: {
		text: "#ffffff",
		textDim: "#888888",
		textMuted: "#555555",
		background: "#1e1e1e",
		backgroundAlt: "#252525",
		border: "#444444",
		borderSubtle: "#333333",
		primary: "cyan",
		secondary: "blue",
		success: "green",
		warning: "yellow",
		error: "red",
		info: "magenta",
		user: "cyan",
		assistant: "green",
		system: "yellow",
		link: "cyan",
		linkHover: "#00ffff",
		code: "#e6e6e6",
		codeBackground: "#2d2d2d",
	},
};

const lightTheme: Theme = {
	id: "light",
	name: "Light",
	isDark: false,
	colors: {
		text: "#1e1e1e",
		textDim: "#666666",
		textMuted: "#999999",
		background: "#ffffff",
		backgroundAlt: "#f5f5f5",
		border: "#cccccc",
		borderSubtle: "#e0e0e0",
		primary: "blue",
		secondary: "cyan",
		success: "green",
		warning: "#b8860b",
		error: "red",
		info: "magenta",
		user: "blue",
		assistant: "green",
		system: "#b8860b",
		link: "blue",
		linkHover: "#0000cc",
		code: "#333333",
		codeBackground: "#f0f0f0",
	},
};

const draculaTheme: Theme = {
	id: "dracula",
	name: "Dracula",
	isDark: true,
	colors: {
		text: "#f8f8f2",
		textDim: "#6272a4",
		textMuted: "#44475a",
		background: "#282a36",
		backgroundAlt: "#44475a",
		border: "#44475a",
		borderSubtle: "#383a46",
		primary: "#bd93f9",
		secondary: "#8be9fd",
		success: "#50fa7b",
		warning: "#f1fa8c",
		error: "#ff5555",
		info: "#ff79c6",
		user: "#bd93f9",
		assistant: "#50fa7b",
		system: "#f1fa8c",
		link: "#8be9fd",
		linkHover: "#bd93f9",
		code: "#f8f8f2",
		codeBackground: "#44475a",
	},
};

const nordTheme: Theme = {
	id: "nord",
	name: "Nord",
	isDark: true,
	colors: {
		text: "#eceff4",
		textDim: "#81a1c1",
		textMuted: "#4c566a",
		background: "#2e3440",
		backgroundAlt: "#3b4252",
		border: "#4c566a",
		borderSubtle: "#3b4252",
		primary: "#88c0d0",
		secondary: "#81a1c1",
		success: "#a3be8c",
		warning: "#ebcb8b",
		error: "#bf616a",
		info: "#b48ead",
		user: "#88c0d0",
		assistant: "#a3be8c",
		system: "#ebcb8b",
		link: "#88c0d0",
		linkHover: "#8fbcbb",
		code: "#eceff4",
		codeBackground: "#3b4252",
	},
};

const monokaiTheme: Theme = {
	id: "monokai",
	name: "Monokai",
	isDark: true,
	colors: {
		text: "#f8f8f2",
		textDim: "#75715e",
		textMuted: "#49483e",
		background: "#272822",
		backgroundAlt: "#3e3d32",
		border: "#49483e",
		borderSubtle: "#3e3d32",
		primary: "#66d9ef",
		secondary: "#ae81ff",
		success: "#a6e22e",
		warning: "#e6db74",
		error: "#f92672",
		info: "#ae81ff",
		user: "#66d9ef",
		assistant: "#a6e22e",
		system: "#e6db74",
		link: "#66d9ef",
		linkHover: "#ae81ff",
		code: "#f8f8f2",
		codeBackground: "#3e3d32",
	},
};

export const builtInThemes: Theme[] = [
	darkTheme,
	lightTheme,
	draculaTheme,
	nordTheme,
	monokaiTheme,
];

export function getThemeById(id: string): Theme | undefined {
	return builtInThemes.find((t) => t.id === id);
}

// Config file path
const CONFIG_DIR = join(homedir(), ".config", "sylphx-code");
const THEME_CONFIG_PATH = join(CONFIG_DIR, "theme.json");

function loadSavedThemeId(): string | null {
	try {
		if (existsSync(THEME_CONFIG_PATH)) {
			const config = JSON.parse(readFileSync(THEME_CONFIG_PATH, "utf-8"));
			return config.themeId || null;
		}
	} catch {
		// Ignore errors, use default
	}
	return null;
}

function saveThemeId(themeId: string): void {
	try {
		mkdirSync(CONFIG_DIR, { recursive: true });
		writeFileSync(THEME_CONFIG_PATH, JSON.stringify({ themeId }, null, 2));
	} catch (error) {
		console.error("[Theme] Failed to save theme:", error);
	}
}

// Initialize with saved theme or default to dark
const savedThemeId = loadSavedThemeId();
const initialTheme = savedThemeId ? getThemeById(savedThemeId) || darkTheme : darkTheme;

// Core theme signal
export const currentTheme = zen<Theme>(initialTheme);

// Computed signals
export const currentThemeColors = computed(() => currentTheme.value.colors);
export const isDarkTheme = computed(() => currentTheme.value.isDark);

// React hooks
export function useTheme(): Theme {
	return useZen(currentTheme);
}

export function useThemeColors(): ThemeColors {
	return useZen(currentThemeColors);
}

export function useIsDarkTheme(): boolean {
	return useZen(isDarkTheme);
}

// Actions
export function setTheme(themeId: string): boolean {
	const theme = getThemeById(themeId);
	if (theme) {
		currentTheme.value = theme;
		saveThemeId(themeId);
		return true;
	}
	return false;
}

export function getAvailableThemes(): Theme[] {
	return builtInThemes;
}

// Getter functions (for non-React code)
export function getTheme(): Theme {
	return currentTheme.value;
}

export function getColors(): ThemeColors {
	return currentTheme.value.colors;
}
