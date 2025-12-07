/**
 * Model Message Token Calculator
 * SSOT for calculating tokens of AI SDK ModelMessage format with content-based caching
 *
 * ARCHITECTURE: Content-based caching (NO database cache, NO TTL)
 * - Uses SHA256 content hashing for cache invalidation
 * - Cache key: ${tokenizerName}:${messageHash}
 * - LRU cache with max 1000 entries
 * - Messages are immutable → cache永遠有效
 *
 * CACHING STRATEGY:
 * - Content hash = SHA256(entire message object)
 * - Message unchanged → cache hit (< 1ms)
 * - New message → cache miss, calculate (30ms)
 * - Model switch → different tokenizer → cache miss for that tokenizer
 *
 * PERFORMANCE:
 * - First time with model: Calculate all messages (~3s for 100 messages)
 * - Subsequent calls: All cache hits (~100ms for 100 messages)
 * - New message added: Only calculate new message (30ms)
 * - Model switch: Recalculate all (but can reuse for that model next time)
 */
import type { ModelMessage } from "ai";
/**
 * Calculate tokens for AI SDK ModelMessage array
 * With content-based caching for performance
 *
 * @param modelMessages - Messages in AI SDK format (from buildModelMessages)
 * @param modelName - Model name for tokenizer selection
 * @param options - Optional configuration
 * @param options.useAccurate - If false, use fast estimation instead of BPE tokenizer
 * @returns Total tokens for all messages
 */
export declare function calculateModelMessagesTokens(modelMessages: ModelMessage[], modelName: string, options?: {
    useAccurate?: boolean;
}): Promise<number>;
/**
 * Clear message token cache
 * Useful for testing or memory management
 */
export declare function clearMessageTokenCache(): void;
//# sourceMappingURL=model-message-token-calculator.d.ts.map