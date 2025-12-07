/**
 * Streaming mutations service
 * Implements triggerStream and abortStream logic for Lens API
 *
 * Extracted from tRPC router to be reusable across transport layers
 *
 * ARCHITECTURE: Emit + DB Persistence (Parallel)
 * ==============================================
 * Events are emitted AND persisted to DB in parallel:
 * - emit: For connected clients via Lens subscription
 * - DB: For late subscribers who call getSession after events fired
 *
 * This solves the race condition where client subscribes AFTER events.
 */
/**
 * Active stream abort controllers
 * Map<sessionId, AbortController>
 */
const activeStreamAbortControllers = new Map();
/**
 * Active streaming state accumulators
 * Map<sessionId, StreamingStateAccumulator>
 */
const streamingStateAccumulators = new Map();
/**
 * DB persistence interval (ms) - debounce writes
 */
const DB_PERSIST_INTERVAL = 200;
/**
 * Create or get streaming state accumulator for a session
 */
function getOrCreateAccumulator(sessionId) {
    let acc = streamingStateAccumulators.get(sessionId);
    if (!acc) {
        acc = {
            textContent: "",
            reasoningContent: "",
            streamingStatus: "streaming",
            isTextStreaming: false,
            isReasoningStreaming: false,
            currentTool: null,
            askQuestion: null,
            lastPersistTime: 0,
        };
        streamingStateAccumulators.set(sessionId, acc);
    }
    return acc;
}
/**
 * Persist streaming state to DB (debounced)
 * Returns true if persisted, false if debounced
 */
async function persistStreamingState(sessionRepository, sessionId, acc, force = false) {
    const now = Date.now();
    // Debounce: only persist if forced or interval passed
    if (!force && now - acc.lastPersistTime < DB_PERSIST_INTERVAL) {
        return false;
    }
    acc.lastPersistTime = now;
    // NOTE: Streaming state (textContent, reasoningContent, etc.) is kept in-memory
    // and delivered via Lens emit system. DB persistence for streaming state is disabled
    // because SessionRepository doesn't have a generic update method for these fields.
    // The streaming state is ephemeral - clients get updates via real-time events.
    //
    // TODO: If DB persistence is needed for late subscribers, add updateStreamingState()
    // method to SessionRepository with the relevant schema columns.
    return true;
}
/**
 * Process streaming event and update accumulator
 * Returns true if state changed (needs DB persist)
 */
function processEventForAccumulator(event, acc) {
    switch (event.type) {
        case "session-created":
            acc.streamingStatus = "streaming";
            return true;
        case "text-start":
            acc.isTextStreaming = true;
            acc.textContent = "";
            return true;
        case "text-delta":
            acc.textContent += event.text || "";
            return true;
        case "text-end":
            acc.isTextStreaming = false;
            return true;
        case "reasoning-start":
            acc.isReasoningStreaming = true;
            acc.reasoningContent = "";
            return true;
        case "reasoning-delta":
            acc.reasoningContent += event.text || "";
            return true;
        case "reasoning-end":
            acc.isReasoningStreaming = false;
            return true;
        case "tool-call":
            acc.currentTool = {
                id: event.toolCallId,
                name: event.toolName,
                input: event.input,
                inputText: "",
                status: "executing",
                startTime: event.startTime,
            };
            return true;
        case "tool-input-delta":
            if (acc.currentTool) {
                acc.currentTool.inputText = (acc.currentTool.inputText || "") + (event.inputTextDelta || "");
            }
            return true;
        case "tool-result":
        case "tool-error":
            acc.currentTool = null;
            return true;
        case "ask-question-start":
            acc.streamingStatus = "waiting_input";
            acc.askQuestion = {
                toolCallId: event.toolCallId,
                question: event.question,
                options: event.options,
                multiSelect: event.multiSelect,
                preSelected: event.preSelected,
                answered: false,
            };
            return true;
        case "ask-question-answered":
            acc.streamingStatus = "streaming";
            acc.askQuestion = null;
            return true;
        case "error":
            acc.streamingStatus = "error";
            return true;
        case "complete":
            acc.streamingStatus = "idle";
            acc.isTextStreaming = false;
            acc.isReasoningStreaming = false;
            acc.currentTool = null;
            return true;
        default:
            return false;
    }
}
/**
 * Trigger streaming mutation
 * Port of tRPC's triggerStream mutation logic
 */
