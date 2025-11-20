/**
 * AI Orchestrator
 * Handles AI streaming coordination and stream processing
 */

import type { MessagePart, StreamCallbacks } from "@sylphx/code-core";
import type { Observer } from "@trpc/server/observable";
import { type CoreMessage, type LanguageModel, stepCountIs, streamText, type TextStreamPart } from "ai";
import type { AppContext } from "../../context.js";
import { updateTokensFromDelta } from "../token-tracking.service.js";
import {
	emitError,
	emitFile,
	emitToolCall,
	emitToolError,
	emitToolInputDelta,
	emitToolInputEnd,
	emitToolInputStart,
	emitToolResult,
} from "./event-emitter.js";
import type { StreamEvent } from "./types.js";

/**
 * Tool tracking information
 */
interface ActiveTool {
	name: string;
	startTime: number;
	input: unknown;
}

/**
 * Stream processing state
 */
export interface StreamState {
	currentStepParts: MessagePart[];
	activeTools: Map<string, ActiveTool>;
	currentTextPartIndex: number | null;
	currentReasoningPartIndex: number | null;
	hasEmittedAnyEvent: boolean;
	aborted: boolean;
}

/**
 * Token tracking context
 */
export interface TokenTrackingContext {
	tracker: any; // TokenTracker from token-tracking.service
	sessionId: string;
	baseContextTokens: number;
	appContext: AppContext;
}

/**
 * Options for orchestrating AI stream
 */
export interface OrchestrateStreamOptions {
	model: LanguageModel;
	messages: CoreMessage[];
	systemPrompt: string;
	tools: any;
	abortSignal?: AbortSignal;
	onStepFinish: (stepResult: any) => Promise<void>;
	prepareStep: (params: any) => Promise<any>;
}

/**
 * Process AI stream and emit events
 * Returns final usage and finish reason
 */
