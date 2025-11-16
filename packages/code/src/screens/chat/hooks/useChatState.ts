/**
 * Consolidated Chat State Hook
 * Single source of truth for all Chat component state
 */

import {
	useAIConfig,
	useAskToolHandler,
	useChat,
	useCurrentSession,
	useFileAttachments,
	useProjectFiles,
	useTokenCalculation,
	useSelectedProvider,
	useSelectedModel,
	addDebugLog,
} from "@sylphx/code-client";
import { useCallback, useMemo, useState } from "react";
import type { ChatProps } from "../types.js";
import { useInputState } from "./useInputState.js";
import { useStreamingState } from "./useStreamingState.js";
import { useSelectionState } from "./useSelectionState.js";
import { useCommandState } from "./useCommandState.js";
import { createGetHintText } from "../autocomplete/hintText.js";
import { commands } from "../../../commands/registry.js";
import type { FileAttachment } from "@sylphx/code-core";

export function useChatState(_props: ChatProps) {
	// Zen signals
	const aiConfig = useAIConfig();
	const selectedProvider = useSelectedProvider();
	const selectedModel = useSelectedModel();

	// Session data
	const sessionData = useCurrentSession();
	const currentSession = sessionData?.currentSession;
	const currentSessionId = sessionData?.currentSessionId;
	const sessionLoading = sessionData?.isLoading;

	// Helper function (memoized to prevent infinite re-renders)
	const addLog = useCallback((message: string) => {
		addDebugLog(message);
	}, []);

	// Client actions
	const { sendMessage } = useChat();
	const usedTokens = useTokenCalculation(currentSession || null);

	// State hooks (already extracted)
	const inputState = useInputState();
	const streamingState = useStreamingState();
	const selectionState = useSelectionState();
	const commandState = useCommandState();

	// Local state
	const [selectedFileIndex, setSelectedFileIndex] = useState(0);
	const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
	const [showEscHint, setShowEscHint] = useState(false);

	// Helper function to get AI config
	const getAIConfig = useCallback(() => aiConfig, [aiConfig]);

	// File attachments
	const {
		pendingAttachments,
		setPendingAttachments,
		attachmentTokens,
		validTags,
		addAttachment,
		clearAttachments,
		setAttachmentTokenCount,
	} = useFileAttachments(inputState.input);

	// History restoration state
	const [tempAttachments, setTempAttachments] = useState<FileAttachment[]>([]);

	// Project files
	const { projectFiles, filesLoading } = useProjectFiles();

	// Ask tool handler setup
	useAskToolHandler({
		setPendingInput: selectionState.setPendingInput,
		setMultiSelectionPage: selectionState.setMultiSelectionPage,
		setMultiSelectionAnswers: selectionState.setMultiSelectionAnswers,
		setSelectionFilter: selectionState.setSelectionFilter,
		setSelectedCommandIndex,
		setAskQueueLength: selectionState.setAskQueueLength,
		inputResolver: selectionState.inputResolver,
		addDebugLog,
	});

	// Hint text getter
	const getHintText = useMemo(() => createGetHintText(commands), []);

	// Computed hint text
	const hintText = useMemo(
		() => getHintText(inputState.input),
		[inputState.input, getHintText],
	);

	return {
		// Config & signals
		aiConfig,
		selectedProvider,
		selectedModel,
		getAIConfig,
		addLog,

		// Session
		currentSession,
		currentSessionId,
		sessionLoading,

		// Client actions
		sendMessage,
		usedTokens,

		// State (from hooks)
		inputState,
		streamingState,
		selectionState,
		commandState,

		// Local state
		selectedFileIndex,
		setSelectedFileIndex,
		selectedCommandIndex,
		setSelectedCommandIndex,
		showEscHint,
		setShowEscHint,

		// File attachments
		pendingAttachments,
		setPendingAttachments,
		attachmentTokens,
		validTags,
		addAttachment,
		clearAttachments,
		setAttachmentTokenCount,
		tempAttachments,
		setTempAttachments,

		// Project files
		projectFiles,
		filesLoading,

		// Autocomplete
		hintText,
	};
}

export type ChatState = ReturnType<typeof useChatState>;
