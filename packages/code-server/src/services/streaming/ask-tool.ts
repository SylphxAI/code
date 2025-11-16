/**
 * Server-side Ask Tool
 * Replaces client-side ask tool with server-managed queue
 */

import type { Observer } from "@trpc/server/observable";
import { tool } from "ai";
import { z } from "zod";
import { enqueueAsk, registerAskObserver } from "../ask-queue.service.js";
import type { StreamEvent } from "./types.js";

/**
 * Create server-side ask tool with session context
 * This replaces the client-side ask tool in code-core
 */
export function createAskTool(sessionId: string, observer: Observer<StreamEvent, unknown>) {
	// Register observer for this session to receive ask events
	registerAskObserver(sessionId, observer);

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
