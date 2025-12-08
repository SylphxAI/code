/**
 * Event Stream Hook
 * Strongly-typed session event subscription
 *
 * Architecture: Mutation + Subscription
 * - Client calls triggerStream mutation to start streaming
 * - Client subscribes to session events via subscribeToSession
 * - Server publishes events to session-stream:{id} channel
 * - Client receives strongly-typed SessionEvent wrapped in StoredEvent
 *
 * Uses lens-react v4 vanilla pattern with { input: { ...args } } format.
 */

import { useEffect, useRef } from "react";
import { getClient } from "@sylphx/code-client";
import { useCurrentSessionId } from "../../session-state.js";
import { setError } from "../../ui-state.js";

export interface EventStreamCallbacks {
	// Session events
	onSessionCreated?: (sessionId: string, provider: string, model: string) => void;
	onSessionUpdated?: (sessionId: string, session?: any) => void;
	onSessionTitleStart?: (sessionId: string) => void;
	onSessionTitleDelta?: (sessionId: string, text: string) => void;
	onSessionTitleComplete?: (sessionId: string, title: string) => void;
	onSessionTokensUpdated?: (
		sessionId: string,
		totalTokens: number,
		baseContextTokens: number,
		outputTokens?: number,
	) => void;
	onSessionStatusUpdated?: (sessionId: string, status: any) => void;

	// Message events
	onUserMessageCreated?: (messageId: string, content: string) => void;
	onAssistantMessageCreated?: (messageId: string) => void;
	onSystemMessageCreated?: (messageId: string, content: string) => void;
	onMessageStatusUpdated?: (
		messageId: string,
		status: "active" | "completed" | "error" | "abort",
		usage?: any,
		finishReason?: string,
	) => void;

	// Step events
	onStepStart?: (
		stepId: string,
		stepIndex: number,
		metadata: any,
		todoSnapshot: any[],
		systemMessages?: any[],
		provider?: string,
		model?: string,
	) => void;
	onStepComplete?: (stepId: string, usage: any, duration: number, finishReason: string) => void;

	// Text streaming
	onTextStart?: () => void;
	onTextDelta?: (text: string) => void;
	onTextEnd?: () => void;

	// Reasoning streaming
	onReasoningStart?: () => void;
	onReasoningDelta?: (text: string) => void;
	onReasoningEnd?: (duration: number) => void;

	// Tool streaming
	onToolCall?: (toolCallId: string, toolName: string, input: unknown, startTime: number) => void;
	onToolResult?: (toolCallId: string, toolName: string, result: unknown, duration: number) => void;
	onToolError?: (toolCallId: string, toolName: string, error: string, duration: number) => void;

	// File streaming (images, PDFs, etc.)
	onFile?: (mediaType: string, base64: string) => void;

	// Ask tool
	onAskQuestion?: (
		questionId: string,
		questions: Array<{
			question: string;
			header: string;
			multiSelect: boolean;
			options: Array<{
				label: string;
				description: string;
			}>;
		}>,
	) => void;

	// Queue events
	onQueueMessageAdded?: (sessionId: string, message: any) => void;
	onQueueMessageUpdated?: (sessionId: string, message: any) => void;
	onQueueMessageRemoved?: (sessionId: string, messageId: string) => void;
	onQueueCleared?: (sessionId: string) => void;

	// Error events
	onError?: (error: string) => void;
}

export interface UseEventStreamOptions {
	/**
	 * Number of events to replay when subscribing
	 * 0 = no replay, only new events
	 * N = replay last N events + new events
	 */
	replayLast?: number;

	/**
	 * Event callbacks
	 */
	callbacks?: EventStreamCallbacks;
}

/**
 * Hook to subscribe to event stream for current session
 * Automatically handles subscription lifecycle and session switching
 */
