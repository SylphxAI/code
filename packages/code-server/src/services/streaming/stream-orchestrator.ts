/**
 * Stream Orchestrator
 * Main streamAIResponse function - coordinates all streaming modules
 */

import type { StreamCallbacks } from "@sylphx/code-core";
import { buildSystemPrompt, getAISDKTools, getProvider } from "@sylphx/code-core";
import { type Observable, observable } from "@trpc/server/observable";
import {
	createAbortNotificationMessage,
	createAssistantMessage,
	createUserMessage,
	updateMessageStatus,
} from "../message-persistence.service.js";
import { completeStep, prepareStep } from "../step-lifecycle.service.js";
import { calculateFinalTokens, initializeTokenTracking } from "../token-tracking.service.js";
import {
	createStreamState,
	orchestrateAIStream,
	processAIStream,
	type TokenTrackingContext,
} from "./ai-orchestrator.js";
import {
	emitError,
	emitFile,
	emitReasoningDelta,
	emitReasoningEnd,
	emitReasoningStart,
	emitSessionCreated,
	emitSystemMessageCreated,
	emitTextDelta,
	emitTextEnd,
	emitTextStart,
	emitToolCall,
	emitToolError,
	emitToolResult,
} from "./event-emitter.js";
import { buildFrozenContent } from "./file-handler.js";
import { buildModelMessages } from "./message-builder.js";
import { validateProvider } from "./provider-validator.js";
import { ensureSession } from "./session-manager.js";
import { generateSessionTitle, needsTitleGeneration } from "./title-generator.js";
import type { StreamAIResponseOptions, StreamEvent } from "./types.js";

const STREAM_TIMEOUT_MS = 45000; // 45 seconds

/**
 * Stream AI response as Observable<StreamEvent>
 *
 * This function:
 * 1. Loads session from database
 * 2. Adds user message to session
 * 3. Builds message context for AI
 * 4. Streams AI response
 * 5. Emits events to observer
 * 6. Saves final result to database
 */
