/**
 * Stream Processor
 * Handles streaming response processing with XML parsing
 */
import type { LanguageModelV2StreamPart } from "@ai-sdk/provider";
import type { ToolDefinition } from "./text-based-tools.js";
export interface StreamProcessorOptions {
    queryResult: AsyncIterable<any>;
    tools: Record<string, ToolDefinition> | undefined;
    totalMessageCount: number;
    messageFingerprints: string[];
    shouldForceNewSession: boolean;
}
/**
 * Process streaming query result and emit LanguageModelV2StreamPart events
 */
export declare function processStream(options: StreamProcessorOptions): AsyncGenerator<LanguageModelV2StreamPart>;
//# sourceMappingURL=stream-processor.d.ts.map