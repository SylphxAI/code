/**
 * Consolidated Chat Effects Hook
 * All useEffect logic and side effects for Chat component
 */

import { useAIConfigActions } from "../../../hooks/client/useAIConfig.js";
import { useEventStream } from "../../../hooks/client/useEventStream.js";
import { useLensSessionSubscription } from "../../../hooks/client/useLensSessionSubscription.js";
import { addMessageAsync as addMessage, setCurrentSessionId, updateSessionTitle } from "@sylphx/code-client";
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
			setStreamingStartTime: state.streamingState.setStreamingStartTime,
			setStreamingOutputTokens: state.streamingState.setStreamingOutputTokens,
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
			state.streamingState.setStreamingStartTime,
			state.streamingState.setStreamingOutputTokens,
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
		currentStepIndexRef: state.streamingState.currentStepIndexRef,
		skipContentForStepRef: state.streamingState.skipContentForStepRef,
		setStreamingStartTime: state.streamingState.setStreamingStartTime,
		setStreamingOutputTokens: state.streamingState.setStreamingOutputTokens,
	});

	// Fine-Grained Reactive Architecture - Split Subscriptions
	//
	// 1. Session metadata subscription (Lens) - Model-level updates with field selection
	// 2. Content streaming subscription (Event Stream) - Incremental content events
	//
	// Architecture Perfect: "Select is All You Need"
	// - Frontend specifies WHAT data needed (via select)
	// - Backend auto-optimizes HOW to transmit (AutoStrategy)
	// - No manual configuration needed

	// Session metadata subscription
	// Currently using full model - can enable field selection for bandwidth optimization:
	//
	// useLensSessionSubscription({
	//   select: {
	//     id: true,
	//     title: true,
	//     status: true,
	//     totalTokens: true,
	//     // messages: false  ← Exclude (messages handled by event stream)
	//     // todos: false     ← Exclude if not needed
	//   },
	//   onSessionUpdated: (session) => {
	//     // session: Partial<Session> with only selected fields
	//     // Backend automatically optimizes transmission:
	//     // - title (string) → delta strategy (57% savings)
	//     // - status (object) → patch strategy (99% savings)
	//     // - id, totalTokens (primitives) → value strategy
	//   }
	// });

	useLensSessionSubscription({
		onSessionUpdated: (session) => {
			// Session updated via model-level event
			// Trigger optimistic reconciliation if status changed
			if (session?.id && session?.status) {
				const { optimisticManagerV2, runOptimisticEffects } = require("@sylphx/code-client");
				const result = optimisticManagerV2.reconcile(session.id, {
					type: "session-status-updated",
					sessionId: session.id,
					status: session.status,
				});
				runOptimisticEffects(result.effects);
			}
		},
	});

	// Content streaming subscription (incremental events)
	// IMPORTANT: replayLast > 0 required for compact auto-trigger
	// Handles: text-delta, tool-call, tool-result, reasoning-delta, etc.
	useEventStream({
		replayLast: 50,
		callbacks: eventStreamCallbacks,
	});

	// Create handleSubmit function
	const handleSubmit = useMemo(
		() => {
			return createHandleSubmit({
				isStreaming: () => {
					return state.streamingState.isStreamingRef.current;
				},
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
			});
		},
		[
			state.streamingState.isStreamingRef,
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

	// Reset selected command index when filtered commands change
	useEffect(() => {
		state.setSelectedCommandIndex(0);
	}, [filteredCommands.length, state.setSelectedCommandIndex]);

	// Reset selected file index when filtered files change
	useEffect(() => {
		state.setSelectedFileIndex(0);
	}, [filteredFileInfo.files.length, state.setSelectedFileIndex]);

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
