/**
 * Input Handlers Hook
 *
 * Creates and memoizes all input mode handlers for the InputModeManager.
 * Extracted from Chat.tsx to improve modularity and testability.
 */

import type { FilteredFile } from "@sylphx/code-client";
import type React from "react";
import { useMemo } from "react";
import type { Command, CommandContext } from "../../commands/types.js";
import {
	CommandAutocompleteModeHandler,
	FileNavigationModeHandler,
	MessageHistoryModeHandler,
	PendingCommandModeHandler,
	QueueBrowsingModeHandler,
	SelectionModeHandler,
} from "./index.js";

/**
 * Dependencies for all input handlers
 * Consolidates all required state and callbacks
 */
export interface InputHandlerDeps {
	// Selection mode dependencies
	inputResolver: React.MutableRefObject<((value: any) => void) | null>;
	multiSelectionPage: number;
	multiSelectionAnswers: Record<string, any>;
	multiSelectChoices: Set<number>;
	selectionFilter: string;
	isFilterMode: boolean;
	freeTextInput: string;
	isFreeTextMode: boolean;
	selectedCommandIndex: number;
	commandSessionRef: React.MutableRefObject<string | null>;
	currentSessionId: string | null;
	setSelectedCommandIndex: React.Dispatch<React.SetStateAction<number>>;
	setMultiSelectionPage: React.Dispatch<React.SetStateAction<number>>;
	setMultiSelectionAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
	setMultiSelectChoices: React.Dispatch<React.SetStateAction<Set<number>>>;
	setSelectionFilter: React.Dispatch<React.SetStateAction<string>>;
	setIsFilterMode: React.Dispatch<React.SetStateAction<boolean>>;
	setFreeTextInput: React.Dispatch<React.SetStateAction<string>>;
	setIsFreeTextMode: React.Dispatch<React.SetStateAction<boolean>>;
	setPendingInput: (value: any) => void;
	addLog: (message: string) => void;
	addMessage: (params: any) => Promise<string>;
	getAIConfig: () => { defaultProvider?: string; defaultModel?: string } | null;
	setCurrentSessionId: (sessionId: string | null) => void;

	// Pending command mode dependencies
	pendingCommand: any;
	cachedOptions: any[];
	setPendingCommand: React.Dispatch<React.SetStateAction<any>>;
	createCommandContext: (args: string[]) => CommandContext;

	// File navigation mode dependencies
	filteredFileInfo: FilteredFile;
	selectedFileIndex: number;
	currentSession: any;
	input: string;
	setInput: (value: string) => void;
	setCursor: (value: number) => void;
	setSelectedFileIndex: React.Dispatch<React.SetStateAction<number>>;
	addAttachment: (file: { path: string; relativePath: string; size: number }) => void;
	setAttachmentTokenCount: (count: number) => void;

	// Command autocomplete mode dependencies
	filteredCommands: Command[];
	skipNextSubmit: React.MutableRefObject<boolean>;

	// Message history mode dependencies
	messageHistory: import("../../screens/chat/hooks/useInputState.js").MessageHistoryEntry[];
	historyIndex: number;
	tempInput: string;
	tempAttachments: import("@sylphx/code-core").FileAttachment[];
	pendingAttachments: import("@sylphx/code-core").FileAttachment[];
	isStreaming: boolean;
	inputComponent: React.ReactNode | null;
	setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
	setTempInput: (value: string) => void;
	setTempAttachments: (attachments: import("@sylphx/code-core").FileAttachment[]) => void;
	setPendingAttachments: (attachments: import("@sylphx/code-core").FileAttachment[]) => void;

	// Queue browsing mode dependencies
	queuedMessages: import("@sylphx/code-core").QueuedMessage[];
	removeQueuedMessage: (messageId: string) => Promise<void>;
}

/**
 * Creates and memoizes all input handlers
 *
 * @param deps - All dependencies required by the handlers
 * @returns Array of handler instances, memoized and ready to use
 *
 * @example
 * ```tsx
 * const handlers = useInputHandlers({
 *   inputResolver,
 *   multiSelectionPage,
 *   // ... other deps
 * });
 *
 * useInputModeManager({
 *   context: inputModeContext,
 *   handlers,
 * });
 * ```
 */
