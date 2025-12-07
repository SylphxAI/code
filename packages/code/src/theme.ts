/**
 * Theme - Simple module-level theme with React hook
 */

import { useSyncExternalStore } from "react";

export interface ThemeColors {
	text: string;
	textDim: string;
	textMuted: string;
	background: string;
	backgroundAlt: string;
	border: string;
	borderSubtle: string;
	primary: string;
	secondary: string;
	success: string;
	warning: string;
	error: string;
	info: string;
	user: string;
	assistant: string;
	system: string;
	link: string;
	linkHover: string;
	code: string;
	codeBackground: string;
}

const darkColors: ThemeColors = {
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
};

const lightColors: ThemeColors = {
	text: "#000000",
	textDim: "#666666",
	textMuted: "#999999",
	background: "#ffffff",
	backgroundAlt: "#f5f5f5",
	border: "#cccccc",
	borderSubtle: "#dddddd",
	primary: "blue",
	secondary: "purple",
	success: "green",
	warning: "orange",
	error: "red",
	info: "blue",
	user: "blue",
	assistant: "green",
	system: "orange",
	link: "blue",
	linkHover: "#0000ff",
	code: "#1a1a1a",
	codeBackground: "#f0f0f0",
};

export interface Theme {
	id: string;
	name: string;
	colors: ThemeColors;
}

const themes: Theme[] = [
	{ id: "dark", name: "Dark", colors: darkColors },
	{ id: "light", name: "Light", colors: lightColors },
];

// Module state
let _currentThemeId = "dark";
let _colors = darkColors;
const _listeners = new Set<() => void>();

function notify() {
	_listeners.forEach((l) => l());
}

// Getters
export function getColors(): ThemeColors {
	return _colors;
}

export function isDarkTheme(): boolean {
	return _currentThemeId === "dark";
}

export function getTheme(): Theme {
	return themes.find((t) => t.id === _currentThemeId) ?? themes[0]!;
}

export function getAvailableThemes(): Theme[] {
	return themes;
}

// Setters
export function setTheme(themeIdOrBoolean: string | boolean): boolean {
	let themeId: string;

	// Support both old boolean API and new string ID API
	if (typeof themeIdOrBoolean === "boolean") {
		themeId = themeIdOrBoolean ? "dark" : "light";
	} else {
		themeId = themeIdOrBoolean;
	}

	const theme = themes.find((t) => t.id === themeId);
	if (!theme) {
		return false;
	}

	_currentThemeId = theme.id;
	_colors = theme.colors;
	notify();
	return true;
}

// React hook
export function useThemeColors(): ThemeColors {
	return useSyncExternalStore(
		(callback) => {
			_listeners.add(callback);
			return () => _listeners.delete(callback);
		},
		() => _colors,
		() => _colors,
	);
}
