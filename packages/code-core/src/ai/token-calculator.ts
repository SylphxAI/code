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

import { countTokens } from "../utils/token-counter.js";
import type { SessionMessage, MessagePart, MessageStep } from "../types/session.types.js";

export class TokenCalculator {
	private model: string;

	constructor(model: string) {
		this.model = model;
	}

	/**
	 * Calculate tokens for a single message part
	 * COMPLETE: Handles all part types
	 */
	async calculatePartTokens(part: MessagePart): Promise<number> {
		switch (part.type) {
			case "text":
			case "reasoning":
				// Text and reasoning content
				return await countTokens(part.content, this.model);

			case "tool": {
				// Tool calls: count both input and result
				let tokens = 0;
				if (part.input) {
					const inputJson = JSON.stringify(part.input);
					tokens += await countTokens(inputJson, this.model);
				}
				if (part.result) {
					const resultJson = JSON.stringify(part.result);
					tokens += await countTokens(resultJson, this.model);
				}
				return tokens;
			}

			case "file": {
				// File content (frozen as base64)
				if ("base64" in part) {
					try {
						const content = Buffer.from(part.base64, "base64").toString("utf-8");
						return await countTokens(content, this.model);
					} catch {
						// Skip invalid file content (e.g., binary files)
						return 0;
					}
				}
				return 0;
			}

			case "file-ref":
				// File-ref: content in file_contents table, not counted here
				// TODO: Add support if needed
				return 0;

			case "system-message":
				// System message content
				return await countTokens(part.content, this.model);

			case "error":
				// Error parts not sent to LLM
				return 0;

			default:
				// Exhaustive check
				return 0;
		}
	}

	/**
	 * Calculate tokens for a message step
	 * Sums all parts in the step
	 */
	async calculateStepTokens(step: MessageStep): Promise<number> {
		let total = 0;
		for (const part of step.parts) {
			total += await this.calculatePartTokens(part);
		}
		return total;
	}

	/**
	 * Calculate tokens for a complete message
	 * Sums all steps in the message
	 */
	async calculateMessageTokens(message: SessionMessage): Promise<number> {
		let total = 0;
		for (const step of message.steps) {
			total += await this.calculateStepTokens(step);
		}
		return total;
	}

	/**
	 * Calculate tokens for entire session (all messages)
	 * This is the core calculation used for persistence
	 */
	async calculateSessionTokens(messages: SessionMessage[]): Promise<number> {
		let total = 0;
		for (const message of messages) {
			total += await this.calculateMessageTokens(message);
		}
		return total;
	}

	/**
	 * Calculate tokens for a text delta (streaming)
	 * Used for incremental updates during streaming
	 */
	async calculateDeltaTokens(deltaText: string): Promise<number> {
		return await countTokens(deltaText, this.model);
	}
}