export async function processAIStream(
	fullStream: AsyncIterable<TextStreamPart<any>>,
	observer: Observer<StreamEvent, unknown>,
	state: StreamState,
	tokenContext: TokenTrackingContext | null,
	callbacks: StreamCallbacks,
): Promise<{ finalUsage: any; finalFinishReason: string | undefined; hasError: boolean }> {
	let finalUsage: any;
	let finalFinishReason: string | undefined;
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
						}
						state.hasEmittedAnyEvent = true;
						// NOTE: Only use callback - emitTextDelta() is called in callback
						callbacks.onTextDelta?.(chunk.text);

						// Update tokens in real-time (incremental)
						if (tokenContext) {
							await updateTokensFromDelta(
								tokenContext.tracker,
								chunk.text,
								tokenContext.sessionId,
								tokenContext.baseContextTokens,
								tokenContext.appContext,
							);
						}
					}
					break;
				}

				case "text-end": {
					if (state.currentTextPartIndex !== null) {
						const part = state.currentStepParts[state.currentTextPartIndex];
						if (part && part.type === "text") {
							part.status = "completed";
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
						}
						state.hasEmittedAnyEvent = true;
						// NOTE: Only use callback - emitReasoningDelta() is called in callback
						callbacks.onReasoningDelta?.(chunk.text);

						// Update tokens in real-time (incremental)
						if (tokenContext) {
							await updateTokensFromDelta(
								tokenContext.tracker,
								chunk.text,
								tokenContext.sessionId,
								tokenContext.baseContextTokens,
								tokenContext.appContext,
							);
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
							// NOTE: Only use callback - emitReasoningEnd() is called in callback
							callbacks.onReasoningEnd?.(duration);
						}
						state.currentReasoningPartIndex = null;
					}
					state.hasEmittedAnyEvent = true;
					break;
				}

				case "tool-call": {
					const existingToolPart = state.currentStepParts.find(
						(p) => p.type === "tool" && p.toolId === chunk.toolCallId,
					);

					if (existingToolPart && existingToolPart.type === "tool") {
						existingToolPart.name = chunk.toolName;
					} else {
						state.currentStepParts.push({
							type: "tool",
							toolId: chunk.toolCallId,
							name: chunk.toolName,
							status: "active",
							input: "input" in chunk ? chunk.input : undefined,
						});

						state.activeTools.set(chunk.toolCallId, {
							name: chunk.toolName,
							startTime: Date.now(),
							input: "input" in chunk ? chunk.input : undefined,
						});
					}

					state.hasEmittedAnyEvent = true;
					emitToolCall(
						observer,
						chunk.toolCallId,
						chunk.toolName,
						"input" in chunk ? chunk.input : undefined,
					);
					callbacks.onToolCall?.(
						chunk.toolCallId,
						chunk.toolName,
						"input" in chunk ? chunk.input : undefined,
					);
					break;
				}

				case "tool-input-start": {
					state.currentStepParts.push({
						type: "tool",
						toolId: chunk.id,
						name: chunk.toolName,
						status: "active",
						input: "",
					});

					state.activeTools.set(chunk.id, {
						name: chunk.toolName,
						startTime: Date.now(),
						input: "",
					});

					emitToolInputStart(observer, chunk.id);
					break;
				}

				case "tool-input-delta": {
					const tool = state.activeTools.get(chunk.id);
					if (tool) {
						const currentInput = typeof tool.input === "string" ? tool.input : "";
						tool.input = currentInput + chunk.delta;
					}

					const toolPart = state.currentStepParts.find(
						(p) => p.type === "tool" && p.toolId === chunk.id && p.status === "active",
					);
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
						} catch (_e) {
							console.error("[AIOrchestrator] Failed to parse tool input:", tool.input);
							tool.input = {};
						}
					}

					const toolPart = state.currentStepParts.find(
						(p) => p.type === "tool" && p.toolId === chunk.id && p.status === "active",
					);
					if (toolPart && toolPart.type === "tool") {
						try {
							const inputText = typeof toolPart.input === "string" ? toolPart.input : "";
							toolPart.input = inputText ? JSON.parse(inputText) : {};
						} catch (_e) {
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

						const toolPart = state.currentStepParts.find(
							(p) => p.type === "tool" && p.name === chunk.toolName && p.status === "active",
						);

						if (toolPart && toolPart.type === "tool") {
							toolPart.status = "completed";
							toolPart.duration = duration;
							toolPart.result = "output" in chunk ? chunk.output : undefined;
						}

						state.hasEmittedAnyEvent = true;
						emitToolResult(
							observer,
							chunk.toolCallId,
							chunk.toolName,
							"output" in chunk ? chunk.output : undefined,
							duration,
						);
						callbacks.onToolResult?.(
							chunk.toolCallId,
							chunk.toolName,
							"output" in chunk ? chunk.output : undefined,
							duration,
						);
					}
					break;
				}

				case "tool-error": {
					const tool = state.activeTools.get(chunk.toolCallId);
					if (tool) {
						const duration = Date.now() - tool.startTime;
						state.activeTools.delete(chunk.toolCallId);

						const toolPart = state.currentStepParts.find(
							(p) => p.type === "tool" && p.name === chunk.toolName && p.status === "active",
						);

						if (toolPart && toolPart.type === "tool") {
							toolPart.status = "error";
							toolPart.duration = duration;
							toolPart.error = String(chunk.error);
						}

						state.hasEmittedAnyEvent = true;
						emitToolError(
							observer,
							chunk.toolCallId,
							chunk.toolName,
							String(chunk.error),
							duration,
						);
						callbacks.onToolError?.(
							chunk.toolCallId,
							chunk.toolName,
							String(chunk.error),
							duration,
						);
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
					state.currentStepParts.push({
						type: "error",
						error: String(chunk.error),
						status: "completed",
					});
					hasError = true;
					emitError(observer, String(chunk.error));
					callbacks.onError?.(String(chunk.error));
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
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		const isAbortError =
			(error instanceof Error && error.message.includes("No output generated")) || state.aborted;

		if (isAbortError) {
			state.aborted = true;
		} else {
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
export function createStreamState(): StreamState {
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
 * Orchestrate AI stream with AI SDK
 */
export async function orchestrateAIStream(
	options: OrchestrateStreamOptions,
): Promise<{ fullStream: AsyncIterable<TextStreamPart<any>>; response: Promise<any> }> {
	const { fullStream, response } = streamText({
		model: options.model,
		messages: options.messages,
		system: options.systemPrompt,
		tools: options.tools,
		...(options.abortSignal ? { abortSignal: options.abortSignal } : {}),
		stopWhen: stepCountIs(10000),
		onStepFinish: options.onStepFinish,
		prepareStep: options.prepareStep,
	});

	return { fullStream, response };
}
