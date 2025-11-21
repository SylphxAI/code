/**
 * Theme Store
 * Reactive theme state with persistence
 */

import { signal } from "@preact/signals-core";
import { useSyncExternalStore } from "react";
import type { Theme, ThemeColors } from "./types.js";
import { builtInThemes, darkTheme, getThemeById } from "./themes.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// Config file path
const CONFIG_DIR = join(homedir(), ".config", "sylphx-code");
const THEME_CONFIG_PATH = join(CONFIG_DIR, "theme.json");

/**
 * Load saved theme ID from config
 */
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

/**
 * Save theme ID to config
 */
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

/**
 * Current theme signal (reactive)
 */
export const currentTheme = signal<Theme>(initialTheme);

// Subscribers for React integration
const subscribers = new Set<() => void>();

function subscribe(callback: () => void) {
	subscribers.add(callback);
	return () => subscribers.delete(callback);
}

function notifySubscribers() {
	for (const cb of subscribers) {
		cb();
	}
}

/**
 * Get current theme
 */
export function getTheme(): Theme {
	return currentTheme.value;
}

/**
 * Get current theme colors
 */
export function getColors(): ThemeColors {
	return currentTheme.value.colors;
}

/**
 * Set theme by ID
 */
export function setTheme(themeId: string): boolean {
	const theme = getThemeById(themeId);
	if (theme) {
		currentTheme.value = theme;
		saveThemeId(themeId);
		// Notify React subscribers
		notifySubscribers();
		return true;
	}
	return false;
}

/**
 * Get all available themes
 */
export function getAvailableThemes(): Theme[] {
	return builtInThemes;
}

/**
 * Check if current theme is dark
 */
export function isDarkTheme(): boolean {
	return currentTheme.value.isDark;
}

/**
 * React hook to subscribe to theme changes
 * Use this in components that need to re-render when theme changes
 */
export function useTheme(): Theme {
	return useSyncExternalStore(
		subscribe,
		() => currentTheme.value,
		() => currentTheme.value,
	);
}

/**
 * React hook to get theme colors with reactivity
 * Use this in components that need to re-render when theme changes
 */
export function useColors(): ThemeColors {
	const theme = useTheme();
	return theme.colors;
}

// Re-export types
export type { Theme, ThemeColors, BuiltInThemeId } from "./types.js";
