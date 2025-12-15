/**
 * Consolidated Chat State Hook
 * Single source of truth for all Chat component state
 */

import { useAskToolHandler } from "../../../hooks/client/useAskToolHandler.js";
import { useCurrentSession } from "../../../hooks/client/useCurrentSession.js";
import { useFileAttachments } from "../../../hooks/client/useFileAttachments.js";
import { useMessages } from "../../../hooks/client/useMessages.js";
import { useProjectFiles } from "../../../hooks/client/useProjectFiles.js";
import { useTokenCalculation } from "../../../hooks/client/useTokenCalculation.js";
import { useSelectedModel, useSelectedProvider } from "../../../session-state.js";
import {
	addDebugLog,
	useHideMessageTitles,
	useHideMessageUsage,
	setHideMessageTitles as setHideMessageTitlesSignal,
	setHideMessageUsage as setHideMessageUsageSignal,
} from "../../../ui-state.js";
import { useAIConfigState } from "../../../ai-config-state.js";
import type { FileAttachment } from "@sylphx/code-core";
import { loadSettings } from "@sylphx/code-core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { commands } from "../../../commands/registry.js";
import { createGetHintText } from "../autocomplete/hintText.js";
import type { ChatProps } from "../types.js";
import { useCommandState } from "./useCommandState.js";
import { useInputState } from "./useInputState.js";
import { useSelectionState } from "./useSelectionState.js";
import { useStreamingState } from "./useStreamingState.js";

export function useChatState(_props: ChatProps) {
	// Zen signals
	const aiConfig = useAIConfigState();
	const selectedProvider = useSelectedProvider();
	const selectedModel = useSelectedModel();

	// Session data (single source of truth - only call useCurrentSession once)
	const sessionData = useCurrentSession();
	const currentSession = sessionData?.currentSession;
	const currentSessionId = sessionData?.currentSessionId;
	const sessionLoading = sessionData?.isLoading;
	const isStreaming = sessionData?.isStreaming ?? false;
	const suggestions = sessionData?.suggestions ?? [];

	// Messages data (separate from session)
	const { messages } = useMessages(currentSessionId);

	// Helper function (memoized to prevent infinite re-renders)
	const addLog = useCallback((message: string) => {
		addDebugLog(message);
	}, []);

	// Token calculation
	const usedTokens = useTokenCalculation(currentSession);

	// State hooks (already extracted)
	// Pass session data to useStreamingState to avoid duplicate useCurrentSession calls
	const inputState = useInputState();
	const streamingState = useStreamingState({ currentSession, isStreaming });
	const selectionState = useSelectionState();
	const commandState = useCommandState();

	// Local state
	const [selectedFileIndex, setSelectedFileIndex] = useState(0);
	const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
	const [showEscHint, setShowEscHint] = useState(false);

	// Display settings from signals
	const hideMessageTitles = useHideMessageTitles();
	const hideMessageUsage = useHideMessageUsage();

	// Load display settings on mount
	useEffect(() => {
		loadSettings().then((result) => {
			if (result.success) {
				if (result.data.hideMessageTitles !== undefined) {
					setHideMessageTitlesSignal(result.data.hideMessageTitles);
				}
				if (result.data.hideMessageUsage !== undefined) {
					setHideMessageUsageSignal(result.data.hideMessageUsage);
				}
			}
		});
	}, []);

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

	// Project files (lens-react hook - auto-fetches and caches)
	const { projectFiles, loading: filesLoading } = useProjectFiles();

	// Ask tool handler setup
	useAskToolHandler({
		currentSessionId,
		setPendingInput: selectionState.setPendingInput,
		setMultiSelectionPage: selectionState.setMultiSelectionPage,
		setMultiSelectionAnswers: selectionState.setMultiSelectionAnswers,
		setSelectionFilter: selectionState.setSelectionFilter,
		setSelectedCommandIndex,
		inputResolver: selectionState.inputResolver,
		addDebugLog,
	});

	// Hint text getter
	const getHintText = useMemo(() => createGetHintText(commands), []);

	// Computed hint text
	const hintText = useMemo(() => getHintText(inputState.input), [inputState.input, getHintText]);

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

		// Messages
		messages,

		// Token usage
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

		// AI suggestions (from inline actions)
		suggestions,

		// Display settings
		hideMessageTitles,
		hideMessageUsage,
	};
}

export type ChatState = ReturnType<typeof useChatState>;