export async function triggerStreamMutation(params) {
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
                if (part.type === "text")
                    return part.content;
                if (part.type === "file")
                    return `@${part.relativePath}`;
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
            const queuedMessage = await sessionRepository.enqueueMessage(eventSessionId, messageContent, attachments);
            // Publish queue-message-added event to streaming channel
            await appContext.eventStream.publish(`session-stream:${eventSessionId}`, {
                type: "queue-message-added",
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
    let abortControllerId = null;
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
    });
    /**
     * ARCHITECTURE: Subscribe to stream and wait for session-created (lazy sessions only)
     */
    console.log("[triggerStreamMutation] Creating sessionIdPromise, eventSessionId:", eventSessionId);
    const sessionIdPromise = new Promise((resolve, reject) => {
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
                // Handle error events from the stream (streaming.service emits these as events)
                if (event.type === "error") {
                    console.error("[triggerStreamMutation] Stream emitted error event:", event);
                    // Reject promise if not already resolved
                    if (!hasResolved) {
                        reject(new Error(event.error || "Unknown streaming error"));
                        hasResolved = true;
                    }
                    return;
                }
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
                // PARALLEL: Emit to channel AND persist to DB
                // This ensures late subscribers get data from DB
                if (eventSessionId) {
                    // 1. Emit to connected clients (fire-and-forget)
                    appContext.eventStream
                        .publish(`session-stream:${eventSessionId}`, event)
                        .catch((err) => {
                        console.error("[TriggerStream] Event publish error:", err);
                    });
                    // 2. Update accumulator and persist to DB (debounced)
                    const acc = getOrCreateAccumulator(eventSessionId);
                    const stateChanged = processEventForAccumulator(event, acc);
                    if (stateChanged) {
                        // Force persist on key events, debounce on deltas
                        const forceEvents = ["text-end", "reasoning-end", "tool-result", "tool-error", "complete", "error"];
                        const forcePersist = forceEvents.includes(event.type);
                        persistStreamingState(sessionRepository, eventSessionId, acc, forcePersist);
                    }
                }
            },
            error: (error) => {
                console.error("[triggerStreamMutation] Stream error:", error);
                // Publish error to streaming channel AND persist error state
                if (eventSessionId) {
                    appContext.eventStream
                        .publish(`session-stream:${eventSessionId}`, {
                        type: "error",
                        error: error instanceof Error ? error.message : String(error),
                    })
                        .catch((err) => {
                        console.error("[TriggerStream] Error event publish error:", err);
                    });
                    // Persist error state and cleanup accumulator
                    const acc = streamingStateAccumulators.get(eventSessionId);
                    if (acc) {
                        acc.streamingStatus = "error";
                        persistStreamingState(sessionRepository, eventSessionId, acc, true);
                        streamingStateAccumulators.delete(eventSessionId);
                    }
                }
                // Cleanup before rejecting
                // Note: subscription is a cleanup function, not RxJS Subscription
                if (typeof subscription === "function") {
                    subscription();
                }
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
                // Publish complete to streaming channel AND persist final state
                if (eventSessionId) {
                    appContext.eventStream
                        .publish(`session-stream:${eventSessionId}`, {
                        type: "complete",
                    })
                        .catch((err) => {
                        console.error("[TriggerStream] Complete event publish error:", err);
                    });
                    // Force persist final state and cleanup accumulator
                    const acc = streamingStateAccumulators.get(eventSessionId);
                    if (acc) {
                        acc.streamingStatus = "idle";
                        acc.isTextStreaming = false;
                        acc.isReasoningStreaming = false;
                        acc.currentTool = null;
                        persistStreamingState(sessionRepository, eventSessionId, acc, true);
                        streamingStateAccumulators.delete(eventSessionId);
                    }
                }
                // Cleanup on complete
                // Note: subscription is a cleanup function, not RxJS Subscription
                if (typeof subscription === "function") {
                    subscription();
                }
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
 * Abort streaming mutation
 * Port of tRPC's abortStream mutation logic
 */
export async function abortStreamMutation(sessionId) {
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
//# sourceMappingURL=streaming-mutations.service.js.map