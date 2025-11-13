/**
 * Context Reserve Calculator
 *
 * Calculates optimal reserved context based on model size.
 * Small models need higher reserve % (tokenizer error),
 * large models need lower % (more economical).
 *
 * Formula: BASE_RESERVED + (contextLimit - BASE_CONTEXT) * EXTRA_RATE
 *
 * Examples:
 * - 64K:  12.8K reserved (20%)
 * - 128K: 20K reserved (15.6%)
 * - 256K: 26.4K reserved (10.3%)
 * - 1M:   63.6K reserved (6.4%)
 * - 2M:   113.6K reserved (5.7%)
 */

/**
 * Base reserved tokens for small models (covers tokenizer error margin)
 * This is the minimum we always reserve, even for tiny models
 */
const BASE_RESERVED = 20_000; // 20K

/**
 * Baseline context size (GPT-4 style: 128K)
 * Models this size or smaller get BASE_RESERVED only
 */
const BASE_CONTEXT = 128_000; // 128K

/**
 * Reserve rate for extra capacity beyond baseline
 * Applied to (contextLimit - BASE_CONTEXT) for large models
 */
const EXTRA_RESERVE_RATE = 0.05; // 5%

/**
 * Calculate reserved tokens based on context limit
 *
 * Design rationale:
 * - Small models (<= 128K): Fixed 20K reserve (~15-20%)
 * - Large models (> 128K): 20K + 5% of extra capacity
 * - Result: Reserve ratio decreases as model size increases
 *
 * @param contextLimit - Model's context window size
 * @returns Reserved token count
 *
 * @example
 * calculateReservedTokens(128_000)  // 20K (15.6%)
 * calculateReservedTokens(256_000)  // 26.4K (10.3%)
 * calculateReservedTokens(2_000_000) // 113.6K (5.7%)
 */
export function calculateReservedTokens(contextLimit: number): number {
	// Small models: use base reserve only (capped at 20% of context)
	if (contextLimit <= BASE_CONTEXT) {
		return Math.min(BASE_RESERVED, Math.floor(contextLimit * 0.2));
	}

	// Large models: base + percentage of extra capacity
	const extraCapacity = contextLimit - BASE_CONTEXT;
	const extraReserve = Math.ceil(extraCapacity * EXTRA_RESERVE_RATE);

	return BASE_RESERVED + extraReserve;
}

/**
 * Calculate reserve percentage for display
 *
 * @param contextLimit - Model's context window size
 * @returns Reserve percentage (0-100)
 */
export function calculateReservePercent(contextLimit: number): number {
	const reserved = calculateReservedTokens(contextLimit);
	return (reserved / contextLimit) * 100;
}

/**
 * Get detailed reserve breakdown for debugging
 */
export function getReserveBreakdown(contextLimit: number): {
	contextLimit: number;
	baseReserved: number;
	extraReserved: number;
	totalReserved: number;
	reservePercent: number;
} {
	const baseReserved = Math.min(BASE_RESERVED, Math.floor(contextLimit * 0.2));

	if (contextLimit <= BASE_CONTEXT) {
		return {
			contextLimit,
			baseReserved,
			extraReserved: 0,
			totalReserved: baseReserved,
			reservePercent: calculateReservePercent(contextLimit),
		};
	}

	const extraCapacity = contextLimit - BASE_CONTEXT;
	const extraReserved = Math.ceil(extraCapacity * EXTRA_RESERVE_RATE);
	const totalReserved = BASE_RESERVED + extraReserved;

	return {
		contextLimit,
		baseReserved: BASE_RESERVED,
		extraReserved,
		totalReserved,
		reservePercent: calculateReservePercent(contextLimit),
	};
}
