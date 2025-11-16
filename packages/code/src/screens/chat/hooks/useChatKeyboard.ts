/**
 * Consolidated Chat Keyboard Hook
 * All keyboard navigation and shortcuts
 */

import { removeQueuedMessage, useQueuedMessages } from "@sylphx/code-client";
import { useCallback } from "react";
import { DEBUG_INPUT_MANAGER, USE_NEW_INPUT_MANAGER } from "../../../config/features.js";
import {
	useInputHandlers,
	useInputMode,
	useInputModeManager,
} from "../../../hooks/input-manager/index.js";
import { useAbortHandler } from "../../../hooks/keyboard/useAbortHandler.js";
import { useKeyboardShortcuts } from "../../../hooks/keyboard/useKeyboardShortcuts.js";
import { hasClipboardImage, imageToBase64, readClipboardImage } from "../../../utils/clipboard.js";
import type { ChatEffects } from "./useChatEffects.js";
import type { ChatState } from "./useChatState.js";
import { useFileAutocompleteHandlers } from "./useFileAutocompleteHandlers.js";

export function useChatKeyboard(state: ChatState, effects: ChatEffects) {
	// Get queued messages for queue browsing
	const { queuedMessages } = useQueuedMessages();

	// Create remove function for queue retrieval
	const handleRemoveQueuedMessage = useCallback(
		async (messageId: string) => {
			if (!state.currentSessionId) return;
			await removeQueuedMessage(state.currentSessionId, messageId);
		},
		[state.currentSessionId],
	);

	// 1. Abort handler - ESC to abort streaming (highest priority)
	useAbortHandler({
		isStreaming: state.streamingState.isStreaming,
		abortControllerRef: state.streamingState.abortControllerRef,
		addLog: state.addLog,
	});

	// 2. Keyboard shortcuts - Double-ESC to clear input
	useKeyboardShortcuts({
		isStreaming: state.streamingState.isStreaming,
		input: state.inputState.input,
		lastEscapeTime: state.commandState.lastEscapeTime,
		setInput: state.inputState.setInput,
		setCursor: state.inputState.setCursor,
		setShowEscHint: state.setShowEscHint,
	});

	// 3. Input mode manager (new centralized system)
	const inputModeContext = useInputMode({
		pendingInput: state.selectionState.pendingInput,
		input: state.inputState.input,
		pendingCommand: state.commandState.pendingCommand,
		debug: DEBUG_INPUT_MANAGER,
	});

	// Create all input handlers
	const handlers = useInputHandlers({
		// Selection mode
		inputResolver: state.selectionState.inputResolver,
		multiSelectionPage: state.selectionState.multiSelectionPage,
		multiSelectionAnswers: state.selectionState.multiSelectionAnswers,
		multiSelectChoices: state.selectionState.multiSelectChoices,
		selectionFilter: state.selectionState.selectionFilter,
		isFilterMode: state.selectionState.isFilterMode,
		freeTextInput: state.selectionState.freeTextInput,
		isFreeTextMode: state.selectionState.isFreeTextMode,
		selectedCommandIndex: state.selectedCommandIndex,
		commandSessionRef: state.commandState.commandSessionRef,
		currentSessionId: state.currentSessionId,
		setSelectedCommandIndex: state.setSelectedCommandIndex,
		setMultiSelectionPage: state.selectionState.setMultiSelectionPage,
		setMultiSelectionAnswers: state.selectionState.setMultiSelectionAnswers,
		setMultiSelectChoices: state.selectionState.setMultiSelectChoices,
		setSelectionFilter: state.selectionState.setSelectionFilter,
		setIsFilterMode: state.selectionState.setIsFilterMode,
		setFreeTextInput: state.selectionState.setFreeTextInput,
		setIsFreeTextMode: state.selectionState.setIsFreeTextMode,
		setPendingInput: state.selectionState.setPendingInput,
		addLog: state.addLog,
		addMessage: effects.sendUserMessageToAI as any,
		getAIConfig: state.getAIConfig,
		setCurrentSessionId: () => {},
		// Pending command mode
		pendingCommand: state.commandState.pendingCommand,
		cachedOptions: state.commandState.cachedOptions,
		setPendingCommand: state.commandState.setPendingCommand,
		createCommandContext: effects.createCommandContextForArgs,
		// File navigation mode
		filteredFileInfo: effects.filteredFileInfo,
		selectedFileIndex: state.selectedFileIndex,
		currentSession: state.currentSession,
		input: state.inputState.input,
		setInput: state.inputState.setInput,
		setCursor: state.inputState.setCursor,
		setSelectedFileIndex: state.setSelectedFileIndex,
		addAttachment: state.addAttachment,
		setAttachmentTokenCount: state.setAttachmentTokenCount,
		// Command autocomplete mode
		filteredCommands: effects.filteredCommands,
		skipNextSubmit: state.commandState.skipNextSubmit,
		// Message history mode
		messageHistory: state.inputState.messageHistory,
		historyIndex: state.inputState.historyIndex,
		tempInput: state.inputState.tempInput,
		tempAttachments: state.tempAttachments,
		pendingAttachments: state.pendingAttachments,
		isStreaming: state.streamingState.isStreaming,
		inputComponent: state.commandState.inputComponent,
		setHistoryIndex: state.inputState.setHistoryIndex,
		setTempInput: state.inputState.setTempInput,
		setTempAttachments: state.setTempAttachments,
		setPendingAttachments: state.setPendingAttachments,
		// Queue retrieval mode
		queuedMessages,
		removeQueuedMessage: handleRemoveQueuedMessage,
	});

	// Setup input mode manager
	useInputModeManager({
		context: inputModeContext,
		handlers: USE_NEW_INPUT_MANAGER ? handlers : [],
		config: { debug: DEBUG_INPUT_MANAGER },
	});

	// Legacy file autocomplete handlers
	const fileAutocompleteHandlers = useFileAutocompleteHandlers({
		filteredFileInfo: effects.filteredFileInfo,
		selectedFileIndex: state.selectedFileIndex,
		input: state.inputState.input,
		setInput: state.inputState.setInput,
		setCursor: state.inputState.setCursor,
		setSelectedFileIndex: state.setSelectedFileIndex,
		addAttachment: state.addAttachment,
	});

	// Image paste handler
	const handlePasteImage = useCallback(async () => {
		const hasImage = await hasClipboardImage();
		if (!hasImage) return;

		const imagePath = await readClipboardImage();
		if (!imagePath) return;

		const base64Data = await imageToBase64(imagePath);

		const imageCount = state.pendingAttachments.filter((att) => att.type === "image").length;
		const imageTag = `[Image #${imageCount + 1}]`;

		state.addAttachment({
			path: imagePath,
			relativePath: imageTag,
			type: "image",
			imageData: base64Data,
		});

		const before = state.inputState.input.slice(0, state.inputState.normalizedCursor);
		const after = state.inputState.input.slice(state.inputState.normalizedCursor);
		const newInput = `${before}${imageTag}${after}`;

		state.inputState.setInput(newInput);
		state.inputState.setCursor(state.inputState.normalizedCursor + imageTag.length);
	}, [state]);

	return {
		fileAutocompleteHandlers,
		handlePasteImage,
	};
}

export type ChatKeyboard = ReturnType<typeof useChatKeyboard>;
