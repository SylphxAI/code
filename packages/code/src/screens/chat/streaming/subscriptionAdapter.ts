/**
 * Streaming Trigger Adapter for Lens
 *
 * ARCHITECTURE: Lens Live Query (v2.4.0+)
 * =======================================
 * - Client calls triggerStream mutation to start streaming
 * - Server uses emit API to push updates to session
 * - Resolver fields with .subscribe() auto-route to streaming transport
 * - Client receives live updates through useQuery without polling
 *
 * Key resolvers with .subscribe():
 * - Session.status → live streaming status (text, duration, tokens)
 * - Message.steps → live step updates during streaming
 * - Step.parts → live part updates during streaming
 *
 * ARCHITECTURE: lens-react v5 API
 * ===============================
 * - await client.xxx({ input }) → Vanilla JS Promise (this file)
 * - client.xxx.useQuery({ input }) → React hook (components)
 */

import { parseUserInput, type CodeClient } from "@sylphx/code-client";
import { setCurrentSessionId } from "../../../session-state.js";
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
 * Uses vanilla client calls: await client.xxx({ input })
 */
export interface SubscriptionAdapterParams {
	// Lens client for vanilla API calls
	client: CodeClient;

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
					// Use vanilla client call
					await client.abortStream({ input: { sessionId: abortSessionId } });
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

			// Call triggerStream via vanilla client call
			// Server will:
			// 1. Create session if needed
			// 2. Create user message
			// 3. Create assistant message (placeholder)
			// 4. Start AI streaming
			// 5. Emit status updates via ctx.emit()
			// 6. Lens auto-streams to client via .subscribe() resolver
			const result = await client.triggerStream({
				input: {
					sessionId: currentSessionId,
					provider: currentSessionId ? undefined : provider,
					model: currentSessionId ? undefined : model,
					content,
				},
			}) as { sessionId?: string; data?: { sessionId?: string } };

			logSession("Mutation completed:", result);

			// Extract sessionId from result
			const sessionId = result.data?.sessionId || result.sessionId;
			mutationSessionId = sessionId || null;

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
			throw error;
		}
	};
}
