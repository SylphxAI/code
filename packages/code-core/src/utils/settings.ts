/**
 * Project settings manager - functional implementation
 * Pure functions for managing uncommitted project-specific settings
 */

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { isErr, isOk, type Result, success, tryCatchAsync } from "../ai/result.js";

export interface ProjectSettings {
	/** Default target for the project */
	defaultTarget?: string;
	/** Settings version for migration purposes */
	version?: string;
	/**
	 * Use accurate BPE tokenizer (slower) vs fast estimation (faster)
	 * - true: Use Hugging Face AutoTokenizer (accurate, 100+ messages = 3-5s)
	 * - false: Use estimation (charLength * ratio, 100+ messages = ~100ms)
	 * Default: true (accurate)
	 */
	useAccurateTokenizer?: boolean;
	/**
	 * Context reserve ratio (0-1)
	 * Percentage of context to reserve for:
	 * - Tokenizer error margin (~10% of reserve, ~1% of total)
	 * - AI summary output during compact (~90% of reserve, ~9% of total)
	 *
	 * Default: 0.10 (10%)
	 * Range: 0.05 (5%, minimal) to 0.20 (20%, very safe)
	 *
	 * Examples:
	 * - 0.05 (5%):  Minimal reserve, more usable space, risk of hitting limits
	 * - 0.10 (10%): Balanced (recommended)
	 * - 0.15 (15%): Conservative, better summary quality for large contexts
	 */
	contextReserveRatio?: number;
	/**
	 * Hide message titles (YOU, SYLPHX) for compact display
	 * - true: Show compact view (▌ content)
	 * - false: Show full titles (▌ YOU / ▌ SYLPHX · provider · model)
	 * Default: true (compact)
	 */
	hideMessageTitles?: boolean;
	/**
	 * Hide message usage (token counts) for cleaner display
	 * - true: Hide "2,632 → 145" token usage
	 * - false: Show token usage after each assistant message
	 * Default: true (hidden)
	 */
	hideMessageUsage?: boolean;
}

/**
 * Zod schema for validating ProjectSettings from disk
 */
const ProjectSettingsSchema = z
	.object({
		defaultTarget: z.string().optional(),
		version: z.string().optional(),
		useAccurateTokenizer: z.boolean().optional().default(true),
		contextReserveRatio: z.number().min(0.01).max(0.5).optional().default(0.1),
		hideMessageTitles: z.boolean().optional().default(true),
		hideMessageUsage: z.boolean().optional().default(true),
	})
	.passthrough(); // Allow additional fields for forward compatibility

const SETTINGS_FILE = ".sylphx-code/settings.json";
const CURRENT_VERSION = "1.0.0";

/**
 * Get settings file path for a given working directory
 */
export const getSettingsPath = (cwd: string = process.cwd()): string =>
	path.join(cwd, SETTINGS_FILE);

/**
 * Check if settings file exists
 */
export const settingsExists = async (cwd: string = process.cwd()): Promise<boolean> => {
	try {
		await fs.access(getSettingsPath(cwd));
		return true;
	} catch {
		return false;
	}
};

/**
 * Load project settings from file
 * Returns Result type for explicit error handling
 */
export const loadSettings = async (
	cwd: string = process.cwd(),
): Promise<Result<ProjectSettings, Error>> => {
	const settingsPath = getSettingsPath(cwd);

	return tryCatchAsync(
		async () => {
			const content = await fs.readFile(settingsPath, "utf8");
			const parsed = ProjectSettingsSchema.safeParse(JSON.parse(content));
			if (!parsed.success) {
				throw new Error(`Invalid settings format: ${parsed.error.message}`);
			}
			return parsed.data as ProjectSettings;
		},
		(error: unknown) => {
			// File not found is not an error - return empty settings
			if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
				return new Error("EMPTY_SETTINGS");
			}
			return new Error(
				`Failed to load settings: ${error instanceof Error ? error.message : String(error)}`,
			);
		},
	).then((result) => {
		// Convert EMPTY_SETTINGS error to success with empty object
		if (isErr(result) && result.error.message === "EMPTY_SETTINGS") {
			return success({});
		}
		return result;
	});
};

/**
 * Save project settings to file
 * Returns Result type for explicit error handling
 */
export const saveSettings = async (
	settings: ProjectSettings,
	cwd: string = process.cwd(),
): Promise<Result<void, Error>> => {
	const settingsPath = getSettingsPath(cwd);

	return tryCatchAsync(
		async () => {
			// Ensure the directory exists
			await fs.mkdir(path.dirname(settingsPath), { recursive: true });

			// Add current version if not present
			const settingsWithVersion = {
				...settings,
				version: settings.version || CURRENT_VERSION,
			};

			// Write settings with proper formatting
			await fs.writeFile(settingsPath, `${JSON.stringify(settingsWithVersion, null, 2)}\n`, "utf8");
		},
		(error: unknown) =>
			new Error(
				`Failed to save settings: ${error instanceof Error ? error.message : String(error)}`,
			),
	);
};

/**
 * Update specific settings properties
 */
export const updateSettings = async (
	updates: Partial<ProjectSettings>,
	cwd: string = process.cwd(),
): Promise<Result<void, Error>> => {
	const currentResult = await loadSettings(cwd);

	if (isErr(currentResult)) {
		return currentResult;
	}

	const newSettings = { ...currentResult.data, ...updates };
	return saveSettings(newSettings, cwd);
};

/**
 * Get the default target from settings
 */
export const getDefaultTarget = async (
	cwd: string = process.cwd(),
): Promise<string | undefined> => {
	const result = await loadSettings(cwd);
	return isOk(result) ? result.data.defaultTarget : undefined;
};

/**
 * Set the default target in settings
 */
export const setDefaultTarget = async (
	target: string,
	cwd: string = process.cwd(),
): Promise<Result<void, Error>> => updateSettings({ defaultTarget: target }, cwd);
