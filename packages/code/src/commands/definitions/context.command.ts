/**
 * Context Command
 * Display context window usage
 */

import type { Command } from "../types.js";

export const contextCommand: Command = {
	id: "context",
	label: "/context",
	description: "Display context window usage and token breakdown",
	execute: async (context) => {
		try {
			console.log("[Context] Command starting...");
			context.addLog("[Context] Starting context calculation...");

			const { formatTokenCount } = await import("@sylphx/code-core");
			const { get, getTRPCClient } = await import("@sylphx/code-client");
			const { $currentSession } = await import("@sylphx/code-client");

			console.log("[Context] Imports loaded");
			context.addLog("[Context] Imports loaded");

			const currentSession = get($currentSession);

			// Get model name from session or AI config
			let modelName: string;
			let sessionId: string | null = null;

			if (currentSession) {
				context.addLog(`[Context] Current session: ${currentSession.id}`);
				modelName = currentSession.model;
				sessionId = currentSession.id;
			} else {
				context.addLog("[Context] No active session, showing base context");
				const { get: getStore } = await import("@sylphx/code-client");
				const { $aiConfig } = await import("@sylphx/code-client");
				const aiConfig = getStore($aiConfig);
				modelName = aiConfig?.defaultModel || "anthropic/claude-3.5-sonnet";
			}

			// Get model-specific context limit
			const getContextLimit = (model: string): number => {
				// Default limits for common models
				if (model.includes("gpt-4")) {
					if (model.includes("32k") || model.includes("turbo")) return 128000;
					if (model.includes("vision")) return 128000;
					return 8192; // Original GPT-4
				}
				if (model.includes("gpt-3.5")) {
					if (model.includes("16k")) return 16385;
					return 4096; // Original GPT-3.5
				}
				// Claude models
				if (model.includes("claude-3")) {
					if (model.includes("opus")) return 200000;
					if (model.includes("sonnet")) return 200000;
					if (model.includes("haiku")) return 200000;
				}
				// Default fallback
				return 200000;
			};

			const contextLimit = getContextLimit(modelName);

			// Calculate token counts (SERVER HANDLES ALL FILE I/O AND BUSINESS LOGIC)
			console.log(`[Context] Model: ${modelName}, sessionId: ${sessionId}, contextLimit: ${contextLimit}`);
			context.addLog(
				`[Context] Calculating token counts for ${modelName} (limit: ${formatTokenCount(contextLimit)})...`,
			);

			const trpc = getTRPCClient();
			console.log("[Context] Calling tRPC getContextInfo...");
			const result = await trpc.session.getContextInfo.query({
				sessionId: sessionId,
			});

			console.log("[Context] tRPC result:", result.success ? "success" : `error: ${result.error}`);
			if (!result.success) {
				console.log("[Context] Returning error:", result.error);
				return `Error: ${result.error}`;
			}

			const {
				systemPromptTokens,
				systemPromptBreakdown,
				toolsTokensTotal,
				toolTokens,
				messagesTokens,
				toolCount,
			} = result;

			// Calculate totals and percentages
			const usedTokens = systemPromptTokens + toolsTokensTotal + messagesTokens;
			const freeTokens = contextLimit - usedTokens;
			const autocompactBuffer = Math.floor(contextLimit * 0.225); // 22.5%
			const realFreeTokens = freeTokens - autocompactBuffer;

			const usedPercent = ((usedTokens / contextLimit) * 100).toFixed(1);
			const systemPromptPercent = ((systemPromptTokens / contextLimit) * 100).toFixed(1);
			const toolsPercent = ((toolsTokensTotal / contextLimit) * 100).toFixed(1);
			const messagesPercent = ((messagesTokens / contextLimit) * 100).toFixed(1);
			const freePercent = ((realFreeTokens / contextLimit) * 100).toFixed(1);
			const bufferPercent = ((autocompactBuffer / contextLimit) * 100).toFixed(1);

			// Create visual bar chart (30 blocks for better resolution)
			const createBarChart = (): string[] => {
				const totalBlocks = 30;
				const systemPromptBlocks = Math.floor((systemPromptTokens / contextLimit) * totalBlocks);
				const toolsBlocks = Math.floor((toolsTokensTotal / contextLimit) * totalBlocks);
				const messagesBlocks = Math.floor((messagesTokens / contextLimit) * totalBlocks);
				const usedBlocks = systemPromptBlocks + toolsBlocks + messagesBlocks;
				const freeBlocks = totalBlocks - usedBlocks;

				// Line 1: System prompt (blue)
				const line1 = "█".repeat(systemPromptBlocks) + "░".repeat(totalBlocks - systemPromptBlocks);

				// Line 2: Tools (green)
				const line2 =
					"░".repeat(systemPromptBlocks) +
					"█".repeat(toolsBlocks) +
					"░".repeat(totalBlocks - systemPromptBlocks - toolsBlocks);

				// Line 3: Messages (yellow)
				const line3 =
					"░".repeat(systemPromptBlocks + toolsBlocks) +
					"█".repeat(messagesBlocks) +
					"░".repeat(freeBlocks);

				return [line1, line2, line3];
			};

			const [bar1, bar2, bar3] = createBarChart();

			// Format tool list with tokens (sorted by size)
			const toolList = Object.entries(toolTokens)
				.sort((a, b) => b[1] - a[1])
				.map(([name, tokens]) => `    ${name}: ${formatTokenCount(tokens)} tokens`)
				.join("\n");

			// Format system prompt breakdown
			const systemPromptBreakdownText = systemPromptBreakdown
				? Object.entries(systemPromptBreakdown)
						.map(([name, tokens]) => `    ${name}: ${formatTokenCount(tokens)} tokens`)
						.join("\n")
				: "    (breakdown unavailable)";

			// Format output with clean visual hierarchy
			const sessionNote = sessionId ? "" : "\n📌 Showing base context (no active session)\n";
			const output = `${sessionNote}
Context Usage: ${formatTokenCount(usedTokens)}/${formatTokenCount(contextLimit)} tokens (${usedPercent}%)
Model: ${modelName}

Visual Breakdown:
  ${bar1}  System prompt: ${formatTokenCount(systemPromptTokens)} (${systemPromptPercent}%)
  ${bar2}  Tools:         ${formatTokenCount(toolsTokensTotal)} (${toolsPercent}%)
  ${bar3}  Messages:      ${formatTokenCount(messagesTokens)} (${messagesPercent}%)

Available Space:
  • Free: ${formatTokenCount(realFreeTokens)} tokens (${freePercent}%)
  • Buffer: ${formatTokenCount(autocompactBuffer)} tokens (${bufferPercent}%)

System Prompt Breakdown:
${systemPromptBreakdownText}

System Tools (${toolCount} total):
${toolList}
`.trim();

			console.log("[Context] Output generated, length:", output.length);
			console.log("[Context] First 200 chars:", output.substring(0, 200));
			return output;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;

			console.log("[Context] ERROR CAUGHT:", errorMsg);
			context.addLog(`[Context] Error: ${errorMsg}`);
			console.error("[Context] Full error:", error);
			console.error("[Context] Stack trace:", errorStack);

			return `❌ Failed to get context info: ${errorMsg}`;
		}
	},
};

export default contextCommand;
