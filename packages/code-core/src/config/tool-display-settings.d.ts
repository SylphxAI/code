/**
 * Tool Display Settings
 * Configuration for which tools show details by default
 *
 * Philosophy (like Claude Code):
 * - Important tools (write, edit, bash) → details ON by default
 * - Less important tools (read, search) → details OFF by default
 * - User can override via /settings
 */
import { z } from "zod";
/**
 * Tool display settings
 * Map of tool name → should show details
 */
export declare const toolDisplaySettingsSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodBoolean>>;
export type ToolDisplaySettings = z.infer<typeof toolDisplaySettingsSchema>;
/**
 * Default tool display settings
 * Based on Claude Code's approach:
 * - Important tools: ON (write, edit, bash)
 * - Less important: OFF (read, search tools)
 */
export declare const DEFAULT_TOOL_DISPLAY_SETTINGS: ToolDisplaySettings;
/**
 * Get whether a tool should show details by default
 * Falls back to true for unknown tools (conservative - show details)
 */
export declare function getToolShowDetailsDefault(toolName: string): boolean;
/**
 * Get effective tool display setting
 * Priority: user setting > default setting > true (fallback)
 */
export declare function shouldShowToolDetails(toolName: string, userSettings?: ToolDisplaySettings): boolean;
/**
 * Update tool display setting
 * Returns new settings object with updated value
 */
export declare function updateToolDisplaySetting(toolName: string, showDetails: boolean, currentSettings?: ToolDisplaySettings): ToolDisplaySettings;
/**
 * Reset tool display setting to default
 * Returns new settings object with tool removed (will use default)
 */
export declare function resetToolDisplaySetting(toolName: string, currentSettings?: ToolDisplaySettings): ToolDisplaySettings;
/**
 * Reset all tool display settings to defaults
 */
export declare function resetAllToolDisplaySettings(): ToolDisplaySettings;
/**
 * Get display info for a tool
 */
export interface ToolDisplayInfo {
    name: string;
    showDetails: boolean;
    isDefault: boolean;
}
/**
 * Get display info for all tools
 */
export declare function getAllToolDisplayInfo(userSettings?: ToolDisplaySettings): ToolDisplayInfo[];
//# sourceMappingURL=tool-display-settings.d.ts.map