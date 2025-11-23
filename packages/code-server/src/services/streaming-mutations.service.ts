/**
 * Streaming mutations service
 * Implements triggerStream and abortStream logic for Lens API
 *
 * Extracted from tRPC router to be reusable across transport layers
 */

import type { AppContext } from "@sylphx/code-core";
import type { Observable } from "rxjs";
import type { SessionRepository, MessageRepository, AIConfig } from "@sylphx/code-core";

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
}

/**
 * Trigger streaming mutation
 * Port of tRPC's triggerStream mutation logic
 */
export async function triggerStreamMutation(
	params: TriggerStreamParams,
): Promise<TriggerStreamResult> {
	console.log("[triggerStreamMutation] ===== MUTATION CALLED =====");
	console.log("[triggerStreamMutation] Input:", {
		sessionId: params.input.sessionId,
		provider: params.input.provider,
		model: params.input.model,
		contentLength: params.input.content.length,
	});

	const { appContext, sessionRepository, messageRepository, aiConfig, input } = params;
	const { streamAIResponse } = await import("./streaming.service.js");

	// Get or create sessionId for event channel
	let eventSessionId = input.sessionId || null;
	console.log("[triggerStreamMutation] Event session ID:", eventSessionId);

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
							path: "", // Not needed for queued messages
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
			await appContext.eventStream.publish(`session:${eventSessionId}`, {
				type: "queue-message-added" as const,
				sessionId: eventSessionId,
				message: queuedMessage,
			});

			// Return success with sessionId (no new stream started)
			return {
				success: true,
				sessionId: eventSessionId,
				queued: true,
			};
		}
	}

	// Create AbortController for this stream
	const abortController = new AbortController();
	let abortControllerId: string | null = null;

	console.log("[triggerStreamMutation] Starting streaming...");
	// Start streaming
	const streamObservable = streamAIResponse({
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
	}) as Observable<any>;

	/**
	 * ARCHITECTURE: Subscribe to stream and wait for session-created (lazy sessions only)
	 */
	console.log("[triggerStreamMutation] Creating sessionIdPromise, eventSessionId:", eventSessionId);
	const sessionIdPromise = new Promise<string>((resolve, reject) => {
		let hasResolved = false;

		// If session already exists, resolve immediately (but continue subscription for streaming)
		if (eventSessionId) {
			console.log("[triggerStreamMutation] Session exists, resolving immediately:", eventSessionId);
			resolve(eventSessionId);
			hasResolved = true;
		}

		console.log("[triggerStreamMutation] Subscribing to streamObservable...");
		// Subscribe to stream to capture session-created event (lazy sessions)
		const subscription = streamObservable.subscribe({
			next: (event) => {
				console.log("[triggerStreamMutation] Stream event received:", event.type);
				// Capture sessionId from session-created event (lazy sessions only)
				if (event.type === "session-created" && !hasResolved) {
					eventSessionId = event.sessionId;
					resolve(eventSessionId);
					hasResolved = true;
				}

				// Register AbortController once sessionId is known
				if (eventSessionId && !abortControllerId) {
					abortControllerId = eventSessionId;
					activeStreamAbortControllers.set(eventSessionId, abortController);
				}

				// Publish all events to event stream for client subscriptions
				if (eventSessionId) {
					appContext.eventStream
						.publish(`session:${eventSessionId}`, event)
						.catch((err) => {
							console.error("[TriggerStream] Event publish error:", err);
						});
				}
			},
			error: (error) => {
				console.error("[triggerStreamMutation] Stream error:", error);
				// Publish error to event stream
				if (eventSessionId) {
					appContext.eventStream
						.publish(`session:${eventSessionId}`, {
							type: "error" as const,
							error: error instanceof Error ? error.message : String(error),
						})
						.catch((err) => {
							console.error("[TriggerStream] Error event publish error:", err);
						});
				}
				// Cleanup before rejecting
				subscription.unsubscribe();
				if (abortControllerId) {
					activeStreamAbortControllers.delete(abortControllerId);
				}
				// Only reject if promise not already resolved
				if (!hasResolved) {
					reject(error);
				}
			},
			complete: () => {
				console.log("[triggerStreamMutation] Stream completed");
				// Publish complete to event stream
				if (eventSessionId) {
					appContext.eventStream
						.publish(`session:${eventSessionId}`, {
							type: "complete" as const,
						})
						.catch((err) => {
							console.error("[TriggerStream] Complete event publish error:", err);
						});
				}
				// Cleanup on complete
				subscription.unsubscribe();
				if (abortControllerId) {
					activeStreamAbortControllers.delete(abortControllerId);
				}
			},
		});
	});

	// Wait for sessionId (either immediate or from session-created event)
	const finalSessionId = await sessionIdPromise;

	console.log("[triggerStreamMutation] Returning success with sessionId:", finalSessionId);
	// Return sessionId so client can subscribe
	return {
		success: true,
		sessionId: finalSessionId,
	};
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
 * Port of tRPC's abortStream mutation logic
 */
export async function abortStreamMutation(sessionId: string): Promise<AbortStreamResult> {
	// Find and abort the active stream
	const abortController = activeStreamAbortControllers.get(sessionId);

	if (!abortController) {
		// No active stream for this session (might have already completed)
		return {
			success: false,
			message: "No active stream found for this session",
		};
	}

	// Abort the stream
	abortController.abort();

	// Cleanup will happen in triggerStream's error/complete handlers
	// No need to delete here - let the subscription cleanup do it

	return {
		success: true,
		message: "Stream aborted successfully",
	};
}
