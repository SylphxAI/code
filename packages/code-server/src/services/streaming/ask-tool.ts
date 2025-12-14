/**
 * Server-side Ask Tool
 * Uses server-managed queue with direct eventStream publishing
 */

import { tool } from "ai";
import { z } from "zod";
import { enqueueAsk } from "../ask-queue.service.js";

/**
 * Create server-side ask tool with session context
 * Events are published directly to eventStream - no observer needed
 */
export function createAskTool(sessionId: string) {
	return tool({
		description:
			"Ask the user a multiple choice question and wait for their selection. Supports predefined options, free text input, and default selections.",
		inputSchema: z.object({
			question: z.string().describe("Question to ask"),
			options: z
				.array(
					z.object({
						label: z.string().describe("Display text for this option"),
						value: z
							.string()
							.optional()
							.describe("Return value (defaults to label if not provided)"),
						freeText: z
							.boolean()
							.optional()
							.describe(
								'If true, selecting this option lets user type custom text instead of selecting from list. Use for "Other..." options',
							),
						placeholder: z
							.string()
							.optional()
							.describe(
								'Placeholder text shown when user enters free text mode (e.g., "Enter custom option...")',
							),
						checked: z
							.boolean()
							.optional()
							.describe(
								"Default checked state (only for multiSelect). If true, option is pre-selected",
							),
					}),
				)
				.min(1)
				.describe("Options to choose from. Can include free text options for custom input"),
			multiSelect: z
				.boolean()
				.optional()
				.describe(
					"Allow multiple selections. Returns comma-separated values. Use checked field to pre-select options",
				),
			preSelected: z
				.array(z.string())
				.optional()
				.describe(
					"Pre-selected values for multi-select (question-level default). Use option.checked for per-option control",
				),
		}),
		execute: async ({ question, options, multiSelect, preSelected }, { toolCallId }) => {
			// Enqueue ask and wait for answer via server-side queue
			// toolCallId is provided by AI SDK
			const answer = await enqueueAsk(
				sessionId,
				toolCallId,
				question,
				options,
				multiSelect,
				preSelected,
			);

			return answer;
		},
	});
}