export function useEventStream(options: UseEventStreamOptions = {}) {
	const { replayLast = 0, callbacks = {} } = options;
	const currentSessionId = useCurrentSessionId();

	// Ref to track subscription (can be RxJS Subscription or cleanup function)
	const subscriptionRef = useRef<{ unsubscribe: () => void } | (() => void) | null>(null);

	/**
	 * CRITICAL: Store callbacks in ref to avoid stale closures
	 *
	 * Problem: If callbacks are in dependency array, useEffect re-runs on every render
	 * (callbacks object is recreated each render). This causes infinite subscription loops.
	 *
	 * Solution: Store callbacks in ref, update ref on each render, use ref in subscription.
	 * This ensures callbacks always reference current state without triggering re-subscription.
	 */
	const callbacksRef = useRef(callbacks);
	useEffect(() => {
		callbacksRef.current = callbacks;
	}, [callbacks]);

	useEffect(() => {
		// Cleanup previous subscription
		// Handle both RxJS Subscription ({ unsubscribe: fn }) and cleanup function patterns
		if (subscriptionRef.current) {
			if (typeof subscriptionRef.current === "function") {
				(subscriptionRef.current as () => void)();
			} else if (typeof subscriptionRef.current.unsubscribe === "function") {
				subscriptionRef.current.unsubscribe();
			}
			subscriptionRef.current = null;
		}

		// Skip if no session
		if (!currentSessionId) {
			return;
		}

		// Get client and subscribe using lens-react v4 pattern
		// IMPORTANT: Lens vanilla calls use { input: { ...args } } format
		const client = getClient();
		const subscription = (client.subscribeToSession as any)({
			input: { sessionId: currentSessionId, replayLast },
		}).subscribe({
			next: (storedEvent: any) => {
				// Extract event from stored event payload
				const event = storedEvent.payload;

				// Handle all event types
				// Use callbacksRef.current to access latest callbacks (avoid stale closures)
				switch (event.type) {
					case "session-created":
						callbacksRef.current.onSessionCreated?.(event.sessionId, event.provider, event.model);
						break;

					case "session-updated":
						callbacksRef.current.onSessionUpdated?.(event.sessionId, event.session);
						break;

					case "session-title-updated-start":
						callbacksRef.current.onSessionTitleStart?.(event.sessionId);
						break;

					case "session-title-updated-delta":
						callbacksRef.current.onSessionTitleDelta?.(event.sessionId, event.text);
						break;

					case "session-title-updated-end":
						callbacksRef.current.onSessionTitleComplete?.(event.sessionId, event.title);
						break;

					case "session-tokens-updated":
						callbacksRef.current.onSessionTokensUpdated?.(
							event.sessionId,
							event.totalTokens,
							event.baseContextTokens,
							event.outputTokens,
						);
						break;

					case "session-status-updated":
						callbacksRef.current.onSessionStatusUpdated?.(event.sessionId, event.status);
						break;

					case "user-message-created":
						callbacksRef.current.onUserMessageCreated?.(event.messageId, event.content);
						break;

					case "assistant-message-created":
						callbacksRef.current.onAssistantMessageCreated?.(event.messageId);
						break;

					case "system-message-created":
						callbacksRef.current.onSystemMessageCreated?.(event.messageId, event.content);
						break;

					case "message-status-updated":
						callbacksRef.current.onMessageStatusUpdated?.(
							event.messageId,
							event.status,
							event.usage,
							event.finishReason,
						);
						break;

					case "step-start":
						callbacksRef.current.onStepStart?.(
							event.stepId,
							event.stepIndex,
							event.metadata,
							event.todoSnapshot,
							event.systemMessages,
							event.provider,
							event.model,
						);
						break;

					case "step-complete":
						callbacksRef.current.onStepComplete?.(
							event.stepId,
							event.usage,
							event.duration,
							event.finishReason,
						);
						break;

					case "text-start":
						callbacksRef.current.onTextStart?.();
						break;

					case "text-delta":
						callbacksRef.current.onTextDelta?.(event.text);
						break;

					case "text-end":
						callbacksRef.current.onTextEnd?.();
						break;

					case "reasoning-start":
						callbacksRef.current.onReasoningStart?.();
						break;

					case "reasoning-delta":
						callbacksRef.current.onReasoningDelta?.(event.text);
						break;

					case "reasoning-end":
						callbacksRef.current.onReasoningEnd?.(event.duration);
						break;

					case "tool-call":
						callbacksRef.current.onToolCall?.(event.toolCallId, event.toolName, event.input, event.startTime);
						break;

					case "tool-result":
						callbacksRef.current.onToolResult?.(
							event.toolCallId,
							event.toolName,
							event.result,
							event.duration,
						);
						break;

					case "tool-error":
						callbacksRef.current.onToolError?.(
							event.toolCallId,
							event.toolName,
							event.error,
							event.duration,
						);
						break;

					case "file":
						callbacksRef.current.onFile?.(event.mediaType, event.base64);
						break;

					case "ask-question":
						callbacksRef.current.onAskQuestion?.(event.questionId, event.questions);
						break;

					case "queue-message-added":
						callbacksRef.current.onQueueMessageAdded?.(event.sessionId, event.message);
						break;

					case "queue-message-updated":
						callbacksRef.current.onQueueMessageUpdated?.(event.sessionId, event.message);
						break;

					case "queue-message-removed":
						callbacksRef.current.onQueueMessageRemoved?.(event.sessionId, event.messageId);
						break;

					case "queue-cleared":
						callbacksRef.current.onQueueCleared?.(event.sessionId);
						break;

					case "error":
						callbacksRef.current.onError?.(event.error);
						setError(event.error);
						break;
				}
			},
			error: (error: any) => {
				const errorMessage = error instanceof Error ? error.message : "Event stream error";
				callbacksRef.current.onError?.(errorMessage);
				setError(errorMessage);
			},
			complete: () => {
				// Stream completed
			},
		});

		subscriptionRef.current = subscription;

		// Cleanup on unmount or session change
		return () => {
			if (typeof subscription === "function") {
				subscription();
			} else if (subscription?.unsubscribe) {
				subscription.unsubscribe();
			}
			subscriptionRef.current = null;
		};
	}, [currentSessionId, replayLast]);
	// NOTE: callbacks NOT in dependency array to avoid infinite loop
	// callbacks object is recreated on every render, would trigger constant resubscription
	// Only resubscribe when sessionId or replayLast changes
}
