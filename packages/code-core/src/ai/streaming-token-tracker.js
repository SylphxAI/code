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
export class StreamingTokenTracker {
    calculator;
    baselineTotal; // From DB - SSOT value at stream start
    streamingDelta = 0; // Accumulated during current step
    /**
     * Initialize tracker with baseline from database
     * @param calculator - Token calculator instance
     * @param baselineTotal - Current totalTokens from database (SSOT)
     */
    constructor(calculator, baselineTotal) {
        this.calculator = calculator;
        this.baselineTotal = baselineTotal;
        this.streamingDelta = 0;
    }
    /**
     * Add tokens from a streaming delta chunk
     * Returns new optimistic total
     */
    async addDelta(deltaText) {
        const tokens = await this.calculator.calculateDeltaTokens(deltaText);
        this.streamingDelta += tokens;
        return this.getCurrentTotal();
    }
    /**
     * Get current optimistic total
     * Baseline (DB) + Delta (streaming)
     */
    getCurrentTotal() {
        return this.baselineTotal + this.streamingDelta;
    }
    /**
     * Get baseline total from DB
     */
    getBaselineTotal() {
        return this.baselineTotal;
    }
    /**
     * Get accumulated delta during streaming
     */
    getStreamingDelta() {
        return this.streamingDelta;
    }
    /**
     * Reset tracker with new baseline after DB write
     * Call this after step completion when DB has been updated
     */
    reset(newBaseline) {
        this.baselineTotal = newBaseline;
        this.streamingDelta = 0;
    }
}
//# sourceMappingURL=streaming-token-tracker.js.map