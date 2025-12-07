/**
 * AI Orchestrator
 * Handles AI streaming coordination and stream processing
 */
import { streamText } from "ai";
import { updateTokensFromDelta } from "../token-tracking.service.js";
import { emitError, emitFile, emitToolError, emitToolInputDelta, emitToolInputEnd, emitToolInputStart, emitToolResult, } from "./event-emitter.js";
/**
 * Process AI stream and emit events
 * Returns final usage and finish reason
 *
 * LENS ARCHITECTURE: Now writes parts to database incrementally during streaming
 * - Each text-delta updates the part in database immediately
 * - Each tool-call inserts a new part in database
 * - Lens watches database and streams delta updates to subscribers
 * - Events still emitted for backward compatibility (will be removed in Phase 5)
 */
export async function processAIStream(fullStream, observer, state, tokenContext, callbacks, persistence) {
    let finalUsage;
    let finalFinishReason;
    let hasError = false;
    try {
        for await (const chunk of fullStream) {
            switch (chunk.type) {
                case "text-start": {
                    const partIndex = state.currentStepParts.length;
                    state.currentStepParts.push({
                        type: "text",
                        content: "",
                        status: "active",
                    });
                    state.currentTextPartIndex = partIndex;
                    state.hasEmittedAnyEvent = true;
                    // NOTE: Only use callback - emitTextStart() is called in callback
                    callbacks.onTextStart?.();
                    break;
                }
                case "text-delta": {
                    if (state.currentTextPartIndex !== null) {
                        const part = state.currentStepParts[state.currentTextPartIndex];
                        if (part && part.type === "text") {
                            part.content += chunk.text;
                            // LENS: Write to database immediately (incremental streaming)
                            if (persistence) {
                                const stepId = persistence.getStepId();
                                if (stepId) {
                                    await persistence.messageRepository.upsertPart(stepId, state.currentTextPartIndex, part);
                                    await persistence.publishPartUpdate(stepId, state.currentTextPartIndex, part);
                                }
                            }
                        }
                        state.hasEmittedAnyEvent = true;
                        // NOTE: Only use callback - emitTextDelta() is called in callback
                        callbacks.onTextDelta?.(chunk.text);
                        // Update tokens in real-time (incremental)
                        if (tokenContext) {
                            await updateTokensFromDelta(tokenContext.tracker, chunk.text, tokenContext.sessionId, tokenContext.baseContextTokens, tokenContext.appContext);
                        }
                    }
                    break;
                }
                case "text-end": {
                    if (state.currentTextPartIndex !== null) {
                        const part = state.currentStepParts[state.currentTextPartIndex];
                        if (part && part.type === "text") {
                            part.status = "completed";
                            // LENS: Write status update to database
                            if (persistence) {
                                const stepId = persistence.getStepId();
                                if (stepId) {
                                    await persistence.messageRepository.upsertPart(stepId, state.currentTextPartIndex, part);
                                    await persistence.publishPartUpdate(stepId, state.currentTextPartIndex, part, true); // Force publish on completion
                                }
                            }
                        }
                        state.currentTextPartIndex = null;
                    }
                    state.hasEmittedAnyEvent = true;
                    // NOTE: Only use callback - emitTextEnd() is called in callback
                    callbacks.onTextEnd?.();
                    break;
                }
                case "reasoning-start": {
                    const partIndex = state.currentStepParts.length;
                    const startTime = Date.now();
                    state.currentStepParts.push({
                        type: "reasoning",
                        content: "",
                        status: "active",
                        duration: 0,
                        startTime,
                    });
                    state.currentReasoningPartIndex = partIndex;
                    state.hasEmittedAnyEvent = true;
                    // NOTE: Only use callback - emitReasoningStart() is called in callback
                    callbacks.onReasoningStart?.();
                    break;
                }
                case "reasoning-delta": {
                    if (state.currentReasoningPartIndex !== null) {
                        const part = state.currentStepParts[state.currentReasoningPartIndex];
                        if (part && part.type === "reasoning") {
                            part.content += chunk.text;
                            // LENS: Write to database immediately (incremental streaming)
                            if (persistence) {
                                const stepId = persistence.getStepId();
                                if (stepId) {
                                    await persistence.messageRepository.upsertPart(stepId, state.currentReasoningPartIndex, part);
                                    await persistence.publishPartUpdate(stepId, state.currentReasoningPartIndex, part);
                                }
                            }
                        }
                        state.hasEmittedAnyEvent = true;
                        // NOTE: Only use callback - emitReasoningDelta() is called in callback
                        callbacks.onReasoningDelta?.(chunk.text);
                        // Update tokens in real-time (incremental)
                        if (tokenContext) {
                            await updateTokensFromDelta(tokenContext.tracker, chunk.text, tokenContext.sessionId, tokenContext.baseContextTokens, tokenContext.appContext);
                        }
                    }
                    break;
                }
                case "reasoning-end": {
                    if (state.currentReasoningPartIndex !== null) {
                        const part = state.currentStepParts[state.currentReasoningPartIndex];
                        if (part && part.type === "reasoning") {
                            part.status = "completed";
                            const duration = part.startTime ? Date.now() - part.startTime : 0;
                            part.duration = duration;
                            delete part.startTime;
                            // LENS: Write status update to database
                            if (persistence) {
                                const stepId = persistence.getStepId();
                                if (stepId) {
                                    await persistence.messageRepository.upsertPart(stepId, state.currentReasoningPartIndex, part);
                                    await persistence.publishPartUpdate(stepId, state.currentReasoningPartIndex, part, true); // Force publish on completion
                                }
                            }
                            // NOTE: Only use callback - emitReasoningEnd() is called in callback
                            callbacks.onReasoningEnd?.(duration);
                        }
                        state.currentReasoningPartIndex = null;
                    }
                    state.hasEmittedAnyEvent = true;
                    break;
                }
                case "tool-call": {
                    const existingToolPart = state.currentStepParts.find((p) => p.type === "tool" && p.toolId === chunk.toolCallId);
                    let toolPartIndex = -1;
                    if (existingToolPart && existingToolPart.type === "tool") {
                        existingToolPart.name = chunk.toolName;
                        toolPartIndex = state.currentStepParts.indexOf(existingToolPart);
                    }
                    else {
                        const toolStartTime = Date.now();
                        const newToolPart = {
                            type: "tool",
                            toolId: chunk.toolCallId,
                            name: chunk.toolName,
                            status: "active",
                            input: "input" in chunk ? chunk.input : undefined,
                            startTime: toolStartTime,
                        };
                        state.currentStepParts.push(newToolPart);
                        toolPartIndex = state.currentStepParts.length - 1;
                        state.activeTools.set(chunk.toolCallId, {
                            name: chunk.toolName,
                            startTime: toolStartTime,
                            input: "input" in chunk ? chunk.input : undefined,
                        });
                        // LENS: Write new tool part to database
                        if (persistence) {
                            const stepId = persistence.getStepId();
                            if (stepId) {
                                await persistence.messageRepository.upsertPart(stepId, toolPartIndex, newToolPart);
                                await persistence.publishPartUpdate(stepId, toolPartIndex, newToolPart, true); // Force publish when tool created
                            }
                        }
                    }
                    state.hasEmittedAnyEvent = true;
                    // Get startTime from either existing tool part or the newly created one
                    const tool = state.currentStepParts.find((p) => p.type === "tool" && p.toolId === chunk.toolCallId);
                    const startTimeToEmit = tool && tool.type === "tool" && tool.startTime
                        ? tool.startTime
                        : Date.now();
                    // NOTE: Only use callback - emitToolCall() is called in callback
                    callbacks.onToolCall?.(chunk.toolCallId, chunk.toolName, "input" in chunk ? chunk.input : undefined, startTimeToEmit);
                    break;
                }
                case "tool-input-start": {
                    const toolStartTime = Date.now();
                    state.currentStepParts.push({
                        type: "tool",
                        toolId: chunk.id,
                        name: chunk.toolName,
                        status: "active",
                        input: "",
                        startTime: toolStartTime,
                    });
                    state.activeTools.set(chunk.id, {
                        name: chunk.toolName,
                        startTime: toolStartTime,
                        input: "",
                    });
                    emitToolInputStart(observer, chunk.id, toolStartTime);
                    break;
                }
                case "tool-input-delta": {
                    const tool = state.activeTools.get(chunk.id);
                    if (tool) {
                        const currentInput = typeof tool.input === "string" ? tool.input : "";
                        tool.input = currentInput + chunk.delta;
                    }
                    const toolPart = state.currentStepParts.find((p) => p.type === "tool" && p.toolId === chunk.id && p.status === "active");
                    if (toolPart && toolPart.type === "tool") {
                        const currentInput = typeof toolPart.input === "string" ? toolPart.input : "";
                        toolPart.input = currentInput + chunk.delta;
                    }
                    emitToolInputDelta(observer, chunk.id, chunk.delta);
                    break;
                }
                case "tool-input-end": {
                    const tool = state.activeTools.get(chunk.id);
                    if (tool) {
                        try {
                            const inputText = typeof tool.input === "string" ? tool.input : "";
                            tool.input = inputText ? JSON.parse(inputText) : {};
                        }
                        catch (_e) {
                            console.error("[AIOrchestrator] Failed to parse tool input:", tool.input);
                            tool.input = {};
                        }
                    }
                    const toolPart = state.currentStepParts.find((p) => p.type === "tool" && p.toolId === chunk.id && p.status === "active");
                    if (toolPart && toolPart.type === "tool") {
                        try {
                            const inputText = typeof toolPart.input === "string" ? toolPart.input : "";
                            toolPart.input = inputText ? JSON.parse(inputText) : {};
                        }
                        catch (_e) {
                            toolPart.input = {};
                        }
                    }
                    emitToolInputEnd(observer, chunk.id);
                    break;
                }
                case "tool-result": {
                    const tool = state.activeTools.get(chunk.toolCallId);
                    if (tool) {
                        const duration = Date.now() - tool.startTime;
                        state.activeTools.delete(chunk.toolCallId);
                        const toolPart = state.currentStepParts.find((p) => p.type === "tool" && p.name === chunk.toolName && p.status === "active");
                        if (toolPart && toolPart.type === "tool") {
                            toolPart.status = "completed";
                            toolPart.duration = duration;
                            toolPart.result = "output" in chunk ? chunk.output : undefined;
                            // LENS: Write tool result to database
                            if (persistence) {
                                const stepId = persistence.getStepId();
                                if (stepId) {
                                    const toolPartIndex = state.currentStepParts.indexOf(toolPart);
                                    await persistence.messageRepository.upsertPart(stepId, toolPartIndex, toolPart);
                                    await persistence.publishPartUpdate(stepId, toolPartIndex, toolPart, true); // Force publish on tool completion
                                }
                            }
                        }
                        state.hasEmittedAnyEvent = true;
                        emitToolResult(observer, chunk.toolCallId, chunk.toolName, "output" in chunk ? chunk.output : undefined, duration);
                        callbacks.onToolResult?.(chunk.toolCallId, chunk.toolName, "output" in chunk ? chunk.output : undefined, duration);
                    }
                    break;
                }
                case "tool-error": {
                    const tool = state.activeTools.get(chunk.toolCallId);
                    if (tool) {
                        const duration = Date.now() - tool.startTime;
                        state.activeTools.delete(chunk.toolCallId);
                        const toolPart = state.currentStepParts.find((p) => p.type === "tool" && p.name === chunk.toolName && p.status === "active");
                        if (toolPart && toolPart.type === "tool") {
                            toolPart.status = "error";
                            toolPart.duration = duration;
                            toolPart.error = String(chunk.error);
                        }
                        state.hasEmittedAnyEvent = true;
                        emitToolError(observer, chunk.toolCallId, chunk.toolName, String(chunk.error), duration);
                        callbacks.onToolError?.(chunk.toolCallId, chunk.toolName, String(chunk.error), duration);
                    }
                    break;
                }
                case "file": {
                    state.currentStepParts.push({
                        type: "file",
                        relativePath: "",
                        size: chunk.file.uint8Array.length,
                        mediaType: chunk.file.mediaType,
                        base64: chunk.file.base64,
                        status: "completed",
                    });
                    emitFile(observer, chunk.file.mediaType, chunk.file.base64);
                    callbacks.onFile?.(chunk.file.mediaType, chunk.file.base64);
                    break;
                }
                case "abort": {
                    state.currentStepParts.forEach((part) => {
                        if (part.status === "active") {
                            part.status = "abort";
                        }
                    });
                    state.aborted = true;
                    callbacks.onAbort?.();
                    break;
                }
                case "error": {
                    const errorStr = String(chunk.error);
                    // Check if this is an intentional abort (ESC key pressed)
                    if (state.aborted) {
                        // Already aborted, ignore error stream events
                        callbacks.onAbort?.();
                    }
                    else {
                        // Real error - add to parts and emit
                        state.currentStepParts.push({
                            type: "error",
                            error: errorStr,
                            status: "completed",
                        });
                        hasError = true;
                        emitError(observer, errorStr);
                        callbacks.onError?.(errorStr);
                    }
                    break;
                }
                case "finish": {
                    const sdkUsage = chunk.totalUsage;
                    if (sdkUsage) {
                        finalUsage = {
                            promptTokens: sdkUsage.inputTokens ?? 0,
                            completionTokens: sdkUsage.outputTokens ?? 0,
                            totalTokens: sdkUsage.totalTokens ?? 0,
                        };
                    }
                    finalFinishReason = chunk.finishReason;
                    callbacks.onFinish?.(finalUsage, finalFinishReason);
                    break;
                }
                case "start":
                case "start-step":
                case "finish-step":
                    // Handled by hooks
                    break;
                default:
                    break;
            }
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Only treat as abort if state.aborted is already true (ESC pressed)
        // Don't silently ignore AI SDK errors like NoOutputGeneratedError
        if (state.aborted) {
            // Already aborted, this error is expected
        }
        else {
            console.error("[AIOrchestrator] Stream processing error:", error);
            state.currentStepParts.push({
                type: "error",
                error: errorMessage,
                status: "completed",
            });
            hasError = true;
            emitError(observer, errorMessage);
            callbacks.onError?.(errorMessage);
        }
    }
    return { finalUsage, finalFinishReason, hasError };
}
/**
 * Create initial stream state
 */
export function createStreamState() {
    return {
        currentStepParts: [],
        activeTools: new Map(),
        currentTextPartIndex: null,
        currentReasoningPartIndex: null,
        hasEmittedAnyEvent: false,
        aborted: false,
    };
}
/**
 * Orchestrate AI stream with AI SDK - SINGLE STEP
 *
 * Manual looping architecture:
 * - maxSteps: 1 (only ONE step per call)
 * - Caller loops manually based on finishReason
 * - prepareStep/onStepFinish still work for each step
 */
export async function orchestrateAIStream(options) {
    // MANUAL LOOPING: Use maxSteps=1 so we control stepping
    // Caller will loop based on finishReason and queue state
    const { fullStream, response } = streamText({
        model: options.model,
        messages: options.messages,
        system: options.systemPrompt,
        tools: options.tools,
        ...(options.abortSignal ? { abortSignal: options.abortSignal } : {}),
        onStepFinish: options.onStepFinish,
        prepareStep: options.prepareStep,
    });
    return { fullStream, response };
}
//# sourceMappingURL=ai-orchestrator.js.map