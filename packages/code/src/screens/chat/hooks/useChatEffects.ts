/**
 * Consolidated Chat Effects Hook
 * All useEffect logic and side effects for Chat component
 */

import {
	addMessageAsync as addMessage,
	setCurrentSessionId,
	updateSessionTitle,
	useAIConfigActions,
	useEventStream,
} from "@sylphx/code-client";
import { clearUserInputHandler, setUserInputHandler } from "@sylphx/code-core";
import { useCallback, useEffect, useMemo } from "react";
import { commands } from "../../../commands/registry.js";
import { useCommandAutocomplete } from "../autocomplete/commandAutocomplete.js";
import { useFileAutocomplete } from "../autocomplete/fileAutocomplete.js";
import { useCommandOptionLoader } from "../autocomplete/optionLoader.js";
import { createCommandContext } from "../commands/commandContext.js";
import { createHandleSubmit } from "../handlers/messageHandler.js";
import { createSubscriptionSendUserMessageToAI } from "../streaming/subscriptionAdapter.js";
import { DEFAULT_NOTIFICATION_SETTINGS } from "../types.js";
import type { ChatState } from "./useChatState.js";
import { useEventStreamCallbacks } from "./useEventStreamCallbacks.js";

export function useChatEffects(state: ChatState) {
	const { saveConfig } = useAIConfigActions();

	// Create sendUserMessageToAI function first (needed by command context)
	const sendUserMessageToAI = useCallback(
		createSubscriptionSendUserMessageToAI({
			aiConfig: state.aiConfig,
			currentSessionId: state.currentSessionId,
			selectedProvider: state.selectedProvider,
			selectedModel: state.selectedModel,
			addMessage,
			addLog: state.addLog,
			updateSessionTitle,
			notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
			abortControllerRef: state.streamingState.abortControllerRef,
			streamingMessageIdRef: state.streamingState.streamingMessageIdRef,
			setIsStreaming: state.streamingState.setIsStreaming,
			setIsTitleStreaming: state.streamingState.setIsTitleStreaming,
			setStreamingTitle: state.streamingState.setStreamingTitle,
		}),
		[
			state.aiConfig,
			state.currentSessionId,
			state.selectedProvider,
			state.selectedModel,
			state.addLog,
			state.streamingState.abortControllerRef,
			state.streamingState.streamingMessageIdRef,
			state.streamingState.setIsStreaming,
			state.streamingState.setIsTitleStreaming,
			state.streamingState.setStreamingTitle,
		],
	);

	// Autocomplete (depends on sendUserMessageToAI for command context)
	const filteredFileInfo = useFileAutocomplete(
		state.inputState.input,
		state.inputState.normalizedCursor,
		state.projectFiles,
	);

	// Command context factory (depends on sendUserMessageToAI)
	const createCommandContextForArgs = useCallback(
		(args: string[]) =>
			createCommandContext(args, {
				addMessage,
				currentSessionId: state.currentSessionId,
				saveConfig,
				sendUserMessageToAI,
				setInput: state.inputState.setInput,
				setPendingInput: state.selectionState.setPendingInput,
				setMultiSelectionPage: state.selectionState.setMultiSelectionPage,
				setMultiSelectionAnswers: state.selectionState.setMultiSelectionAnswers,
				setMultiSelectChoices: state.selectionState.setMultiSelectChoices,
				setSelectedCommandIndex: state.setSelectedCommandIndex,
				setSelectionFilter: state.selectionState.setSelectionFilter,
				setIsFilterMode: state.selectionState.setIsFilterMode,
				setInputComponent: state.commandState.setInputComponent,
				inputResolver: state.selectionState.inputResolver,
				commandSessionRef: state.commandState.commandSessionRef,
				addLog: state.addLog,
				getCommands: () => commands,
			}),
		[
			state.currentSessionId,
			saveConfig,
			sendUserMessageToAI,
			state.inputState.setInput,
			state.selectionState,
			state.setSelectedCommandIndex,
			state.commandState,
			state.addLog,
		],
	);

	// Command autocomplete (depends on command context factory)
	const filteredCommands = useCommandAutocomplete(
		state.inputState.input,
		state.inputState.normalizedCursor,
		state.commandState.cachedOptions,
		createCommandContextForArgs,
		commands,
	);

	// Event stream callbacks
	const eventStreamCallbacks = useEventStreamCallbacks({
		updateSessionTitle,
		setIsStreaming: state.streamingState.setIsStreaming,
		setIsTitleStreaming: state.streamingState.setIsTitleStreaming,
		setStreamingTitle: state.streamingState.setStreamingTitle,
		streamingMessageIdRef: state.streamingState.streamingMessageIdRef,
		addLog: state.addLog,
		aiConfig: state.aiConfig,
		notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
		setPendingInput: state.selectionState.setPendingInput,
		askToolContextRef: state.selectionState.askToolContextRef,
	});

	// Event stream for multi-client sync
	// IMPORTANT: replayLast > 0 required for compact auto-trigger
	useEventStream({
		replayLast: 50,
		callbacks: eventStreamCallbacks,
	});

	// Create handleSubmit function
	const handleSubmit = useMemo(
		() =>
			createHandleSubmit({
				isStreaming: () => state.streamingState.isStreaming,
				addMessage,
				getAIConfig: state.getAIConfig,
				setCurrentSessionId,
				pendingInput: state.selectionState.pendingInput,
				filteredCommands,
				pendingAttachments: state.pendingAttachments,
				projectFiles: state.projectFiles,
				setHistoryIndex: state.inputState.setHistoryIndex,
				setTempInput: state.inputState.setTempInput,
				setInput: state.inputState.setInput,
				setPendingInput: state.selectionState.setPendingInput,
				setPendingCommand: state.commandState.setPendingCommand,
				setMessageHistory: state.inputState.setMessageHistory,
				clearAttachments: state.clearAttachments,
				inputResolver: state.selectionState.inputResolver,
				commandSessionRef: state.commandState.commandSessionRef,
				skipNextSubmit: state.commandState.skipNextSubmit,
				currentSessionId: state.currentSessionId,
				addLog: state.addLog,
				sendUserMessageToAI,
				createCommandContext: createCommandContextForArgs,
				getCommands: () => commands,
			}),
		[
			state.streamingState,
			state.getAIConfig,
			state.selectionState.pendingInput,
			filteredCommands,
			state.pendingAttachments,
			state.projectFiles,
			state.inputState,
			state.selectionState.setPendingInput,
			state.commandState,
			state.clearAttachments,
			state.selectionState.inputResolver,
			state.currentSessionId,
			state.addLog,
			sendUserMessageToAI,
			createCommandContextForArgs,
		],
	);

	// Clear error when input changes
	useEffect(() => {
		state.commandState.setLoadError(null);
	}, [state.commandState.setLoadError]);

	// Command option loader
	useCommandOptionLoader(
		state.inputState.input,
		state.commandState.currentlyLoading,
		state.commandState.cachedOptions,
		state.commandState.setCachedOptions,
		state.commandState.setCurrentlyLoading,
		state.commandState.setLoadError,
		createCommandContextForArgs,
		commands,
		state.addLog,
	);

	// Sync UI streaming state with server state on session switch
	useEffect(() => {
		if (!state.currentSession) {
			state.streamingState.setIsStreaming(false);
			return;
		}

		const activeMessage = state.currentSession.messages.find((m) => m.status === "active");
		state.streamingState.setIsStreaming(!!activeMessage);
	}, [state.currentSession, state.streamingState.setIsStreaming]);

	// Reset selected indices when filtered lists change
	useEffect(() => {
		state.setSelectedCommandIndex(0);
	}, [state.setSelectedCommandIndex]);

	useEffect(() => {
		state.setSelectedFileIndex(0);
	}, [state.setSelectedFileIndex]);

	// Register user input handler for ask tool on mount, clear on unmount
	useEffect(() => {
		const handler = async (request: any) => {
			// ASSUMPTION: ask tool sends selection request matching pendingInput structure
			// Set pendingInput to show UI, return promise that resolves when user selects
			return new Promise<string | Record<string, string | string[]>>((resolve) => {
				state.selectionState.inputResolver.current = resolve;
				state.selectionState.setPendingInput({
					type: "selection",
					questions: request.questions,
				});
			});
		};

		setUserInputHandler(handler);

		return () => {
			clearUserInputHandler();
		};
	}, [state.selectionState]);

	return {
		handleSubmit,
		sendUserMessageToAI,
		createCommandContextForArgs,
		filteredFileInfo,
		filteredCommands,
	};
}

export type ChatEffects = ReturnType<typeof useChatEffects>;
