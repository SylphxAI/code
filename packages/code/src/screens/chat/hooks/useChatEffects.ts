/**
 * Consolidated Chat Effects Hook
 * All useEffect logic and side effects for Chat component
 *
 * ARCHITECTURE: lens-react v5 API
 * ===============================
 * - await client.xxx({ input }) → Vanilla JS Promise (commands, callbacks)
 * - client.xxx.useQuery({ input }) → React hook (components)
 * - client.xxx.useMutation() → React hook (when you need loading/error state)
 *
 * This file only handles:
 * - Command/autocomplete setup
 * - Message submission
 * - User input handling
 */

import { useAIConfigActions } from "../../../hooks/client/useAIConfig.js";
import { useLensClient, type ProjectFile } from "@sylphx/code-client";
import { setCurrentSessionId, setSelectedAgentId, setEnabledRuleIds, setSessionStatus } from "../../../session-state.js";
import { clearUserInputHandler, setUserInputHandler, type FileInfo, type MessagePart, type FileAttachment, type TokenUsage } from "@sylphx/code-core";
import { useEventStream } from "../../../hooks/client/useEventStream.js";
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
		// Convert content to string for addSystemMessage
		const contentStr = typeof params.content === "string"
			? params.content
			: params.content.map(part => {
					if (typeof part === "string") return part;
					if (part.type === "text" && "content" in part) return part.content;
					return JSON.stringify(part);
				}).join("\n");

		try {
			// Use vanilla client call to persist the message
			const result = await client.addSystemMessage({
				input: {
					sessionId: params.sessionId,
					role: params.role,
					content: contentStr,
					provider: params.provider,
					model: params.model,
				}
			});

			// Extract sessionId from response
			const data = (result as any)?.data || result;
			const sessionId = data?.sessionId;

			if (sessionId && sessionId !== params.sessionId) {
				// New session was created, update UI
				setCurrentSessionId(sessionId);

				// Fetch the session data to sync agent and rules state
				try {
					const sessionResult = await client.getSession({ input: { id: sessionId } });
					const session = (sessionResult as any)?.data || sessionResult;
					if (session) {
						// Sync agent ID (server sets default "coder")
						if (session.agentId) {
							setSelectedAgentId(session.agentId);
						}
						// Sync enabled rules
						if (session.enabledRuleIds) {
							setEnabledRuleIds(session.enabledRuleIds);
						}
					}
				} catch (fetchErr) {
					console.error("[addMessage] Failed to fetch session for state sync:", fetchErr);
				}
			}

			console.log(`[addMessage] ${params.role}: ${contentStr.substring(0, 100)}`);
			return sessionId || "";
		} catch (err) {
			console.error("[addMessage] Failed to add message:", err);
			return params.sessionId || "";
		}
	}, [client]);

	const updateSessionTitle = useCallback((sessionId: string, title: string) => {
		// Update session title via vanilla client call
		client.updateSession({
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
	// Commands use vanilla client calls: await client.xxx({ input })
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

	// SESSION STATUS ARCHITECTURE
	// ===========================
	// Session data comes from lens-react query (client.getSession.useQuery)
	// Session status (streaming state) comes from event stream:
	//   - Server publishes session-updated events with status
	//   - Client receives via subscribeToSession (below)
	//   - Status is stored in session-state via setSessionStatus
	//   - useCurrentSession merges status into session object

	// EVENT STREAM SUBSCRIPTION
	// =========================
	// Subscribe to session events for streaming (text, tools, etc.)
	// Session status is updated here and stored in session-state
	useEventStream({
		replayLast: 10,
		callbacks: {
			// Handle session-updated events to get live status
			onSessionUpdated: (_sessionId, session) => {
				// Update session status from event stream
				if (session?.status) {
					setSessionStatus(session.status);
				}
			},
		},
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
