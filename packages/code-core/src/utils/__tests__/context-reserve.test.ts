/**
 * Context Reserve Calculator Tests
 */

import { describe, it, expect } from "vitest";
import {
	calculateReservedTokens,
	calculateReservePercent,
	getReserveBreakdown,
} from "../context-reserve.js";

describe("calculateReservedTokens", () => {
	it("should handle small models (<= 128K) with base reserve", () => {
		// 64K model: 12.8K reserved (20%)
		expect(calculateReservedTokens(64_000)).toBe(12_800);

		// 128K model: 20K reserved (15.6%)
		expect(calculateReservedTokens(128_000)).toBe(20_000);
	});

	it("should scale proportionally for large models", () => {
		// 256K model: 20K + (128K * 5%) = 26.4K (10.3%)
		expect(calculateReservedTokens(256_000)).toBe(26_400);

		// 512K model: 20K + (384K * 5%) = 39.2K (7.7%)
		expect(calculateReservedTokens(512_000)).toBe(39_200);

		// 1M model: 20K + (872K * 5%) = 63.6K (6.4%)
		expect(calculateReservedTokens(1_000_000)).toBe(63_600);

		// 2M model: 20K + (1.872M * 5%) = 113.6K (5.7%)
		expect(calculateReservedTokens(2_000_000)).toBe(113_600);
	});

	it("should be more economical than old 22.5% approach", () => {
		const oldApproach = (limit: number) => Math.floor(limit * 0.225);

		// 256K: saves 31.2K
		expect(oldApproach(256_000) - calculateReservedTokens(256_000)).toBe(31_200);

		// 1M: saves 161.4K
		expect(oldApproach(1_000_000) - calculateReservedTokens(1_000_000)).toBe(161_400);

		// 2M: saves 336.4K!
		expect(oldApproach(2_000_000) - calculateReservedTokens(2_000_000)).toBe(336_400);
	});

	it("should handle edge cases", () => {
		// Very small model
		expect(calculateReservedTokens(10_000)).toBe(2_000); // 20%

		// Exactly at baseline
		expect(calculateReservedTokens(128_000)).toBe(20_000);

		// Very large model (10M)
		expect(calculateReservedTokens(10_000_000)).toBe(513_600); // Still only 5.1%
	});
});

describe("calculateReservePercent", () => {
	it("should return correct percentages", () => {
		// 64K: 20%
		expect(calculateReservePercent(64_000)).toBeCloseTo(20, 1);

		// 128K: 15.6%
		expect(calculateReservePercent(128_000)).toBeCloseTo(15.6, 1);

		// 256K: 10.3%
		expect(calculateReservePercent(256_000)).toBeCloseTo(10.3, 1);

		// 2M: 5.7%
		expect(calculateReservePercent(2_000_000)).toBeCloseTo(5.7, 1);
	});

	it("should show decreasing percentage as size increases", () => {
		const percent64K = calculateReservePercent(64_000);
		const percent128K = calculateReservePercent(128_000);
		const percent256K = calculateReservePercent(256_000);
		const percent1M = calculateReservePercent(1_000_000);
		const percent2M = calculateReservePercent(2_000_000);

		// Percentage should decrease as size increases
		expect(percent64K).toBeGreaterThan(percent128K);
		expect(percent128K).toBeGreaterThan(percent256K);
		expect(percent256K).toBeGreaterThan(percent1M);
		expect(percent1M).toBeGreaterThan(percent2M);
	});
});

describe("getReserveBreakdown", () => {
	it("should provide detailed breakdown for small models", () => {
		const breakdown = getReserveBreakdown(64_000);

		expect(breakdown).toEqual({
			contextLimit: 64_000,
			baseReserved: 12_800,
			extraReserved: 0,
			totalReserved: 12_800,
			reservePercent: 20,
		});
	});

	it("should provide detailed breakdown for large models", () => {
		const breakdown = getReserveBreakdown(256_000);

		expect(breakdown).toEqual({
			contextLimit: 256_000,
			baseReserved: 20_000,
			extraReserved: 6_400, // (256K - 128K) * 5%
			totalReserved: 26_400,
			reservePercent: expect.closeTo(10.3, 1),
		});
	});

	it("should show correct breakdown for 2M model", () => {
		const breakdown = getReserveBreakdown(2_000_000);

		expect(breakdown.contextLimit).toBe(2_000_000);
		expect(breakdown.baseReserved).toBe(20_000);
		expect(breakdown.extraReserved).toBe(93_600); // (2M - 128K) * 5%
		expect(breakdown.totalReserved).toBe(113_600);
		expect(breakdown.reservePercent).toBeCloseTo(5.7, 1);
	});
});

describe("Real-world scenarios", () => {
	it("should provide reasonable reserves for popular models", () => {
		// GPT-4 Turbo (128K)
		expect(calculateReservedTokens(128_000)).toBe(20_000); // 15.6%

		// Claude 3 Opus (200K)
		expect(calculateReservedTokens(200_000)).toBe(23_600); // 11.8%

		// Gemini 1.5 Pro (1M)
		expect(calculateReservedTokens(1_000_000)).toBe(63_600); // 6.4%

		// Gemini 1.5 Pro (2M)
		expect(calculateReservedTokens(2_000_000)).toBe(113_600); // 5.7%

		// Claude 3.5 Sonnet (256K)
		expect(calculateReservedTokens(256_000)).toBe(26_400); // 10.3%
	});

	it("should save significant tokens on large models vs old approach", () => {
		const savings = (limit: number) => {
			const oldReserve = Math.floor(limit * 0.225);
			const newReserve = calculateReservedTokens(limit);
			return oldReserve - newReserve;
		};

		// Savings increase with model size
		expect(savings(128_000)).toBe(8_800); // ~9K saved
		expect(savings(256_000)).toBe(31_200); // ~31K saved
		expect(savings(1_000_000)).toBe(161_400); // ~161K saved
		expect(savings(2_000_000)).toBe(336_400); // ~336K saved!
	});
});
