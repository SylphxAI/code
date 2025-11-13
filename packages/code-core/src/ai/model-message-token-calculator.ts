/**
 * Model Message Token Calculator
 * SSOT for calculating tokens of AI SDK ModelMessage format
 *
 * ARCHITECTURE PRINCIPLE:
 * - Calculate tokens based on ACTUAL messages sent to AI (model messages)
 * - NOT based on session messages (database storage format)
 * - model messages = buildModelMessages(session messages)
 * - Includes ALL transformations: system message injection, file loading, format conversion
 *
 * WHY THIS MATTERS:
 * - Auto-compact needs accurate usage
 * - Context management relies on this number
 * - Multi-client real-time sync requires consistent calculations
 * - All features depend on this SSOT being accurate
 */

import type { ModelMessage } from "ai";
import { countTokens } from "../utils/token-counter.js";

/**
 * Calculate tokens for AI SDK ModelMessage array
 * This is what ACTUALLY gets sent to the AI model
 *
 * @param modelMessages - Messages in AI SDK format (from buildModelMessages)
 * @param modelName - Model name for tokenizer selection
 * @returns Total tokens for all messages
 */
export async function calculateModelMessagesTokens(
	modelMessages: ModelMessage[],
	modelName: string,
): Promise<number> {
	let totalTokens = 0;

	for (const message of modelMessages) {
		totalTokens += await calculateModelMessageTokens(message, modelName);
	}

	return totalTokens;
}

/**
 * Calculate tokens for a single ModelMessage
 * Handles all content types: text, file, reasoning, tool-call, tool-result
 */
async function calculateModelMessageTokens(
	message: ModelMessage,
	modelName: string,
): Promise<number> {
	let tokens = 0;

	// Role overhead (minimal, but include for accuracy)
	// AI SDK includes role in prompt construction
	tokens += await countTokens(message.role, modelName);

	// Calculate content tokens based on type
	const content = message.content;

	if (typeof content === "string") {
		// Simple string content
		tokens += await countTokens(content, modelName);
	} else if (Array.isArray(content)) {
		// Array of content parts
		for (const part of content) {
			tokens += await calculateContentPartTokens(part, modelName);
		}
	}

	return tokens;
}

/**
 * Calculate tokens for a content part
 * Handles all AI SDK content part types
 */
async function calculateContentPartTokens(
	part: any, // AI SDK content types are complex, use any for flexibility
	modelName: string,
): Promise<number> {
	switch (part.type) {
		case "text":
			// Text content
			return await countTokens(part.text, modelName);

		case "reasoning":
			// Extended thinking (Anthropic)
			return await countTokens(part.text, modelName);

		case "file": {
			// File content sent to model
			// part.data can be Buffer or base64 string
			let fileContent: string;
			if (Buffer.isBuffer(part.data)) {
				// Binary file - try to decode as UTF-8, fallback to size estimation
				try {
					fileContent = part.data.toString("utf-8");
				} catch {
					// Binary content - estimate tokens by size
					// Rough estimation: 1 token ≈ 4 bytes for binary
					return Math.ceil(part.data.length / 4);
				}
			} else if (typeof part.data === "string") {
				// Base64 string
				try {
					const buffer = Buffer.from(part.data, "base64");
					fileContent = buffer.toString("utf-8");
				} catch {
					// Fallback: count the base64 string itself
					return await countTokens(part.data, modelName);
				}
			} else {
				return 0;
			}

			// For text files, count actual tokens
			// Include filename and mediaType in XML wrapper (as sent to model)
			const wrappedContent = `<file path="${part.filename || 'file'}" type="${part.mediaType || 'unknown'}">\n${fileContent}\n</file>`;
			return await countTokens(wrappedContent, modelName);
		}

		case "tool-call": {
			// Tool call - count toolName + input
			let tokens = 0;
			tokens += await countTokens(part.toolName, modelName);
			if (part.input) {
				const inputJson = JSON.stringify(part.input);
				tokens += await countTokens(inputJson, modelName);
			}
			return tokens;
		}

		case "tool-result": {
			// Tool result - count toolName + output
			let tokens = 0;
			tokens += await countTokens(part.toolName, modelName);
			if (part.output) {
				// output is AI SDK wrapped format: { type: 'json', value: ... } or { type: 'text', text: ... }
				const outputJson = JSON.stringify(part.output);
				tokens += await countTokens(outputJson, modelName);
			}
			return tokens;
		}

		case "image": {
			// Image content - images have fixed token cost depending on model
			// For now, use a rough estimation
			// TODO: Implement model-specific image token calculation
			// - Claude: ~1600 tokens per image (depends on size)
			// - GPT-4V: varies by size
			// - Gemini: varies
			// For now, conservative estimate: 1500 tokens per image
			return 1500;
		}

		default:
			// Unknown part type - log warning and skip
			console.warn(`[calculateContentPartTokens] Unknown part type: ${part.type}`);
			return 0;
	}
}
