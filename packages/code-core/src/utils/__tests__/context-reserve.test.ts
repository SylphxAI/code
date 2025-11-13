/**
 * Context Reserve Calculator Tests
 */

import { describe, it, expect } from "vitest";
import {
	calculateReservedTokens,
	calculateReservePercent,
	getReserveBreakdown,
	getSummaryMaxTokens,
	DEFAULT_CONTEXT_RESERVE_RATIO,
} from "../context-reserve.js";

describe("calculateReservedTokens", () => {
	it("should calculate 10% reserve by default", () => {
		expect(calculateReservedTokens(64_000)).toBe(6_400); // 10%
		expect(calculateReservedTokens(128_000)).toBe(12_800); // 10%
		expect(calculateReservedTokens(256_000)).toBe(25_600); // 10%
		expect(calculateReservedTokens(1_000_000)).toBe(100_000); // 10%
		expect(calculateReservedTokens(2_000_000)).toBe(200_000); // 10%
	});

	it("should support custom reserve ratios", () => {
		// 5% reserve
		expect(calculateReservedTokens(128_000, 0.05)).toBe(6_400);
		expect(calculateReservedTokens(2_000_000, 0.05)).toBe(100_000);

		// 15% reserve
		expect(calculateReservedTokens(128_000, 0.15)).toBe(19_200);
		expect(calculateReservedTokens(2_000_000, 0.15)).toBe(300_000);
	});

	it("should be more economical than old 22.5% approach", () => {
		const oldApproach = (limit: number) => Math.floor(limit * 0.225);

		// 128K: saves 16K
		expect(oldApproach(128_000) - calculateReservedTokens(128_000)).toBe(16_000);

		// 256K: saves 32K
		expect(oldApproach(256_000) - calculateReservedTokens(256_000)).toBe(32_000);

		// 1M: saves 125K
		expect(oldApproach(1_000_000) - calculateReservedTokens(1_000_000)).toBe(125_000);

		// 2M: saves 250K!
		expect(oldApproach(2_000_000) - calculateReservedTokens(2_000_000)).toBe(250_000);
	});

	it("should handle edge cases", () => {
		// Very small model
		expect(calculateReservedTokens(10_000)).toBe(1_000); // 10%

		// Very large model (10M)
		expect(calculateReservedTokens(10_000_000)).toBe(1_000_000); // Still 10%
	});
});

describe("calculateReservePercent", () => {
	it("should return correct percentages", () => {
		expect(calculateReservePercent()).toBe(10); // Default 10%
		expect(calculateReservePercent(0.05)).toBe(5); // 5%
		expect(calculateReservePercent(0.15)).toBe(15); // 15%
		expect(calculateReservePercent(0.20)).toBe(20); // 20%
	});
});

describe("getReserveBreakdown", () => {
	it("should provide detailed breakdown for 128K model", () => {
		const breakdown = getReserveBreakdown(128_000);

		expect(breakdown).toEqual({
			contextLimit: 128_000,
			reserveRatio: 0.10,
			totalReserved: 12_800,
			reservePercent: 10,
			tokenizerErrorMargin: 1_280, // 10% of reserve
			summaryOutputSpace: 11_520, // 90% of reserve
		});
	});

	it("should provide detailed breakdown for 2M model", () => {
		const breakdown = getReserveBreakdown(2_000_000);

		expect(breakdown.contextLimit).toBe(2_000_000);
		expect(breakdown.reserveRatio).toBe(0.10);
		expect(breakdown.totalReserved).toBe(200_000);
		expect(breakdown.reservePercent).toBe(10);
		expect(breakdown.tokenizerErrorMargin).toBe(20_000); // 10% of reserve
		expect(breakdown.summaryOutputSpace).toBe(180_000); // 90% of reserve
	});

	it("should support custom reserve ratios", () => {
		const breakdown = getReserveBreakdown(128_000, 0.15);

		expect(breakdown.reserveRatio).toBe(0.15);
		expect(breakdown.totalReserved).toBe(19_200);
		expect(breakdown.reservePercent).toBe(15);
	});
});

