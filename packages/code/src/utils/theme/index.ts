/**
 * Theme System
 * Centralized theming with multiple built-in themes
 */

export {
	currentTheme,
	getTheme,
	getColors,
	setTheme,
	getAvailableThemes,
	isDarkTheme,
	useTheme,
	useColors,
} from "./store.js";

export type { Theme, ThemeColors, BuiltInThemeId } from "./types.js";

export {
	darkTheme,
	lightTheme,
	draculaTheme,
	nordTheme,
	monokaiTheme,
	builtInThemes,
	getThemeById,
} from "./themes.js";
