/**
 * Project settings manager - functional implementation
 * Pure functions for managing uncommitted project-specific settings
 */
import { type Result } from "../ai/result.js";
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
 * Get settings file path for a given working directory
 */
export declare const getSettingsPath: (cwd?: string) => string;
/**
 * Check if settings file exists
 */
export declare const settingsExists: (cwd?: string) => Promise<boolean>;
/**
 * Load project settings from file
 * Returns Result type for explicit error handling
 */
export declare const loadSettings: (cwd?: string) => Promise<Result<ProjectSettings, Error>>;
/**
 * Save project settings to file
 * Returns Result type for explicit error handling
 */
export declare const saveSettings: (settings: ProjectSettings, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Update specific settings properties
 */
export declare const updateSettings: (updates: Partial<ProjectSettings>, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Get the default target from settings
 */
export declare const getDefaultTarget: (cwd?: string) => Promise<string | undefined>;
/**
 * Set the default target in settings
 */
export declare const setDefaultTarget: (target: string, cwd?: string) => Promise<Result<void, Error>>;
/**
 * Legacy class-based interface for backward compatibility
 * @deprecated Use functional exports instead (loadSettings, saveSettings, etc.)
 */
export declare class ProjectSettings {
    private cwd;
    constructor(cwd?: string);
    load(): Promise<ProjectSettings>;
    save(settings: ProjectSettings): Promise<void>;
    update(updates: Partial<ProjectSettings>): Promise<void>;
    getDefaultTarget(): Promise<string | undefined>;
    setDefaultTarget(target: string): Promise<void>;
    exists(): Promise<boolean>;
}
/**
 * Singleton instance for backward compatibility
 * @deprecated Use functional exports with explicit cwd parameter
 */
export declare const projectSettings: ProjectSettings;
//# sourceMappingURL=settings.d.ts.map