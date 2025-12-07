/**
 * Context Reserve Calculator
 *
 * Calculates reserved context as percentage of context limit.
 * Reserve covers both tokenizer error margin (~1%) and summary output space (~9%).
 *
 * Formula: contextLimit × CONTEXT_RESERVE_RATIO
 *
 * Default 10% breakdown:
 * - 1% for tokenizer error margin (scales with context size)
 * - 9% for AI summary output during compact (scales with content)
 *
 * Examples (10% default):
 * - 64K:  6.4K reserved
 * - 128K: 12.8K reserved
 * - 256K: 25.6K reserved
 * - 1M:   100K reserved
 * - 2M:   200K reserved
 */
/**
 * Default context reserve ratio
 * User can override via project settings
 */
export declare const DEFAULT_CONTEXT_RESERVE_RATIO = 0.1;
/**
 * Calculate reserved tokens based on context limit
 *
 * Design rationale:
 * - Tokenizer error scales with context size (~1%)
 * - Summary length scales with content amount (~9%)
 * - Total reserve: 10% of context limit (configurable)
 *
 * @param contextLimit - Model's context window size
 * @param reserveRatio - Reserve ratio (default: 10%)
 * @returns Reserved token count
 *
 * @example
 * calculateReservedTokens(128_000)     // 12.8K (10%)
 * calculateReservedTokens(256_000)     // 25.6K (10%)
 * calculateReservedTokens(2_000_000)   // 200K (10%)
 * calculateReservedTokens(128_000, 0.05) // 6.4K (5% custom)
 */
export declare function calculateReservedTokens(contextLimit: number, reserveRatio?: number): number;
/**
 * Calculate reserve percentage for display
 *
 * @param reserveRatio - Reserve ratio (default: 10%)
 * @returns Reserve percentage (0-100)
 */
export declare function calculateReservePercent(reserveRatio?: number): number;
/**
 * Get detailed reserve breakdown for debugging
 */
export declare function getReserveBreakdown(contextLimit: number, reserveRatio?: number): {
    contextLimit: number;
    reserveRatio: number;
    totalReserved: number;
    reservePercent: number;
    tokenizerErrorMargin: number;
    summaryOutputSpace: number;
};
/**
 * Calculate max tokens for AI summary during compact
 * Uses 90% of reserve (9% of total context) for summary quality
 *
 * @param contextLimit - Model's context window size
 * @param reserveRatio - Reserve ratio (default: 10%)
 * @returns Max tokens for summary output
 *
 * @example
 * getSummaryMaxTokens(128_000)   // 11.5K (9% of 128K)
 * getSummaryMaxTokens(2_000_000) // 180K (9% of 2M)
 */
export declare function getSummaryMaxTokens(contextLimit: number, reserveRatio?: number): number;
//# sourceMappingURL=context-reserve.d.ts.map