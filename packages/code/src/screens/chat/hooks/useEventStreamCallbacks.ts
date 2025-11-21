/**
 * Event Stream Callbacks Hook
 *
 * Creates and memoizes event stream callbacks for multi-client sync and session events.
 * Extracted from Chat.tsx to improve modularity and testability.
 */

import { getCurrentSessionId } from "@sylphx/code-client";
import type { AIConfig } from "@sylphx/code-core";
import type React from "react";
import { useMemo } from "react";
import { type EventHandlerContext, handleStreamEvent } from "../streaming/streamEventHandlers.js";

export interface EventStreamCallbacksDeps {
	updateSessionTitle: (sessionId: string, title: string) => void;
	setIsStreaming: (value: boolean) => void;
	setIsTitleStreaming: (value: boolean) => void;
	setStreamingTitle: React.Dispatch<React.SetStateAction<string>>;
	streamingMessageIdRef: React.MutableRefObject<string | null>;
	addLog: (message: string) => void;
	aiConfig: AIConfig | null;
	notificationSettings: { notifyOnCompletion: boolean; notifyOnError: boolean };
	setPendingInput: (input: any) => void;
	askToolContextRef: React.MutableRefObject<{
		sessionId: string;
		toolCallId: string;
	} | null>;
	currentStepIndexRef: React.MutableRefObject<number | null>;
	skipContentForStepRef: React.MutableRefObject<boolean>;
	setStreamingStartTime: (time: number | null) => void;
	setStreamingOutputTokens: (tokens: number | ((prev: number) => number)) => void;
}

/**
 * Creates event stream callbacks for multi-client sync
 *
 * @param deps - Dependencies for event handlers
 * @returns Object containing all event stream callbacks
 *
 * @example
 * ```tsx
 * const callbacks = useEventStreamCallbacks({
 *   updateSessionTitle,
 *   setIsStreaming,
 *   setIsTitleStreaming,
 *   setStreamingTitle,
 *   streamingMessageIdRef,
 *   addLog,
 *   aiConfig,
 *   notificationSettings,
 * });
 *
 * useEventStream({
 *   replayLast: 50,
 *   callbacks,
 * });
 * ```
 */
