/**
 * Streaming Token Tracker
 *
 * Manages token counting during active streaming
 * Separate from persistence - only for real-time optimistic updates
 *
 * ARCHITECTURE:
 * - Baseline: DB value at stream start (SSOT)
 * - Delta: Accumulated tokens during current streaming
 * - Current Total: Baseline + Delta (optimistic, not persisted)
 *
 * LIFECYCLE:
 * 1. Initialize with baseline from DB
 * 2. Add deltas as streaming progresses
 * 3. Reset with new baseline after step completion (DB write)
 *
 * NOT PERSISTED: This is ephemeral state, DB is SSOT
 */

import type { TokenCalculator } from "./token-calculator.js";

export class StreamingTokenTracker {
	private calculator: TokenCalculator;
	private baselineTotal: number; // From DB - SSOT value at stream start
	private streamingDelta: number = 0; // Accumulated during current step

	/**
	 * Initialize tracker with baseline from database
	 * @param calculator - Token calculator instance
	 * @param baselineTotal - Current totalTokens from database (SSOT)
	 */
	constructor(calculator: TokenCalculator, baselineTotal: number) {
		this.calculator = calculator;
		this.baselineTotal = baselineTotal;
		this.streamingDelta = 0;
	}

	/**
	 * Add tokens from a streaming delta chunk
	 * Returns new optimistic total
	 */
	async addDelta(deltaText: string): Promise<number> {
		const tokens = await this.calculator.calculateDeltaTokens(deltaText);
		this.streamingDelta += tokens;
		return this.getCurrentTotal();
	}

	/**
	 * Get current optimistic total
	 * Baseline (DB) + Delta (streaming)
	 */
	getCurrentTotal(): number {
		return this.baselineTotal + this.streamingDelta;
	}

	/**
	 * Get baseline total from DB
	 */
	getBaselineTotal(): number {
		return this.baselineTotal;
	}

	/**
	 * Get accumulated delta during streaming
	 */
	getStreamingDelta(): number {
		return this.streamingDelta;
	}

	/**
	 * Reset tracker with new baseline after DB write
	 * Call this after step completion when DB has been updated
	 */
	reset(newBaseline: number) {
		this.baselineTotal = newBaseline;
		this.streamingDelta = 0;
	}
}
