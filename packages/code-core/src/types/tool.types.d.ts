/**
 * Tool Types - Normalized Tool Entity System
 *
 * Defines the structure for AI tools (functions the AI can call)
 */
import type { z } from "zod";
/**
 * Tool category
 * Logical grouping of related tools
 */
export type ToolCategory = "filesystem" | "shell" | "search" | "interaction" | "todo" | "mcp";
/**
 * Tool capability flags
 * Indicates special characteristics of a tool
 */
export interface ToolCapabilities {
    /** Tool requires user confirmation before execution */
    requiresConfirmation?: boolean;
    /** Tool can perform dangerous/destructive operations */
    isDangerous?: boolean;
    /** Tool performs async operations */
    isAsync: boolean;
    /** Tool modifies state (vs read-only) */
    isStateful?: boolean;
    /** Tool can be executed in parallel with others */
    supportsParallel?: boolean;
}
/**
 * Tool security level
 */
export type ToolSecurityLevel = "safe" | "moderate" | "dangerous";
/**
 * Tool execution result as discriminated union
 * Prevents illegal states where success=false but output is present, or success=true but error is present
 */
export type ToolExecutionResult<T = unknown> = {
    success: true;
    output: T;
    duration?: number;
} | {
    success: false;
    error: string;
    duration?: number;
};
/**
 * Tool entity
 * Represents a callable function/tool that the AI can invoke
 */
export interface Tool {
    /** Unique tool ID */
    id: string;
    /** Display name */
    name: string;
    /** Tool category for grouping */
    category: ToolCategory;
    /** Detailed description of what the tool does */
    description: string;
    /** Tool capabilities */
    capabilities: ToolCapabilities;
    /** Security/danger level */
    securityLevel: ToolSecurityLevel;
    /**
     * Model IDs that support this tool
     * If undefined, supported by all models
     */
    supportedByModels?: string[];
    /**
     * Model IDs that do NOT support this tool
     * Takes precedence over supportedByModels
     */
    unsupportedByModels?: string[];
    /** Input schema (Zod schema) */
    inputSchema?: z.ZodSchema;
    /** Example usage for documentation */
    examples?: string[];
    /** Related tool IDs (often used together) */
    relatedTools?: string[];
    /** Whether this tool is enabled by default */
    enabledByDefault: boolean;
    /**
     * Source of the tool
     * - 'builtin': Core system tool
     * - 'mcp': From MCP server
     * - 'plugin': From plugin/extension
     */
    source: "builtin" | "mcp" | "plugin";
    /** For MCP tools: server ID that provides this tool */
    mcpServerId?: string;
}
/**
 * Tool category metadata
 */
export interface ToolCategoryInfo {
    id: ToolCategory;
    name: string;
    description: string;
    icon?: string;
}
/**
 * Tool with execution context
 * Extended version with runtime information
 */
export interface ToolWithContext extends Tool {
    /** Whether tool is currently enabled in session */
    isEnabled: boolean;
    /** Whether tool is available (all dependencies met) */
    isAvailable: boolean;
    /** Reason why tool is unavailable (if applicable) */
    unavailableReason?: string;
}
//# sourceMappingURL=tool.types.d.ts.map