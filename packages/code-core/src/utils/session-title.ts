/**
 * Session Title Generation Utility
 * Re-exports pure functions from feature and adds streaming functionality
 */

import { streamText } from "ai";
import type { ProviderId } from "../types/config.types.js";
import { cleanAITitle } from "../session/utils/index.js";

/**
 * Generate a session title using LLM with streaming (collects full text)
 * Uses our ai-sdk.ts for consistency
 */
export async function generateSessionTitle(
	firstMessage: string,
	provider: ProviderId,
	modelName: string,
	providerConfig: Record<string, unknown>,
): Promise<string> {
	if (!firstMessage || firstMessage.trim().length === 0) {
		return "New Chat";
	}

	try {
		// Get the provider instance and create the model
		const { getProvider } = await import("../ai/providers/index.js");
		const providerInstance = getProvider(provider);
		const model = await Promise.resolve(providerInstance.createClient(providerConfig, modelName));

		// Use AI SDK's streamText directly
		const { fullStream } = streamText({
			model,
			messages: [
				{
					role: "user",
					content: `You need to generate a SHORT, DESCRIPTIVE title (maximum 50 characters) for a chat conversation.

User's first message: "${firstMessage}"

Requirements:
- Summarize the TOPIC or INTENT, don't just copy the message
- Be concise and descriptive
- Maximum 50 characters
- Output ONLY the title, nothing else

Examples:
- Message: "How do I implement authentication?" → Title: "Authentication Implementation"
- Message: "你好，请帮我修复这个 bug" → Title: "Bug 修复请求"
- Message: "Can you help me with React hooks?" → Title: "React Hooks Help"

Now generate the title:`,
				},
			],
		});

		let fullTitle = "";

		// Collect all text chunks from stream
		for await (const chunk of fullStream) {
			if (chunk.type === "text-delta" && chunk.textDelta) {
				fullTitle += chunk.textDelta;
			}
		}

		// Clean up title using our utility function
		return cleanAITitle(fullTitle, 50);
	} catch (error) {
		console.error("[generateSessionTitle] Error:", error);
		// Fallback to simple title generation on any error
		const { generateSessionTitle: fallback } = await import("../session/utils/fallback.js");
		return fallback(firstMessage);
	}
}

/**
 * Generate a session title using LLM with streaming
 */
export async function generateSessionTitleWithStreaming(
	firstMessage: string,
	provider: ProviderId,
	modelName: string,
	providerConfig: Record<string, unknown>,
	onChunk: (chunk: string) => void,
): Promise<string> {
	if (!firstMessage || firstMessage.trim().length === 0) {
		return "New Chat";
	}

	try {
		// Get the provider instance and create the model
		const { getProvider } = await import("../ai/providers/index.js");
		const providerInstance = getProvider(provider);
		const model = await Promise.resolve(providerInstance.createClient(providerConfig, modelName));

		const { fullStream } = streamText({
			model,
			messages: [
				{
					role: "user",
					content: `You need to generate a SHORT, DESCRIPTIVE title (maximum 50 characters) for a chat conversation.

User's first message: "${firstMessage}"

Requirements:
- Summarize the TOPIC or INTENT, don't just copy the message
- Be concise and descriptive
- Maximum 50 characters
- Output ONLY the title, nothing else

Examples:
- Message: "How do I implement authentication?" → Title: "Authentication Implementation"
- Message: "你好，请帮我修复这个 bug" → Title: "Bug 修复请求"
- Message: "Can you help me with React hooks?" → Title: "React Hooks Help"

Now generate the title:`,
				},
			],
		});

		let fullTitle = "";

		// Iterate the async generator and stream to UI
		for await (const chunk of fullStream) {
			if (chunk.type === "text-delta" && chunk.textDelta) {
				fullTitle += chunk.textDelta;
				onChunk(chunk.textDelta);
			}
		}

		// Clean up title
		let cleaned = fullTitle.trim();
		cleaned = cleaned.replace(/^["'「『]+|["'」』]+$/g, ""); // Remove quotes
		cleaned = cleaned.replace(/^(Title:|标题：)\s*/i, ""); // Remove "Title:" prefix
		cleaned = cleaned.replace(/\n+/g, " "); // Replace newlines with spaces
		cleaned = cleaned.trim();

		// Return truncated if needed
		return cleaned.length > 50 ? cleaned.substring(0, 50) + "..." : cleaned;
	} catch (error) {
		// Fallback to simple title generation on any error
		return generateSessionTitle(firstMessage);
	}
}
