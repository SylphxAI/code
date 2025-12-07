/**
 * Consolidated Chat Effects Hook
 * All useEffect logic and side effects for Chat component
 *
 * ARCHITECTURE: Live Query Pattern
 * =================================
 * Session streaming is handled via Lens Live Query:
 * - useCurrentSession uses useQuery(client.getSession({ id }))
 * - Server uses emit API to push updates
 * - NO event callbacks needed - data updates automatically
 *
 * This file only handles:
 * - Command/autocomplete setup
 * - Message submission
 * - User input handling
 */

import { useAIConfigActions } from "../../../hooks/client/useAIConfig.js";
import { useLensClient, type ProjectFile } from "@sylphx/code-client";
import { setCurrentSessionId } from "../../../session-state.js";
import { clearUserInputHandler, setUserInputHandler, type FileInfo, type MessagePart, type FileAttachment, type TokenUsage } from "@sylphx/code-core";
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

export function useChatEffects(state: ChatState) {
	const { saveConfig: saveConfigAction } = useAIConfigActions();
	const client = useLensClient();

	// Wrapper for saveConfig to match expected signature (Promise<void> instead of Promise<boolean>)
	const saveConfig = useCallback(async (config: any) => {
		await saveConfigAction(config);
	}, [saveConfigAction]);

	// Local helper functions for message/session operations
	// This creates a message and returns the session ID
	// If no session exists, creates one first
	const addMessage = useCallback(async (params: {
		sessionId: string | null;
		role: "user" | "assistant";
		content: string | MessagePart[];
		attachments?: FileAttachment[];
		usage?: TokenUsage;
		finishReason?: string;
		metadata?: any;
		todoSnapshot?: any[];
		status?: "active" | "completed" | "error" | "abort";
		provider?: string;
		model?: string;
	}): Promise<string> => {
		let sessionId = params.sessionId;

		// Create session if needed
		if (!sessionId) {
			try {
				const result = await client.createSession.fetch({
					input: {
						title: "New Chat",
						provider: params.provider,
						model: params.model,
					}
				});
				// Handle both { data: { id } } and { id } response shapes
				const session = (result as any)?.data || result;
				sessionId = session?.id;
				if (sessionId) {
					setCurrentSessionId(sessionId);
				}
			} catch (err) {
				console.error("[addMessage] Failed to create session:", err);
				return "";
			}
		}

		if (!sessionId) {
			console.error("[addMessage] No session ID available");
			return "";
		}

		// Convert content to array format expected by sendMessage
		const contentArray = typeof params.content === "string"
			? [{ type: "text" as const, content: params.content }]
			: params.content.map(part => {
					if (typeof part === "string") {
						return { type: "text" as const, content: part };
					}
					// Assume it's already in the right format
					return part as { type: string; content?: string; [key: string]: unknown };
				});

		// For assistant messages (like error messages), we use sendMessage
		// which creates both user and assistant message placeholders
		// But for error messages, we only want to show the error, not trigger AI
		// So we'll use a simpler approach: just return the session ID
		// The actual error display will be handled elsewhere
		// TODO: Add a simpler "addSystemMessage" mutation for non-AI messages

		// For now, just log and return the session ID
		// The UI should show errors in a different way (not as persisted messages)
		console.log(`[addMessage] ${params.role}: ${typeof params.content === 'string' ? params.content.substring(0, 100) : 'complex content'}`);

		return sessionId;
	}, [client]);

	const updateSessionTitle = useCallback((sessionId: string, title: string) => {
		// Update session title via client mutation
		client.updateSession.fetch({
			input: { id: sessionId, title }
		}).catch(err => {
			console.error("Failed to update session title:", err);
		});
	}, [client]);

	// Create sendUserMessageToAI function
	// NOTE: Streaming state comes from server via emit API, not client-side setters
	const sendUserMessageToAI = useCallback(
		createSubscriptionSendUserMessageToAI({
			client,
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
			// NOTE: No setters passed - streaming state is server-driven via emit API
		}),
		[
			client,
			state.aiConfig,
			state.currentSessionId,
			state.selectedProvider,
			state.selectedModel,
			addMessage,
			state.addLog,
			updateSessionTitle,
			state.streamingState.abortControllerRef,
			state.streamingState.streamingMessageIdRef,
		],
	);

	// Autocomplete (depends on sendUserMessageToAI for command context)
	// Convert ProjectFile[] to FileInfo[] for autocomplete
	const projectFilesAsFileInfo: FileInfo[] = useMemo(() => {
		return state.projectFiles.map((pf): FileInfo => ({
			path: pf.path,
			relativePath: pf.path, // Use path as relativePath
			size: (pf as any).size || 0,
		}));
	}, [state.projectFiles]);

	const filteredFileInfo = useFileAutocomplete(
		state.inputState.input,
		state.inputState.normalizedCursor,
		projectFilesAsFileInfo,
	);

	// Command context factory (depends on sendUserMessageToAI)
	const createCommandContextForArgs = useCallback(
		(args: string[]) =>
			createCommandContext(args, {
				client,
				addMessage,
				currentSessionId: state.currentSessionId,
				saveConfig,
				sendUserMessageToAI: sendUserMessageToAI as any,
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
			client,
			addMessage,
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

	// LIVE QUERY ARCHITECTURE
	// =======================
	// Session streaming is handled by useCurrentSession which uses:
	//   useQuery(client.getSession({ id }))
	//
	// Server emits updates via emit API (emit.delta, emit.set, emit.merge).
	// Client receives updates automatically - NO callbacks needed!
	//
	// Streaming state (isStreaming, isTitleStreaming, etc.) is derived in:
	//   - useCurrentSession() for isStreaming
	//   - useStreamingState() for all streaming state from session
	//
	// No need for useEffect to sync streaming state - it's already reactive via useQuery!

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
				projectFiles: state.projectFiles as any,
				setHistoryIndex: state.inputState.setHistoryIndex,
				setTempInput: state.inputState.setTempInput,
				setInput: state.inputState.setInput,
				setPendingInput: state.selectionState.setPendingInput,
				setPendingCommand: state.commandState.setPendingCommand as any,
				setMessageHistory: state.inputState.setMessageHistory as any,
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
			addMessage,
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
		state.commandState.setCachedOptions as any,
		state.commandState.setCurrentlyLoading as any,
		state.commandState.setLoadError as any,
		createCommandContextForArgs,
		commands,
		state.addLog,
	);

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
