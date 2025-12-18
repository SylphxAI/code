/**
 * Streaming mutations service
 * Implements triggerStream and abortStream logic for Lens API
 *
 * Architecture: Direct eventStream publishing (V2)
 * - No Observable subscription
 * - Events published directly to eventStream by stream-orchestrator-v2
 * - Simple async/await API
 */

import type { SessionRepository, MessageRepository, AIConfig } from "@sylphx/code-core";
import type { AppContext } from "../context.js";

/**
 * Active stream abort controllers
 * Map<sessionId, AbortController>
 */
const activeStreamAbortControllers = new Map<string, AbortController>();

/**
 * Trigger stream mutation parameters
 */
export interface TriggerStreamParams {
	appContext: AppContext;
	sessionRepository: SessionRepository;
	messageRepository: MessageRepository;
	aiConfig: AIConfig;
	input: {
		sessionId: string | null | undefined;
		agentId?: string;
		provider?: string;
		model?: string;
		content: Array<
			| { type: "text"; content: string }
			| {
					type: "file";
					fileId: string;
					relativePath: string;
					size: number;
					mimeType: string;
			  }
		>;
	};
}

/**
 * Trigger stream mutation result
 */
export interface TriggerStreamResult {
	success: boolean;
	sessionId: string;
	queued?: boolean;
	error?: string;
}

/**
 * Trigger streaming mutation
 * Uses V2 architecture with direct eventStream publishing
 */
export async function triggerStreamMutation(
	params: TriggerStreamParams,
): Promise<TriggerStreamResult> {
	console.log("[triggerStreamMutation] called", {
		sessionId: params.input?.sessionId,
		hasContent: !!params.input?.content,
		contentLength: params.input?.content?.length,
	});

	const { appContext, sessionRepository, messageRepository, aiConfig, input } = params;

	// Get or create sessionId for event channel
	let eventSessionId = input.sessionId || null;

	// QUEUE LOGIC: Check if session is currently streaming
	// If streaming, enqueue message instead of starting new stream
	if (eventSessionId) {
		const isStreaming = activeStreamAbortControllers.has(eventSessionId);

		if (isStreaming && input.content.length > 0) {
			// Convert parsed content to string
			const messageContent = input.content
				.map((part) => {
					if (part.type === "text") return part.content;
					if (part.type === "file") return `@${part.relativePath}`;
					return "";
				})
				.join("");

			// Extract file attachments
			const attachments = input.content
				.filter((part) => part.type === "file")
				.map((part) => {
					if (part.type === "file") {
						return {
							path: "",
							relativePath: part.relativePath,
							size: part.size,
							mimeType: part.mimeType,
						};
					}
					return null;
				})
				.filter((a) => a !== null);

			// Enqueue message
			const queuedMessage = await sessionRepository.enqueueMessage(
				eventSessionId,
				messageContent,
				attachments,
			);

			// Publish queue-message-added event
			await appContext.eventStream.publish(`session-stream:${eventSessionId}`, {
				type: "queue-message-added" as const,
				sessionId: eventSessionId,
				message: queuedMessage,
			});

			return {
				success: true,
				sessionId: eventSessionId,
				queued: true,
			};
		}
	}

	// Create AbortController for this stream
	const abortController = new AbortController();

	// Import V2 orchestrator (direct eventStream publishing)
	const { streamAIResponseV2 } = await import("./streaming/stream-orchestrator-v2.js");

	// Start streaming (fire and forget - events go directly to eventStream)
	// We don't await because we want to return the sessionId immediately
	// and let the stream run in the background
	const streamPromise = streamAIResponseV2({
		appContext,
		sessionRepository,
		messageRepository,
		aiConfig,
		sessionId: eventSessionId,
		agentId: input.agentId,
		provider: input.provider,
		model: input.model,
		userMessageContent: input.content.length > 0 ? input.content : null,
		abortSignal: abortController.signal,
	});

	// For existing sessions, we can return immediately
	if (eventSessionId) {
		// Register AbortController
		activeStreamAbortControllers.set(eventSessionId, abortController);

		// Handle stream completion/error in background
		streamPromise
			.then((result) => {
				activeStreamAbortControllers.delete(eventSessionId!);
				if (!result.success) {
					console.error("[triggerStreamMutation] Stream failed:", result.error);
				}
			})
			.catch((error) => {
				activeStreamAbortControllers.delete(eventSessionId!);
				console.error("[triggerStreamMutation] Stream error:", error);
			});

		return {
			success: true,
			sessionId: eventSessionId,
		};
	}

	// For new sessions, listen for session-created event to get sessionId early
	// This allows client to subscribe to streaming events immediately
	return new Promise<TriggerStreamResult>((resolve) => {
		let resolved = false;

		// Subscribe to a temporary channel for session creation
		// The orchestrator will emit session-created with the new sessionId
		const tempSubscription = appContext.eventStream
			.subscribe("session-created")
			.subscribe((event) => {
				if (resolved) return;

				const payload = event.payload as { sessionId: string };
				if (payload.sessionId) {
					resolved = true;
					tempSubscription.unsubscribe();

					// Register AbortController
					activeStreamAbortControllers.set(payload.sessionId, abortController);

					// Handle stream completion/error in background
					streamPromise
						.then((result) => {
							activeStreamAbortControllers.delete(payload.sessionId);
							if (!result.success) {
								console.error("[triggerStreamMutation] Stream failed:", result.error);
							}
						})
						.catch((error) => {
							activeStreamAbortControllers.delete(payload.sessionId);
							console.error("[triggerStreamMutation] Stream error:", error);
						});

					resolve({
						success: true,
						sessionId: payload.sessionId,
					});
				}
			});

		// Fallback: if stream completes/errors before we get session-created
		streamPromise
			.then((result) => {
				if (resolved) return;
				resolved = true;
				tempSubscription.unsubscribe();

				if (result.sessionId) {
					activeStreamAbortControllers.set(result.sessionId, abortController);
					// Immediately delete since stream is done
					activeStreamAbortControllers.delete(result.sessionId);
				}

				resolve({
					success: result.success,
					sessionId: result.sessionId,
					error: result.error,
				});
			})
			.catch((error) => {
				if (resolved) return;
				resolved = true;
				tempSubscription.unsubscribe();

				console.error("[triggerStreamMutation] Stream error:", error);
				resolve({
					success: false,
					sessionId: "",
					error: error instanceof Error ? error.message : String(error),
				});
			});
	});
}

/**
 * Abort stream mutation result
 */
export interface AbortStreamResult {
	success: boolean;
	message: string;
}

/**
 * Abort streaming mutation
 */
export async function abortStreamMutation(sessionId: string): Promise<AbortStreamResult> {
	const abortController = activeStreamAbortControllers.get(sessionId);

	if (!abortController) {
		return {
			success: false,
			message: "No active stream found for this session",
		};
	}

	abortController.abort();

	return {
		success: true,
		message: "Stream aborted successfully",
	};
}
