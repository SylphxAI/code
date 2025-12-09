/**
 * Chat Hook
 * Handle AI chat with streaming support via Lens
 *
 * DEPRECATED: This hook is no longer the primary way to send messages.
 * Use createSubscriptionSendUserMessageToAI from subscriptionAdapter.ts instead.
 *
 * The new architecture uses Lens Live Query (v2.4.0+):
 * - triggerStream.fetch() to start streaming (mutation)
 * - useCurrentSession with .subscribe() resolver for live status updates
 * - Server emits updates via ctx.emit(), Lens auto-streams to client
 *
 * This hook is kept for backward compatibility but sendMessage is a no-op.
 */

import type { FileAttachment, TokenUsage } from "@sylphx/code-core";
import { useCallback } from "react";
import { useCurrentSessionId } from "./useCurrentSession.js";

/**
 * Options for sending a message
 * @deprecated Use createSubscriptionSendUserMessageToAI from subscriptionAdapter.ts
 */
export interface SendMessageOptions {
	// Data
	attachments?: FileAttachment[];

	// Lifecycle callbacks
	onComplete?: () => void;
	onAbort?: () => void;
	onError?: (error: string) => void;
	onFinish?: (usage?: TokenUsage, finishReason?: string) => void;

	// Tool streaming callbacks
	onToolCall?: (toolCallId: string, toolName: string, input: unknown) => void;
	onToolResult?: (
		toolCallId: string,
		toolName: string,
		result: unknown,
		duration: number,
	) => void;
	onToolError?: (
		toolCallId: string,
		toolName: string,
		error: string,
		duration: number,
	) => void;

	// Reasoning streaming callbacks
	onReasoningStart?: () => void;
	onReasoningDelta?: (text: string) => void;
	onReasoningEnd?: (duration: number) => void;

	// Text streaming callbacks
	onTextStart?: () => void;
	onTextDelta?: (text: string) => void;
	onTextEnd?: () => void;

	// Session events
	onSessionCreated?: (
		sessionId: string,
		provider: string,
		model: string,
	) => void;
	onSessionTitleStart?: () => void;
	onSessionTitleDelta?: (text: string) => void;
	onSessionTitleComplete?: (title: string) => void;

	// Message events
	onAssistantMessageCreated?: (messageId: string) => void;

	// Ask tool events (client-server architecture)
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
}

/**
 * @deprecated Use createSubscriptionSendUserMessageToAI from subscriptionAdapter.ts
 *
 * This hook is kept for backward compatibility.
 * The sendMessage function is now a no-op - use the subscription adapter instead.
 */
export function useChat() {
	const currentSessionId = useCurrentSessionId();

	// No-op sendMessage - the real implementation is in subscriptionAdapter.ts
	// This prevents lens-react subscription patterns that cause React instance conflicts
	const sendMessage = useCallback(
		async (_message: string, _options: SendMessageOptions = {}) => {
			console.warn(
				"[useChat] sendMessage is deprecated. Use createSubscriptionSendUserMessageToAI from subscriptionAdapter.ts instead.",
			);
			// No-op - actual message sending is done via subscriptionAdapter.ts
		},
		[],
	);

	return { sendMessage };
}
