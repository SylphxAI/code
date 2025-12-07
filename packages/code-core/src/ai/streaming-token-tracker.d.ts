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
export declare class StreamingTokenTracker {
    private calculator;
    private baselineTotal;
    private streamingDelta;
    /**
     * Initialize tracker with baseline from database
     * @param calculator - Token calculator instance
     * @param baselineTotal - Current totalTokens from database (SSOT)
     */
    constructor(calculator: TokenCalculator, baselineTotal: number);
    /**
     * Add tokens from a streaming delta chunk
     * Returns new optimistic total
     */
    addDelta(deltaText: string): Promise<number>;
    /**
     * Get current optimistic total
     * Baseline (DB) + Delta (streaming)
     */
    getCurrentTotal(): number;
    /**
     * Get baseline total from DB
     */
    getBaselineTotal(): number;
    /**
     * Get accumulated delta during streaming
     */
    getStreamingDelta(): number;
    /**
     * Reset tracker with new baseline after DB write
     * Call this after step completion when DB has been updated
     */
    reset(newBaseline: number): void;
}
//# sourceMappingURL=streaming-token-tracker.d.ts.map