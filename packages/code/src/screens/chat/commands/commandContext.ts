/**
 * Command Context Factory
 * Creates CommandContext objects for command execution
 */

import type { CodeClient } from "@sylphx/code-client";
import type { AIConfig, ProviderId } from "@sylphx/code-core";
import type { ReactNode } from "react";
import type { Command, CommandContext, WaitForInputOptions } from "../../../commands/types.js";
import { getSelectedProvider, getSelectedModel } from "../../../session-state.js";

/**
 * Parameters needed to create command context
 *
 * ARCHITECTURE:
 * - Client passed from React hook (useLensClient) - never use getLensClient()
 * - Only pass what's truly needed for UI interaction
 * - Commands use useAppStore directly for most operations
 */
export interface CommandContextParams {
	// Lens client from React hook (useLensClient)
	client: CodeClient;

	// For message operations (complex logic)
	addMessage: (params: {
		sessionId: string | null;
		role: "user" | "assistant";
		content: string;
		attachments?: any[];
		usage?: any;
		finishReason?: string;
		metadata?: any;
		todoSnapshot?: any[];
		status?: "active" | "completed" | "error" | "abort";
		provider?: ProviderId;
		model?: string;
	}) => Promise<string>;

	// Current session ID for command session tracking
	currentSessionId: string | null;

	// File system operations
	saveConfig: (config: AIConfig) => Promise<void>;

	// AI operations
	sendUserMessageToAI: (
		message: string,
		attachments?: Array<{ path: string; relativePath: string; size?: number }>,
		options?: { skipUserMessage?: boolean },
	) => Promise<void>;

	// UI state setters (for waitForInput implementation)
	setInput: (value: string) => void;
	setPendingInput: (options: WaitForInputOptions | null) => void;
	setMultiSelectionPage: (page: number) => void;
	setMultiSelectionAnswers: (answers: Record<string, string | string[]>) => void;
	setMultiSelectChoices: (choices: Set<string>) => void;
	setSelectedCommandIndex: (index: number) => void;
	setSelectionFilter: (filter: string) => void;
	setIsFilterMode: (isFilterMode: boolean) => void;
	setInputComponent: (component: ReactNode | null, title?: string) => void;

	// Refs for async operations
	inputResolver: React.MutableRefObject<
		((value: string | Record<string, string | string[]>) => void) | null
	>;
	commandSessionRef: React.MutableRefObject<string | null>;

	// Convenience (could use store directly)
	addLog: (message: string) => void;
	getCommands: () => Command[];
}

/**
 * Create a CommandContext for command execution
 *
 * Factory function that creates a CommandContext object with all required methods.
 * Extracted from Chat.tsx to improve modularity and testability.
 */
export function createCommandContext(args: string[], params: CommandContextParams): CommandContext {
	const {
		client,
		addMessage,
		currentSessionId,
		saveConfig,
		sendUserMessageToAI,
		setInput,
		setPendingInput,
		setMultiSelectionPage,
		setMultiSelectionAnswers,
		setMultiSelectChoices,
		setSelectedCommandIndex,
		setSelectionFilter,
		setIsFilterMode,
		setInputComponent,
		inputResolver,
		commandSessionRef,
		addLog,
		getCommands,
	} = params;

	return {
		client,
		args,

		sendMessage: async (content: string) => {
			// Get selected provider/model from session state
			const providerValue = getSelectedProvider();
			const modelValue = getSelectedModel();
			const provider = (providerValue || "openrouter") as ProviderId;
			const model = modelValue || "anthropic/claude-3.5-sonnet";

			// Reuse existing command session or pass null (will create new session)
			const sessionIdToUse = commandSessionRef.current || currentSessionId;

			// addMessage returns the sessionId (either existing or newly created)
			const resultSessionId = await addMessage({
				sessionId: sessionIdToUse,
				role: "assistant",
				content,
				provider,
				model,
			});

			// Store the session ID for future messages
			if (!commandSessionRef.current) {
				commandSessionRef.current = resultSessionId;
			}
		},

		triggerAIResponse: async (
			message: string,
			attachments?: Array<{
				path: string;
				relativePath: string;
				size?: number;
			}>,
		) => {
			// Clear input
			setInput("");

			addLog(`[triggerAIResponse] Triggering AI with message: "${message}"`);

			// Pass message and attachments to sendUserMessageToAI
			// Empty message = use existing messages only (content array will be empty)
			// Non-empty message = add new user message then stream
			await sendUserMessageToAI(message, attachments);
		},

		waitForInput: (options) => {
			return new Promise((resolve) => {
				addLog(`[waitForInput] Waiting for ${options.type} input`);

				// Both text and selection use pendingInput for now
				// The Chat component handles rendering based on input type
				inputResolver.current = resolve;
				setPendingInput(options);
			});
		},

		setInputComponent: (component, title) => setInputComponent(component, title),
		saveConfig: (config) => saveConfig(config),
		getCommands: () => getCommands(),
		addLog: (message) => addLog(message),
	};
}