export function useEventStreamCallbacks(deps: EventStreamCallbacksDeps) {
	const {
		updateSessionTitle,
		setIsStreaming,
		setIsTitleStreaming,
		setStreamingTitle,
		streamingMessageIdRef,
		addLog,
		aiConfig,
		notificationSettings,
		setPendingInput,
		askToolContextRef,
		currentStepIndexRef,
		skipContentForStepRef,
		setStreamingStartTime,
		setStreamingOutputTokens,
	} = deps;

	// Event context parameters (memoized separately for better performance)
	// Note: currentSessionId is set to null - handlers call getCurrentSessionId() directly
	const eventContextParams = useMemo<EventHandlerContext>(
		() => ({
			currentSessionId: null, // Handlers call getCurrentSessionId() directly
			updateSessionTitle,
			setIsStreaming,
			setIsTitleStreaming,
			setStreamingTitle,
			streamingMessageIdRef,
			addLog,
			aiConfig,
			userMessage: "", // Not used in event stream callbacks
			notificationSettings,
			setPendingInput,
			askToolContextRef,
			currentStepIndexRef,
			skipContentForStepRef,
			setStreamingStartTime,
			setStreamingOutputTokens,
		}),
		[
			updateSessionTitle,
			setIsStreaming,
			setIsTitleStreaming,
			setStreamingTitle,
			streamingMessageIdRef,
			addLog,
			aiConfig,
			notificationSettings,
			setPendingInput,
			askToolContextRef,
			currentStepIndexRef,
			skipContentForStepRef,
			setStreamingStartTime,
			setStreamingOutputTokens,
		],
	);

	// Multi-client message sync: Subscribe to session:{id} for messages from other clients
	// Filters out own streaming messages by checking streamingMessageIdRef
	// DISABLED: TUI is single-client, no need for multi-client sync callbacks
	// ENABLED: Title streaming callbacks (independent from AI response stream)
	const callbacks = useMemo(
		() => ({
			// ENABLED: Session lifecycle events (for lazy session creation)
			onSessionCreated: (sessionId: string, provider: string, model: string) => {
				handleStreamEvent(
					{ type: "session-created", sessionId, provider, model },
					eventContextParams,
				);
			},

			// ENABLED: Title streaming (independent channel, no loop issues)
			onSessionTitleStart: (sessionId: string) => {
				const currentSessionId = getCurrentSessionId();
				if (sessionId === currentSessionId) {
					setIsTitleStreaming(true);
					setStreamingTitle("");
				}
			},
			onSessionTitleDelta: (sessionId: string, text: string) => {
				const currentSessionId = getCurrentSessionId();
				if (sessionId === currentSessionId) {
					setStreamingTitle((prev) => prev + text);
				}
			},
			onSessionTitleComplete: (sessionId: string, _title: string) => {
				const currentSessionId = getCurrentSessionId();
				if (sessionId === currentSessionId) {
					setIsTitleStreaming(false);
					setStreamingTitle("");
				}
			},

			// ENABLED: Token updates (server calculates tokens, client displays)
			onSessionTokensUpdated: (
				sessionId: string,
				totalTokens: number,
				baseContextTokens: number,
				outputTokens?: number,
			) => {
				handleStreamEvent(
					{ type: "session-tokens-updated", sessionId, totalTokens, baseContextTokens, outputTokens },
					eventContextParams,
				);
			},

			// Ask tool events
			onAskQuestionStart: (
				sessionId: string,
				toolCallId: string,
				question: string,
				options: any[],
				multiSelect?: boolean,
				preSelected?: string[],
			) => {
				handleStreamEvent(
					{
						type: "ask-question-start",
						sessionId,
						toolCallId,
						question,
						options,
						multiSelect,
						preSelected,
					},
					eventContextParams,
				);
			},
			onAskQuestionAnswered: (sessionId: string, toolCallId: string, answer: string) => {
				handleStreamEvent(
					{ type: "ask-question-answered", sessionId, toolCallId, answer },
					eventContextParams,
				);
			},

			// Message streaming callbacks - unified event stream path
			// All events go through handleStreamEvent (no dual-path complexity)
			onUserMessageCreated: (messageId: string, content: string) => {
				handleStreamEvent({ type: "user-message-created", messageId, content }, eventContextParams);
			},
			onAssistantMessageCreated: (messageId: string) => {
				handleStreamEvent({ type: "assistant-message-created", messageId }, eventContextParams);
			},
			onSystemMessageCreated: (messageId: string, content: string) => {
				handleStreamEvent(
					{ type: "system-message-created", messageId, content },
					eventContextParams,
				);
			},

			// Step events
			onStepStart: (
				stepId: string,
				stepIndex: number,
				metadata: any,
				todoSnapshot: any[],
				systemMessages?: any[],
				provider?: string,
				model?: string,
			) => {
				handleStreamEvent(
					{
						type: "step-start",
						stepId,
						stepIndex,
						metadata,
						todoSnapshot,
						systemMessages,
						provider,
						model,
					},
					eventContextParams,
				);
			},
			onStepComplete: (stepId: string, usage: any, duration: number, finishReason: string) => {
				handleStreamEvent(
					{ type: "step-complete", stepId, usage, duration, finishReason },
					eventContextParams,
				);
			},

			// Text streaming
			onTextStart: () => {
				handleStreamEvent({ type: "text-start" }, eventContextParams);
			},
			onTextDelta: (text: string) => {
				handleStreamEvent({ type: "text-delta", text }, eventContextParams);
			},
			onTextEnd: () => {
				handleStreamEvent({ type: "text-end" }, eventContextParams);
			},

			// Reasoning streaming
			onReasoningStart: () => {
				handleStreamEvent({ type: "reasoning-start" }, eventContextParams);
			},
			onReasoningDelta: (text: string) => {
				handleStreamEvent({ type: "reasoning-delta", text }, eventContextParams);
			},
			onReasoningEnd: (duration: number) => {
				handleStreamEvent({ type: "reasoning-end", duration }, eventContextParams);
			},

			// Tool streaming
			onToolCall: (toolCallId: string, toolName: string, input: unknown, startTime: number) => {
				handleStreamEvent({ type: "tool-call", toolCallId, toolName, input, startTime }, eventContextParams);
			},
			onToolResult: (toolCallId: string, toolName: string, result: unknown, duration: number) => {
				handleStreamEvent(
					{ type: "tool-result", toolCallId, toolName, result, duration },
					eventContextParams,
				);
			},
			onToolError: (toolCallId: string, toolName: string, error: string, duration: number) => {
				handleStreamEvent(
					{ type: "tool-error", toolCallId, toolName, error, duration },
					eventContextParams,
				);
			},

			// Completion
			onComplete: (usage?: any, finishReason?: string) => {
				handleStreamEvent({ type: "complete", usage, finishReason }, eventContextParams);
			},

			// Error handling
			onError: (error: string) => {
				handleStreamEvent({ type: "error", error }, eventContextParams);
			},

			// Abort handling
			onAbort: () => {
				handleStreamEvent({ type: "abort" }, eventContextParams);
			},

			// Message status updates (UNIFIED STATUS CHANGE EVENT)
			onMessageStatusUpdated: (
				messageId: string,
				status: "active" | "completed" | "error" | "abort",
				usage?: any,
				finishReason?: string,
			) => {
				handleStreamEvent(
					{
						type: "message-status-updated",
						messageId,
						status,
						usage,
						finishReason,
					},
					eventContextParams,
				);
			},

			// Queue events
			onQueueMessageAdded: (sessionId: string, message: any) => {
				handleStreamEvent(
					{
						type: "queue-message-added",
						sessionId,
						message,
					},
					eventContextParams,
				);
			},
			onQueueMessageUpdated: (sessionId: string, message: any) => {
				handleStreamEvent(
					{
						type: "queue-message-updated",
						sessionId,
						message,
					},
					eventContextParams,
				);
			},
			onQueueMessageRemoved: (sessionId: string, messageId: string) => {
				handleStreamEvent(
					{
						type: "queue-message-removed",
						sessionId,
						messageId,
					},
					eventContextParams,
				);
			},
			onQueueCleared: (sessionId: string) => {
				handleStreamEvent(
					{
						type: "queue-cleared",
						sessionId,
					},
					eventContextParams,
				);
			},
		}),
		[eventContextParams, setIsTitleStreaming, setStreamingTitle],
	);

	return callbacks;
}
