/**
 * Streaming Trigger Adapter for Lens
 *
 * LIVE QUERY ARCHITECTURE:
 * - Client calls triggerStream mutation to start streaming
 * - Server uses emit API to push updates to session
 * - Client uses useQuery(getSession) to receive live updates
 *
 * inProcess Polling:
 * - For inProcess transport, emit doesn't work
 * - We set streamingExpected = true before mutation
 * - useCurrentSession polls while streamingExpected is true
 * - Polling stops when streamingStatus becomes "idle"
 */

import type { LensClient } from "@sylphx/lens-client";
import { parseUserInput } from "@sylphx/code-client";
import { setCurrentSessionId } from "../../../session-state.js";
import { setStreamingExpected } from "../../../ui-state.js";
import type { AIConfig, FileAttachment, MessagePart, TokenUsage } from "@sylphx/code-core";
import { createLogger } from "@sylphx/code-core";
import type React from "react";

const logSession = createLogger("subscription:session");

/**
 * Options for triggering AI streaming
 */
export type TriggerAIOptions = {};

/**
 * Parameters for subscription adapter
 */
export interface SubscriptionAdapterParams {
	client: LensClient<any, any>;
	aiConfig: AIConfig | null;
	currentSessionId: string | null;
	selectedProvider: string | null;
	selectedModel: string | null;

	addMessage: (params: {
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
	}) => Promise<string>;
	addLog: (message: string) => void;
	updateSessionTitle: (sessionId: string, title: string) => void;
	notificationSettings: { notifyOnCompletion: boolean; notifyOnError: boolean };

	abortControllerRef: React.MutableRefObject<AbortController | null>;
	streamingMessageIdRef: React.MutableRefObject<string | null>;
}

/**
 * Creates sendUserMessageToAI function
 *
 * SIMPLIFIED FLOW (Lens Live Query):
 * 1. Call triggerStream mutation
 * 2. Server creates session/message, starts streaming
 * 3. Server emits updates via emit API
 * 4. useQuery(getSession) auto-updates → React re-renders
 * 5. NO client-side event handling!
 *
 * Streaming state (isStreaming, streamingStatus) comes from server via emit.
 */
export function createSubscriptionSendUserMessageToAI(params: SubscriptionAdapterParams) {
	const {
		client,
		currentSessionId,
		selectedProvider,
		selectedModel,
		addMessage,
		addLog,
		abortControllerRef,
	} = params;

	return async (
		userMessage: string,
		attachments?: FileAttachment[],
		_options?: TriggerAIOptions,
	) => {
		logSession("Send user message called");

		const provider = selectedProvider;
		const model = selectedModel;

		// Validate provider/model
		if (!provider || !model) {
			logSession("No provider or model configured!");
			addLog("[subscriptionAdapter] No AI provider configured. Use /provider to configure.");

			if (currentSessionId) {
				await addMessage({
					sessionId: currentSessionId,
					role: "assistant",
					content: [{
						type: "error",
						error: "No AI provider configured. Please configure a provider using the /provider command.",
						status: "completed",
					} as MessagePart],
					provider,
					model,
				});
			}
			return;
		}

		// Create abort controller
		abortControllerRef.current = new AbortController();
		let mutationSessionId: string | null = null;

		// Register abort handler
		abortControllerRef.current.signal.addEventListener("abort", async () => {
			try {
				logSession("Stream aborted by user");
				const abortSessionId = mutationSessionId || currentSessionId;

				if (abortSessionId) {
					await client.abortStream.fetch({ input: { sessionId: abortSessionId } });
					logSession("Server notified of abort");
				}
			} catch (error) {
				console.error("[subscriptionAdapter] Abort error:", error);
			}
			// Note: Server emit will update streamingStatus to "idle"
			// useQuery will receive the update automatically
		});

		try {
			// Parse user input
			const { parts: content } = parseUserInput(userMessage, attachments || []);
			logSession("Parsed content:", content.length, "parts");

			// Enable polling for inProcess transport
			// useCurrentSession will poll while this is true
			setStreamingExpected(true);

			// Call triggerStream mutation
			// Server will:
			// 1. Create session if needed
			// 2. Create user message
			// 3. Create assistant message (placeholder)
			// 4. Start AI streaming
			// 5. Update in-memory state (polled by client)
			// 6. useCurrentSession polls and React re-renders
			const result = await client.triggerStream.fetch({
				input: {
					sessionId: currentSessionId,
					provider: currentSessionId ? undefined : provider,
					model: currentSessionId ? undefined : model,
					content,
				},
			}) as { data?: { sessionId?: string }; sessionId?: string };

			logSession("Mutation completed:", result);

			// Extract sessionId from result.data (Lens mutation response wrapper)
			const sessionId = result.data?.sessionId || result.sessionId;
			mutationSessionId = sessionId;

			// Update sessionId if new session was created
			if (sessionId && sessionId !== currentSessionId) {
				logSession("New session created:", sessionId);
				setCurrentSessionId(sessionId);
			}

			// Note: Streaming state comes from server via emit
			// useQuery(getSession) will receive:
			//   session.streamingStatus === "streaming" → isStreaming = true
			//   session.streamingStatus === "idle" → isStreaming = false
			// No client-side setIsStreaming needed!

		} catch (error) {
			logSession("Mutation error:", error);
			addLog(`[subscriptionAdapter] Error: ${error instanceof Error ? error.message : String(error)}`);
			// Clear streaming expected on error (stop polling)
			setStreamingExpected(false);
			throw error;
		}
	};
}
