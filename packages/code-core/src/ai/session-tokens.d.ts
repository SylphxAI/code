/**
 * Session Token Calculator
 * Calculates base context tokens (system prompt + tools) with content-based caching
 *
 * ARCHITECTURE: Content-based caching (NO database cache, NO TTL)
 * - Uses SHA256 content hashing for cache invalidation
 * - Cache key: ${tokenizerName}:${contentHash}
 * - LRU cache with max 100 entries
 * - Automatic invalidation when content changes
 *
 * CACHING STRATEGY:
 * - Content hash = SHA256(agent + rules + tools)
 * - Content unchanged → cache hit (< 1ms)
 * - Content changed → cache miss, recalculate (700ms)
 * - No TTL needed - content hash provides perfect invalidation
 *
 * WHY CONTENT-BASED?
 * - Agent file edited → hash changes → cache miss → recalculate ✅
 * - Rules toggled → hash changes → cache miss → recalculate ✅
 * - Tools updated → hash changes → cache miss → recalculate ✅
 * - Nothing changed → hash same → cache hit → instant ✅
 */
/**
 * Calculate base context tokens (system prompt + tools)
 * With content-based caching for performance
 *
 * @param modelName Model name for tokenizer selection
 * @param agentId Agent ID for system prompt
 * @param enabledRuleIds Rule IDs for system prompt
 * @param cwd Current working directory
 * @param options Optional configuration
 * @param options.useAccurate If false, use fast estimation instead of BPE tokenizer
 */
export declare function calculateBaseContextTokens(modelName: string, agentId: string, enabledRuleIds: string[], cwd: string, options?: {
    useAccurate?: boolean;
}): Promise<number>;
/**
 * Clear base context cache
 * Useful for testing or when you know content changed
 */
export declare function clearBaseContextCache(): void;
//# sourceMappingURL=session-tokens.d.ts.map