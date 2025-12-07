/**
 * Session Title Generation Utility
 * Re-exports pure functions from feature and adds streaming functionality
 */
import type { ProviderId } from "../types/config.types.js";
/**
 * Generate a session title using LLM with streaming (collects full text)
 * Uses our ai-sdk.ts for consistency
 */
export declare function generateSessionTitle(firstMessage: string, provider: ProviderId, modelName: string, providerConfig: Record<string, unknown>): Promise<string>;
/**
 * Generate a session title using LLM with streaming
 */
export declare function generateSessionTitleWithStreaming(firstMessage: string, provider: ProviderId, modelName: string, providerConfig: Record<string, unknown>, onChunk: (chunk: string) => void): Promise<string>;
//# sourceMappingURL=session-title.d.ts.map