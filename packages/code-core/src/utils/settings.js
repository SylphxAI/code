/**
 * Project settings manager - functional implementation
 * Pure functions for managing uncommitted project-specific settings
 */
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { isErr, isOk, success, tryCatchAsync } from "../ai/result.js";
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
export const getSettingsPath = (cwd = process.cwd()) => path.join(cwd, SETTINGS_FILE);
/**
 * Check if settings file exists
 */
export const settingsExists = async (cwd = process.cwd()) => {
    try {
        await fs.access(getSettingsPath(cwd));
        return true;
    }
    catch {
        return false;
    }
};
/**
 * Load project settings from file
 * Returns Result type for explicit error handling
 */
export const loadSettings = async (cwd = process.cwd()) => {
    const settingsPath = getSettingsPath(cwd);
    return tryCatchAsync(async () => {
        const content = await fs.readFile(settingsPath, "utf8");
        const parsed = ProjectSettingsSchema.safeParse(JSON.parse(content));
        if (!parsed.success) {
            throw new Error(`Invalid settings format: ${parsed.error.message}`);
        }
        return parsed.data;
    }, (error) => {
        // File not found is not an error - return empty settings
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
            return new Error("EMPTY_SETTINGS");
        }
        return new Error(`Failed to load settings: ${error instanceof Error ? error.message : String(error)}`);
    }).then((result) => {
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
export const saveSettings = async (settings, cwd = process.cwd()) => {
    const settingsPath = getSettingsPath(cwd);
    return tryCatchAsync(async () => {
        // Ensure the directory exists
        await fs.mkdir(path.dirname(settingsPath), { recursive: true });
        // Add current version if not present
        const settingsWithVersion = {
            ...settings,
            version: settings.version || CURRENT_VERSION,
        };
        // Write settings with proper formatting
        await fs.writeFile(settingsPath, `${JSON.stringify(settingsWithVersion, null, 2)}\n`, "utf8");
    }, (error) => new Error(`Failed to save settings: ${error instanceof Error ? error.message : String(error)}`));
};
/**
 * Update specific settings properties
 */
export const updateSettings = async (updates, cwd = process.cwd()) => {
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
export const getDefaultTarget = async (cwd = process.cwd()) => {
    const result = await loadSettings(cwd);
    return isOk(result) ? result.data.defaultTarget : undefined;
};
/**
 * Set the default target in settings
 */
export const setDefaultTarget = async (target, cwd = process.cwd()) => updateSettings({ defaultTarget: target }, cwd);
/**
 * Legacy class-based interface for backward compatibility
 * @deprecated Use functional exports instead (loadSettings, saveSettings, etc.)
 */
export class ProjectSettings {
    cwd;
    constructor(cwd = process.cwd()) {
        this.cwd = cwd;
        this.settingsPath = getSettingsPath(cwd);
    }
    async load() {
        const result = await loadSettings(this.cwd);
        if (isErr(result)) {
            throw result.error;
        }
        return result.data;
    }
    async save(settings) {
        const result = await saveSettings(settings, this.cwd);
        if (isErr(result)) {
            throw result.error;
        }
    }
    async update(updates) {
        const result = await updateSettings(updates, this.cwd);
        if (isErr(result)) {
            throw result.error;
        }
    }
    async getDefaultTarget() {
        return getDefaultTarget(this.cwd);
    }
    async setDefaultTarget(target) {
        const result = await setDefaultTarget(target, this.cwd);
        if (isErr(result)) {
            throw result.error;
        }
    }
    async exists() {
        return settingsExists(this.cwd);
    }
}
/**
 * Singleton instance for backward compatibility
 * @deprecated Use functional exports with explicit cwd parameter
 */
export const projectSettings = new ProjectSettings();
//# sourceMappingURL=settings.js.map