/**
 * Query Builder
 * Handles query options building, system prompt extraction, and tool conversion
 */
import type { LanguageModelV2CallOptions } from "@ai-sdk/provider";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { type ToolDefinition } from "./text-based-tools.js";
/**
 * Convert tools from Vercel AI SDK format to our internal format
 */
export declare function convertTools(tools: unknown[]): Record<string, ToolDefinition> | undefined;
/**
 * Extract system prompt from messages
 */
export declare function extractSystemPrompt(options: LanguageModelV2CallOptions): string | undefined;
/**
 * Build query options from call options
 */
export declare function buildQueryOptions(modelId: string, options: LanguageModelV2CallOptions, tools: Record<string, ToolDefinition> | undefined, includePartialMessages?: boolean): {
    queryOptions: Options;
    systemPrompt: string;
};
//# sourceMappingURL=query-builder.d.ts.map