describe("getSummaryMaxTokens", () => {
	it("should calculate summary tokens (90% of reserve)", () => {
		// 128K: 12.8K reserve → 11.5K for summary
		expect(getSummaryMaxTokens(128_000)).toBe(11_520);

		// 256K: 25.6K reserve → 23K for summary
		expect(getSummaryMaxTokens(256_000)).toBe(23_040);

		// 1M: 100K reserve → 90K for summary
		expect(getSummaryMaxTokens(1_000_000)).toBe(90_000);

		// 2M: 200K reserve → 180K for summary
		expect(getSummaryMaxTokens(2_000_000)).toBe(180_000);
	});

	it("should support custom reserve ratios", () => {
		// 5% reserve: 128K → 6.4K reserve → 5.76K summary
		expect(getSummaryMaxTokens(128_000, 0.05)).toBe(5_760);

		// 15% reserve: 128K → 19.2K reserve → 17.28K summary
		expect(getSummaryMaxTokens(128_000, 0.15)).toBe(17_280);
	});

	it("should scale summary with context size", () => {
		const summary64K = getSummaryMaxTokens(64_000);
		const summary128K = getSummaryMaxTokens(128_000);
		const summary256K = getSummaryMaxTokens(256_000);
		const summary1M = getSummaryMaxTokens(1_000_000);

		// Summary tokens should increase proportionally with context
		expect(summary128K).toBeGreaterThan(summary64K);
		expect(summary256K).toBeGreaterThan(summary128K);
		expect(summary1M).toBeGreaterThan(summary256K);

		// Larger contexts should have proportionally more summary space
		// (not exact due to Math.floor rounding, but should be close)
		expect(summary1M).toBeGreaterThan(summary64K * 10);
	});
});

describe("Real-world scenarios", () => {
	it("should provide reasonable reserves for popular models", () => {
		// GPT-4 Turbo (128K)
		expect(calculateReservedTokens(128_000)).toBe(12_800); // 10%

		// Claude 3 Opus (200K)
		expect(calculateReservedTokens(200_000)).toBe(20_000); // 10%

		// Gemini 1.5 Pro (1M)
		expect(calculateReservedTokens(1_000_000)).toBe(100_000); // 10%

		// Gemini 1.5 Pro (2M)
		expect(calculateReservedTokens(2_000_000)).toBe(200_000); // 10%

		// Claude 3.5 Sonnet (256K)
		expect(calculateReservedTokens(256_000)).toBe(25_600); // 10%
	});

	it("should save significant tokens on large models vs old approach", () => {
		const savings = (limit: number) => {
			const oldReserve = Math.floor(limit * 0.225);
			const newReserve = calculateReservedTokens(limit);
			return oldReserve - newReserve;
		};

		// Savings increase with model size
		expect(savings(128_000)).toBe(16_000); // ~16K saved
		expect(savings(256_000)).toBe(32_000); // ~32K saved
		expect(savings(1_000_000)).toBe(125_000); // ~125K saved
		expect(savings(2_000_000)).toBe(250_000); // ~250K saved!
	});

	it("should provide quality summaries for large contexts", () => {
		// 2M context → 180K summary budget
		// Should be enough for detailed summary preserving key information
		const summaryTokens = getSummaryMaxTokens(2_000_000);
		expect(summaryTokens).toBe(180_000);

		// Even with conservative 15% reserve: 270K summary budget
		const conservativeSummary = getSummaryMaxTokens(2_000_000, 0.15);
		expect(conservativeSummary).toBe(270_000);
	});
});

describe("DEFAULT_CONTEXT_RESERVE_RATIO", () => {
	it("should export default constant", () => {
		expect(DEFAULT_CONTEXT_RESERVE_RATIO).toBe(0.10);
	});
});
