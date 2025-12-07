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
export const DEFAULT_CONTEXT_RESERVE_RATIO = 0.1; // 10%
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
export function calculateReservedTokens(contextLimit, reserveRatio = DEFAULT_CONTEXT_RESERVE_RATIO) {
    return Math.floor(contextLimit * reserveRatio);
}
/**
 * Calculate reserve percentage for display
 *
 * @param reserveRatio - Reserve ratio (default: 10%)
 * @returns Reserve percentage (0-100)
 */
export function calculateReservePercent(reserveRatio = DEFAULT_CONTEXT_RESERVE_RATIO) {
    return reserveRatio * 100;
}
/**
 * Get detailed reserve breakdown for debugging
 */
export function getReserveBreakdown(contextLimit, reserveRatio = DEFAULT_CONTEXT_RESERVE_RATIO) {
    const totalReserved = calculateReservedTokens(contextLimit, reserveRatio);
    const reservePercent = calculateReservePercent(reserveRatio);
    // Breakdown (approximate):
    // - 10% of reserve for tokenizer error (~1% of total)
    // - 90% of reserve for summary output (~9% of total)
    const tokenizerErrorMargin = Math.floor(totalReserved * 0.1);
    const summaryOutputSpace = totalReserved - tokenizerErrorMargin;
    return {
        contextLimit,
        reserveRatio,
        totalReserved,
        reservePercent,
        tokenizerErrorMargin,
        summaryOutputSpace,
    };
}
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
export function getSummaryMaxTokens(contextLimit, reserveRatio = DEFAULT_CONTEXT_RESERVE_RATIO) {
    const totalReserved = calculateReservedTokens(contextLimit, reserveRatio);
    // Use 90% of reserve for summary (remaining 10% for tokenizer error)
    return Math.floor(totalReserved * 0.9);
}
//# sourceMappingURL=context-reserve.js.map