export function useInputHandlers(deps: InputHandlerDeps) {
	const {
		// Selection mode
		inputResolver,
		multiSelectionPage,
		multiSelectionAnswers,
		multiSelectChoices,
		selectionFilter,
		isFilterMode,
		freeTextInput,
		isFreeTextMode,
		selectedCommandIndex,
		commandSessionRef,
		currentSessionId,
		setSelectedCommandIndex,
		setMultiSelectionPage,
		setMultiSelectionAnswers,
		setMultiSelectChoices,
		setSelectionFilter,
		setIsFilterMode,
		setFreeTextInput,
		setIsFreeTextMode,
		setPendingInput,
		addLog,
		addMessage,
		getAIConfig,
		setCurrentSessionId,

		// Pending command mode
		pendingCommand,
		cachedOptions,
		setPendingCommand,
		createCommandContext,

		// File navigation mode
		filteredFileInfo,
		selectedFileIndex,
		currentSession,
		input,
		setInput,
		setCursor,
		setSelectedFileIndex,
		addAttachment,
		setAttachmentTokenCount,

		// Command autocomplete mode
		filteredCommands,
		skipNextSubmit,

		// Message history mode
		messageHistory,
		historyIndex,
		tempInput,
		tempAttachments,
		pendingAttachments,
		isStreaming,
		inputComponent,
		setHistoryIndex,
		setTempInput,
		setTempAttachments,
		setPendingAttachments,

		// Queue browsing mode
		queuedMessages,
		removeQueuedMessage,
	} = deps;

	// Selection mode handler
	const selectionHandler = useMemo(
		() =>
			new SelectionModeHandler({
				inputResolver,
				multiSelectionPage,
				multiSelectionAnswers,
				multiSelectChoices,
				selectionFilter,
				isFilterMode,
				freeTextInput,
				isFreeTextMode,
				selectedCommandIndex,
				commandSessionRef,
				currentSessionId,
				setSelectedCommandIndex,
				setMultiSelectionPage,
				setMultiSelectionAnswers,
				setMultiSelectChoices,
				setSelectionFilter,
				setIsFilterMode,
				setFreeTextInput,
				setIsFreeTextMode,
				setPendingInput,
				addLog,
				addMessage,
				getAIConfig,
			}),
		[
			inputResolver,
			multiSelectionPage,
			multiSelectionAnswers,
			multiSelectChoices,
			selectionFilter,
			isFilterMode,
			freeTextInput,
			isFreeTextMode,
			selectedCommandIndex,
			commandSessionRef,
			currentSessionId,
			setSelectedCommandIndex,
			setMultiSelectionPage,
			setMultiSelectionAnswers,
			setMultiSelectChoices,
			setSelectionFilter,
			setIsFilterMode,
			setFreeTextInput,
			setIsFreeTextMode,
			setPendingInput,
			addLog,
			addMessage,
			getAIConfig,
		],
	);

	// Pending command mode handler
	const pendingCommandHandler = useMemo(
		() =>
			new PendingCommandModeHandler({
				pendingCommand,
				cachedOptions,
				selectedCommandIndex,
				currentSessionId,
				setSelectedCommandIndex,
				setPendingCommand,
				createCommandContext,
				addMessage,
			}),
		[
			pendingCommand,
			cachedOptions,
			selectedCommandIndex,
			currentSessionId,
			setSelectedCommandIndex,
			setPendingCommand,
			createCommandContext,
			addMessage,
		],
	);

	// File navigation mode handler
	const fileNavigationHandler = useMemo(
		() =>
			new FileNavigationModeHandler({
				filteredFileInfo,
				selectedFileIndex,
				currentSession,
				input,
				setInput,
				setCursor,
				setSelectedFileIndex,
				addAttachment,
				setAttachmentTokenCount,
			}),
		[
			filteredFileInfo,
			selectedFileIndex,
			currentSession,
			input,
			setInput,
			setCursor,
			setSelectedFileIndex,
			addAttachment,
			setAttachmentTokenCount,
		],
	);

	// Command autocomplete mode handler
	const commandAutocompleteHandler = useMemo(
		() =>
			new CommandAutocompleteModeHandler({
				filteredCommands,
				selectedCommandIndex,
				skipNextSubmit,
				setInput,
				setCursor,
				setSelectedCommandIndex,
				createCommandContext,
			}),
		[
			filteredCommands,
			selectedCommandIndex,
			skipNextSubmit,
			setInput,
			setCursor,
			setSelectedCommandIndex,
			createCommandContext,
		],
	);

	// Message history mode handler
	const messageHistoryHandler = useMemo(
		() =>
			new MessageHistoryModeHandler({
				messageHistory,
				historyIndex,
				tempInput,
				tempAttachments,
				input,
				pendingAttachments,
				isStreaming,
				inputComponent,
				filteredCommands,
				filteredFileInfo,
				setInput,
				setCursor,
				setHistoryIndex,
				setTempInput,
				setTempAttachments,
				setPendingAttachments,
			}),
		[
			messageHistory,
			historyIndex,
			tempInput,
			tempAttachments,
			input,
			pendingAttachments,
			isStreaming,
			inputComponent,
			filteredCommands,
			filteredFileInfo,
			setInput,
			setCursor,
			setHistoryIndex,
			setTempInput,
			setTempAttachments,
			setPendingAttachments,
		],
	);

	// Queue browsing mode handler
	const queueBrowsingHandler = useMemo(
		() =>
			new QueueBrowsingModeHandler({
				queuedMessages,
				input,
				isStreaming,
				inputComponent,
				filteredCommands,
				filteredFileInfo,
				currentSessionId,
				setInput,
				setCursor,
				setPendingAttachments,
				removeQueuedMessage,
			}),
		[
			queuedMessages,
			input,
			isStreaming,
			inputComponent,
			filteredCommands,
			filteredFileInfo,
			currentSessionId,
			setInput,
			setCursor,
			setPendingAttachments,
			removeQueuedMessage,
		],
	);

	// Return all handlers in priority order (highest to lowest)
	const allHandlers = [
		selectionHandler, // Priority 20
		pendingCommandHandler, // Priority 15
		fileNavigationHandler, // Priority 12
		commandAutocompleteHandler, // Priority 10
		queueBrowsingHandler, // Priority 6
		messageHistoryHandler, // Priority 5
	];

	console.log("[useInputHandlers] Created handlers:", {
		count: allHandlers.length,
		queueBrowsingActive: queueBrowsingHandler.isActive({
			mode: queueBrowsingHandler.mode,
			pendingInput: null,
			debug: false,
		}),
		queuedMessagesLength: queuedMessages.length,
	});

	return allHandlers;
}
