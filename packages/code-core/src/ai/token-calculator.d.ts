/**
 * Token Calculator
 *
 * SSOT for token counting logic
 * All token calculations go through this class to ensure consistency
 *
 * ARCHITECTURE:
 * - Unified calculation logic for all use cases (/context, persistence, streaming)
 * - Handles all MessagePart types comprehensively
 * - Uses HuggingFace tokenizer for consistency across providers
 *
 * USAGE:
 * ```typescript
 * const calculator = new TokenCalculator(modelName);
 * const tokens = await calculator.calculateMessageTokens(message);
 * ```
 */
import type { MessagePart, MessageStep, SessionMessage } from "../types/session.types.js";
export declare class TokenCalculator {
    private model;
    constructor(model: string);
    /**
     * Calculate tokens for a single message part
     * COMPLETE: Handles all part types
     */
    calculatePartTokens(part: MessagePart): Promise<number>;
    /**
     * Calculate tokens for a message step
     * Sums all parts in the step
     */
    calculateStepTokens(step: MessageStep): Promise<number>;
    /**
     * Calculate tokens for a complete message
     * Sums all steps in the message
     */
    calculateMessageTokens(message: SessionMessage): Promise<number>;
    /**
     * Calculate tokens for entire session (all messages)
     * This is the core calculation used for persistence
     */
    calculateSessionTokens(messages: SessionMessage[]): Promise<number>;
    /**
     * Calculate tokens for a text delta (streaming)
     * Used for incremental updates during streaming
     */
    calculateDeltaTokens(deltaText: string): Promise<number>;
}
//# sourceMappingURL=token-calculator.d.ts.map