export function streamAIResponse(opts: StreamAIResponseOptions): Observable<StreamEvent, unknown> {
	return observable<StreamEvent>((observer) => {
		let askToolRegistered = false;
		let sessionId: string | null = null;
		const executionPromise = (async () => {
			try {
				const {
					sessionRepository,
					messageRepository,
					aiConfig,
					sessionId: inputSessionId,
					agentId: inputAgentId,
					provider: inputProvider,
					model: inputModel,
					userMessageContent,
					abortSignal,
				} = opts;

				// 1. Ensure session exists (create if needed)
				let isNewSession: boolean;

				try {
					const result = await ensureSession(
						sessionRepository,
						aiConfig,
						inputSessionId,
						inputProvider,
						inputModel,
						inputAgentId,
					);
					sessionId = result.sessionId;
					isNewSession = result.type === "new";

					if (result.type === "new") {
						emitSessionCreated(observer, result.sessionId, result.provider, result.model);
					}
				} catch (error) {
					emitError(observer, error instanceof Error ? error.message : String(error));
					observer.complete();
					return;
				}

				// 2. Load session from database
				const session = await sessionRepository.getSessionById(sessionId);
				if (!session) {
					observer.error(new Error("Session not found"));
					return;
				}

				// 3. Validate provider configuration
				const validationError = validateProvider(aiConfig, session);
				if (validationError) {
					const errorMessageId = `error-${Date.now()}`;
					emitSystemMessageCreated(observer, errorMessageId, validationError.message);
					observer.complete();
					return;
				}

				const provider = session.provider;
				const modelName = session.model;
				const providerConfig = aiConfig?.providers?.[provider];
				if (!providerConfig) {
					throw new Error(`Provider ${provider} is not configured`);
				}
				const providerInstance = getProvider(provider);

				// 4. Fetch file content from storage
				const frozenContent = await buildFrozenContent(userMessageContent, messageRepository);

				// 5. Add user message to session (if userMessageContent provided)
				let _userMessageId: string | null = null;
				let userMessageText = "";

				if (userMessageContent) {
					const result = await createUserMessage(
						sessionId,
						frozenContent,
						messageRepository,
						observer,
					);
					_userMessageId = result.messageId;
					userMessageText = result.messageText;
				}

				// 6. Reload session to get updated messages
				const updatedSession = await sessionRepository.getSessionById(sessionId);
				if (!updatedSession) {
					observer.error(new Error("Session not found after adding message"));
					return;
				}

				// 7. Lazy load model capabilities
				let modelCapabilities = providerInstance.getModelCapabilities(modelName);
				if (modelCapabilities.size === 0) {
					try {
						await providerInstance.fetchModels(providerConfig);
						modelCapabilities = providerInstance.getModelCapabilities(modelName);
					} catch (err) {
						console.error("[StreamOrchestrator] Failed to fetch model capabilities:", err);
					}
				}

				// 8. Build ModelMessage[] for AI
				const messages = await buildModelMessages(
					updatedSession.messages,
					modelCapabilities,
					messageRepository.getFileRepository(),
				);

				// 9. Determine agentId and build system prompt
				const agentId = inputAgentId || session.agentId || "coder";
				const agents = opts.appContext.agentManager.getAll();
				const enabledRuleIds = session.enabledRuleIds || [];
				const enabledRules = opts.appContext.ruleManager.getEnabled(enabledRuleIds);
				const systemPrompt = buildSystemPrompt(agentId, agents, enabledRules);

				// 10. Create AI model (lazy-loaded SDK)
				const model = await providerInstance.createClient(providerConfig, modelName);

				// 11. Determine tool support and load tools
				const supportsTools = modelCapabilities.has("tools");
				let tools: Record<string, any> | undefined;
				if (supportsTools) {
					const baseTools = await getAISDKTools({ interactive: false });
					const { createAskTool } = await import("./ask-tool.js");
					const askTool = createAskTool(sessionId, observer);
					tools = { ...baseTools, ask: askTool };
					askToolRegistered = true;
				} else {
					tools = undefined;
				}

				// 12. Check if title generation is needed
				const isFirstMessage =
					updatedSession.messages.filter((m) => m.role === "user").length === 1;
				const needsTitle = needsTitleGeneration(updatedSession, isNewSession, isFirstMessage);

				// 13. Create assistant message in database BEFORE stream
				const assistantMessageId = await createAssistantMessage(
					sessionId,
					messageRepository,
					observer,
				);

				// 14. Initialize stream processing state
				const state = createStreamState();
				let lastCompletedStepNumber = -1;
				const streamStartTime = Date.now();

				// 15. Initialize token tracking
				const cwd = process.cwd();
				const tokenTracker = await initializeTokenTracking(
					sessionId,
					session,
					messageRepository,
					cwd,
				);

				const { calculateBaseContextTokens } = await import("@sylphx/code-core");
				const baseContextTokens = await calculateBaseContextTokens(
					session.model,
					session.agentId,
					session.enabledRuleIds,
					cwd,
				);

				const tokenContext: TokenTrackingContext = {
					tracker: tokenTracker,
					sessionId,
					baseContextTokens,
					appContext: opts.appContext,
				};

				// 16. Create callbacks for stream processing
				const callbacks: StreamCallbacks = {
					onTextStart: () => emitTextStart(observer),
					onTextDelta: (text) => {
						emitTextDelta(observer, text);
					},
					onTextEnd: () => emitTextEnd(observer),
					onReasoningStart: () => emitReasoningStart(observer),
					onReasoningDelta: (text) => {
						emitReasoningDelta(observer, text);
					},
					onReasoningEnd: (duration) => emitReasoningEnd(observer, duration),
					onToolCall: (toolCallId, toolName, input) =>
						emitToolCall(observer, toolCallId, toolName, input),
					onToolResult: (toolCallId, toolName, result, duration) =>
						emitToolResult(observer, toolCallId, toolName, result, duration),
					onToolError: (toolCallId, toolName, error, duration) =>
						emitToolError(observer, toolCallId, toolName, error, duration),
					onFile: (mediaType, base64) => emitFile(observer, mediaType, base64),
					onAbort: () => {
						state.aborted = true;
					},
					onError: (error) => {
						const errorMessage = error instanceof Error ? error.message : String(error);
						emitError(observer, errorMessage);
					},
				};

			// 17. Create AI stream with manual agent loop
			let currentMessages = messages;
			let finalUsage: any;
			let finalFinishReason: string | undefined;
			let hasError = false;
			let iterationCount = 0;
			const MAX_ITERATIONS = 100;

			// Manual agent loop - gives us full control over stepping
			while (iterationCount < MAX_ITERATIONS) {
				iterationCount++;
				console.log(`[StreamOrchestrator] 🔄 Loop iteration ${iterationCount}`);

				// 1. Call streamText with maxSteps=1 (single step only)
				const { fullStream, response } = await orchestrateAIStream({
					model,
					messages: currentMessages,
					systemPrompt,
					tools,
					abortSignal,
					onStepFinish: async (stepResult) => {
						try {
							const stepNumber = lastCompletedStepNumber + 1;
							await completeStep(
								stepNumber,
								assistantMessageId,
								sessionId,
								stepResult,
								state.currentStepParts,
								sessionRepository,
								messageRepository,
								tokenTracker,
								opts.appContext,
								observer,
								session,
								cwd,
							);
							lastCompletedStepNumber = stepNumber;
							state.currentStepParts = [];
						} catch (error) {
							console.error("[onStepFinish] Error:", error);
						}
					},
					prepareStep: async ({ steps, stepNumber, messages: stepMessages }) => {
						return await prepareStep(
							stepNumber,
							assistantMessageId,
							sessionId,
							stepMessages,
							steps,
							sessionRepository,
							messageRepository,
							providerInstance,
							modelName,
							providerConfig,
							observer,
						);
					},
				});

				// 18. Start title generation immediately on first iteration (parallel)
				if (needsTitle && iterationCount === 1) {
					generateSessionTitle(
						opts.appContext,
						sessionRepository,
						aiConfig,
						updatedSession,
						userMessageText,
					).catch((error) => {
						console.error("[Title Generation] Background error:", error);
					});
				}

				// 2. Process stream and emit events
				const stepResult = await processAIStream(
					fullStream,
					observer,
					state,
					tokenContext,
					callbacks,
				);

				// Update final results from this step
				if (stepResult.finalUsage) {
					finalUsage = stepResult.finalUsage;
				}
				if (stepResult.finalFinishReason) {
					finalFinishReason = stepResult.finalFinishReason;
				}
				if (stepResult.hasError) {
					hasError = true;
				}

				// 3. Update message history - get response messages from AI SDK
				const responseData = await response;
				const responseMessages = responseData.messages;

				// Push response messages to current message history
				currentMessages = [...currentMessages, ...responseMessages];

				console.log(
					`[StreamOrchestrator] Step finished. finishReason: ${finalFinishReason}, hasError: ${hasError}, aborted: ${state.aborted}`,
				);

				// 4. Check finishReason and decide next action
				if (state.aborted || hasError) {
					// Exit on abort or error
					console.log("[StreamOrchestrator] Exiting loop: abort or error");
					break;
				}

				if (finalFinishReason === "tool-calls") {
					// Continue loop - AI wants to make more tool calls
					console.log("[StreamOrchestrator] Continuing loop: tool-calls");
					continue;
				}

				if (finalFinishReason === "stop") {
					// Check queue for pending messages
					const queuedMessages = await sessionRepository.getQueuedMessages(sessionId);

					if (queuedMessages.length > 0) {
						console.log(
							`[StreamOrchestrator] 📬 Found ${queuedMessages.length} queued messages, injecting into loop`,
						);

						// Clear queue
						await sessionRepository.clearQueue(sessionId);

						// Emit queue-cleared event
						observer.next({
							type: "queue-cleared",
							sessionId,
						});

						// Combine ALL queued messages into ONE user message
						const combinedContent = queuedMessages
							.map((msg) => msg.content)
							.filter((content) => content && content.trim())
							.join("\n\n");

						if (combinedContent.trim()) {
							// Create user message in database for queued content
							const result = await createUserMessage(
								sessionId,
								[{ type: "text", content: combinedContent }],
								messageRepository,
								observer,
							);

							console.log(`[StreamOrchestrator] Created queued user message: ${result.messageId}`);

							// Inject queued messages as new user message in history
							currentMessages.push({
								role: "user",
								content: combinedContent,
							});

							// Continue loop with injected messages
							console.log("[StreamOrchestrator] Continuing loop: queued messages injected");
							continue;
						}
					}

					// No queue, exit loop
					console.log("[StreamOrchestrator] Exiting loop: stop with no queue");
					break;
				}

				// Unknown finish reason - exit
				console.log(`[StreamOrchestrator] Exiting loop: unknown finishReason ${finalFinishReason}`);
				break;
			}

			// Check for max iterations
			if (iterationCount >= MAX_ITERATIONS) {
				console.error(`[StreamOrchestrator] Max iterations (${MAX_ITERATIONS}) reached`);
				const maxIterError = `Maximum iteration limit (${MAX_ITERATIONS}) reached. This may indicate an infinite loop.`;
				state.currentStepParts.push({
					type: "error",
					error: maxIterError,
					status: "completed",
				});
				emitError(observer, maxIterError);
				hasError = true;
			}

			// 20. Check for timeout (if no events were emitted at all)
			const elapsedMs = Date.now() - streamStartTime;
			if (!state.hasEmittedAnyEvent && elapsedMs > STREAM_TIMEOUT_MS) {
				console.error(`[StreamOrchestrator] TIMEOUT after ${elapsedMs}ms with no events emitted`);
				const timeoutError = `Request to ${provider} (${modelName}) timed out after ${Math.round(elapsedMs / 1000)}s with no response. This may indicate a network issue, authentication problem, or the provider is unreachable.`;
				state.currentStepParts.push({
					type: "error",
					error: timeoutError,
					status: "completed",
				});
				emitError(observer, timeoutError);
			}

			// 21. Emit error event if no valid response
			if (!finalUsage && !state.aborted && !hasError) {
				const errorPart = state.currentStepParts.find((p) => p.type === "error");
				if (errorPart && errorPart.type === "error") {
					emitError(observer, errorPart.error);
				} else {
					emitError(
						observer,
						"API request failed to generate a response. Please check your API credentials and configuration.",
					);
				}
			}

			// 22. Update message status
			const finalStatus = state.aborted ? "abort" : finalUsage ? "completed" : "error";
			await updateMessageStatus(
				assistantMessageId,
				finalStatus,
				finalFinishReason,
				finalUsage,
				messageRepository,
				observer,
			);

			// 23. Create abort notification message if needed
			if (finalStatus === "abort") {
				await createAbortNotificationMessage(sessionId, aiConfig, messageRepository, observer);
			}

			// 24. Calculate final token counts
			await calculateFinalTokens(
				sessionId,
				sessionRepository,
				messageRepository,
				opts.appContext,
				cwd,
			);

			// 25. Complete observable
			observer.complete();
			} catch (error) {
				console.error("[StreamOrchestrator] Error in execution:", error);
				console.error("[StreamOrchestrator] Error type:", error?.constructor?.name);
				console.error(
					"[StreamOrchestrator] Error message:",
					error instanceof Error ? error.message : String(error),
				);
				console.error(
					"[StreamOrchestrator] Error stack:",
					error instanceof Error ? error.stack : "N/A",
				);
				if (error && typeof error === "object") {
					console.error("[StreamOrchestrator] Error keys:", Object.keys(error));
					console.error("[StreamOrchestrator] Error JSON:", JSON.stringify(error, null, 2));
				}
				emitError(observer, error instanceof Error ? error.message : String(error));
				observer.complete();
			}
		})();

		// Catch unhandled promise rejections
		executionPromise.catch((error) => {
			console.error("[StreamOrchestrator] Unhandled promise rejection:", error);

			let errorMessage = error instanceof Error ? error.message : String(error);

			if (error && typeof error === "object" && "cause" in error && error.cause) {
				const causeMessage =
					error.cause instanceof Error ? error.cause.message : String(error.cause);
				console.error("[StreamOrchestrator] Error cause:", causeMessage);
				if (causeMessage && !causeMessage.includes("No output generated")) {
					errorMessage = causeMessage;
				}
			}

			try {
				emitError(observer, errorMessage);
				observer.complete();
			} catch (observerError) {
				console.error("[StreamOrchestrator] Failed to emit error event:", observerError);
				try {
					observer.complete();
				} catch (completeError) {
					console.error("[StreamOrchestrator] Failed to complete observer:", completeError);
				}
			}
		});

		// Cleanup function
		return () => {
			// Unregister ask observer to prevent memory leak
			if (askToolRegistered) {
				import("../ask-queue.service.js").then(({ unregisterAskObserver }) => {
					unregisterAskObserver(sessionId, observer);
				});
			}
		};
	});
}
