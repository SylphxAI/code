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

// Module state
let _colors = darkColors;
let _isDark = true;
const _listeners = new Set<() => void>();

function notify() {
	_listeners.forEach((l) => l());
}

// Getters
export function getColors(): ThemeColors {
	return _colors;
}

export function isDarkTheme(): boolean {
	return _isDark;
}

// Setters
export function setTheme(isDark: boolean) {
	_isDark = isDark;
	// Could add light theme colors here
	notify();
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
