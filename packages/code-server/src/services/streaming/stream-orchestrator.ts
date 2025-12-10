/**
 * Stream Orchestrator
 * Main streamAIResponse function - coordinates all streaming modules
 */

import { randomUUID } from "node:crypto";
import type {
	AIConfig,
	MessagePart,
	MessageRepository,
	ProviderId,
	Session,
	SessionRepository as SessionRepositoryType,
	SessionStatus,
	StreamCallbacks,
	Todo,
} from "@sylphx/code-core";
import {
	buildModelMessages,
	buildSystemPrompt,
	DEFAULT_AGENT_ID,
	getAISDKTools,
	getProvider,
} from "@sylphx/code-core";
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
	type PersistenceContext,
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
import {
	createSessionStatusManager,
	type SessionStatusManager,
} from "./session-status-manager.js";
import { generateSessionTitle, needsTitleGeneration } from "./title-generator.js";
import type { ParsedContentPart, StreamAIResponseOptions, StreamEvent } from "./types.js";

// ============================================================================
// Provider Validator (inlined from provider-validator.ts)
// ============================================================================

interface ProviderValidationError {
	type: "not-configured" | "invalid-credentials";
	message: string;
}

/**
 * Validate provider configuration for a session
 * Returns error if provider is not configured or credentials are invalid
 */
function validateProvider(aiConfig: AIConfig, session: Session): ProviderValidationError | null {
	const provider = session.provider;
	const providerConfig = aiConfig?.providers?.[provider];

	if (!providerConfig) {
		return {
			type: "not-configured",
			message:
				"[ERROR] Provider not configured\n\nPlease configure your provider using the /provider command.",
		};
	}

	const providerInstance = getProvider(provider);
	const isConfigured = providerInstance.isConfigured(providerConfig);

	if (!isConfigured) {
		return {
			type: "invalid-credentials",
			message: `[ERROR] ${providerInstance.name} is not properly configured\n\nPlease check your settings with the /provider command.`,
		};
	}

	return null;
}

// ============================================================================
// Session Manager (inlined from session-manager.ts)
// ============================================================================

/**
 * Session result as discriminated union
 * Prevents illegal states where sessionId exists but isNewSession=true
 */
type SessionResult =
	| { type: "existing"; sessionId: string }
	| { type: "new"; sessionId: string; provider: ProviderId; model: string };

/**
 * Create new session if sessionId is null, otherwise return existing sessionId
 */
async function ensureSession(
	sessionRepository: SessionRepositoryType,
	aiConfig: AIConfig,
	sessionId: string | null,
	provider?: ProviderId,
	model?: string,
	agentId?: string,
): Promise<SessionResult> {
	// Return existing session
	if (sessionId) {
		return { type: "existing", sessionId };
	}

	// Create new session
	if (!provider || !model) {
		throw new Error("Provider and model required when creating new session");
	}

	const providerConfig = aiConfig?.providers?.[provider];

	if (!providerConfig) {
		throw new Error("Provider not configured. Please configure your provider using settings.");
	}

	// Create session in database
	const effectiveAgentId = agentId || DEFAULT_AGENT_ID;
	const newSession = await sessionRepository.createSession(provider, model, effectiveAgentId);

	return {
		type: "new",
		sessionId: newSession.id,
		provider,
		model,
	};
}

// ============================================================================
// File Handler (inlined from file-handler.ts)
// ============================================================================

/**
 * Fetch file content from storage (ChatGPT-style architecture)
 * Files uploaded immediately on paste/select, only fileId reference sent
 */
async function buildFrozenContent(
	userMessageContent: ParsedContentPart[] | null | undefined,
	messageRepository: MessageRepository,
): Promise<MessagePart[]> {
	const frozenContent: MessagePart[] = [];

	if (!userMessageContent) {
		return frozenContent;
	}

	for (const part of userMessageContent) {
		if (part.type === "text") {
			frozenContent.push({
				type: "text",
				content: part.content,
				status: "completed",
			});
		} else if (part.type === "file") {
			try {
				// Fetch file content from object storage using fileId
				const fileRepo = messageRepository.getFileRepository();
				const fileRecord = await fileRepo.getFileContent(part.fileId);

				if (!fileRecord) {
					throw new Error(`File not found in storage: ${part.fileId}`);
				}

				// Convert Buffer to base64 for MessagePart
				const base64Data = fileRecord.content.toString("base64");

				// Create file part (will be migrated to file-ref by addMessage)
				frozenContent.push({
					type: "file",
					relativePath: part.relativePath,
					size: part.size,
					mediaType: part.mimeType,
					base64: base64Data, // Temporary - will be moved to file_contents
					status: "completed",
				});
			} catch (error) {
				// File fetch failed - save error
				console.error("[FileHandler] File fetch failed:", error);
				frozenContent.push({
					type: "error",
					error: `Failed to fetch file: ${part.relativePath}`,
					status: "completed",
				});
			}
		}
	}

	return frozenContent;
}

// ============================================================================
// Stream Orchestrator
// ============================================================================

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
		// Declare these outside try-catch so they're accessible in catch/finally blocks
		let assistantMessageId: string | undefined = undefined;
		let state: StreamState | null = null;
		let statusManager: SessionStatusManager | null = null;
		let tokenSubscription: any = null;

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

				// 3. Create Session Status Manager (Pub-Sub pattern)
				// Pass full session for model-level event emission
				// Pass appContext to enable publishing to Lens EventStream
				statusManager = createSessionStatusManager(observer, sessionId, session, opts.appContext);

				// Subscribe to token updates from app event stream
				// Token updates are published to session-stream:${sessionId} channel
				tokenSubscription = opts.appContext.eventStream
					.subscribe(`session-stream:${sessionId}`)
					.subscribe((event) => {
						if (event.type === "session-tokens-updated" && statusManager) {
							const payload = event.payload as any;
							// Use outputTokens if available (current streaming), else calculate from total
							const tokenUsage = payload.outputTokens ?? payload.totalTokens ?? 0;
							statusManager.callbacks.onTokenUpdate(tokenUsage);
						}
					});

				// 4. Validate provider configuration
				const validationError = validateProvider(aiConfig, session);
				if (validationError) {
					const errorMessageId = randomUUID();
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

					// LENS: Publish user-message-created to session stream for live queries
					await opts.appContext.eventStream.publish(`session-stream:${sessionId}`, {
						type: "user-message-created",
						message: {
							id: _userMessageId,
							sessionId,
							role: "user",
							timestamp: Date.now(),
							status: "completed",
							steps: [], // User messages typically have no steps initially
						},
					});
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
					// Load base tools (filesystem, shell, search, MCP)
					const baseTools = await getAISDKTools({ interactive: false });

					// Create server-side ask tool
					const { createAskTool } = await import("./ask-tool.js");
					const askTool = createAskTool(sessionId, observer);
					askToolRegistered = true;

					// Create server-side todo tool
					const { createServerTodoTool } = await import("./todo-tool.js");
					const todoTool = createServerTodoTool(sessionId, sessionRepository, opts.appContext);

					// Combine all tools
					tools = {
						...baseTools,
						ask: askTool,
						updateTodos: todoTool,
					};
				} else {
					tools = undefined;
				}

				// 12. Check if title generation is needed
				const isFirstMessage =
					updatedSession.messages.filter((m) => m.role === "user").length === 1;
				const needsTitle = needsTitleGeneration(updatedSession, isNewSession, isFirstMessage);

				// 13. Create assistant message in database BEFORE stream
				assistantMessageId = await createAssistantMessage(
					sessionId,
					messageRepository,
					observer,
				);

				// LENS: Publish assistant-message-created to session stream for live queries
				await opts.appContext.eventStream.publish(`session-stream:${sessionId}`, {
					type: "assistant-message-created",
					message: {
						id: assistantMessageId,
						sessionId,
						role: "assistant",
						timestamp: Date.now(),
						status: "active",
						steps: [], // Steps added during streaming via step-added events
					},
				});

				// 14. Initialize stream processing state
				state = createStreamState();

				// Listen for abort signal to set state.aborted immediately
				// This ensures state.aborted is true BEFORE any errors are thrown
				if (abortSignal) {
					abortSignal.addEventListener("abort", () => {
						if (state) {
							state.aborted = true;
						}
					});
				}

				let lastCompletedStepNumber = -1;
				const streamStartTime = Date.now();
				const stepIdMap = new Map<number, string>(); // Track stepNumber → stepId mapping

				// 15. Initialize token tracking
				const cwd = process.cwd();
				const { tracker: tokenTracker, baseContextTokens } = await initializeTokenTracking(
					sessionId,
					session,
					messageRepository,
					cwd,
					opts.appContext,
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
					onToolCall: (toolCallId, toolName, input, startTime) => {
						emitToolCall(observer, toolCallId, toolName, input, startTime);
						// Notify status manager
						if (statusManager) {
							statusManager.callbacks.onToolCall(toolName);
						}
					},
					onToolResult: async (toolCallId, toolName, result, duration) => {
						emitToolResult(observer, toolCallId, toolName, result, duration);
						// Notify status manager
						if (statusManager) {
							statusManager.callbacks.onToolResult();
						}
						// If updateTodos tool completed, refetch session to get updated todos
						if (toolName === "updateTodos" && sessionId && statusManager) {
							try {
								const updatedSession = await sessionRepository.getSessionById(sessionId);
								if (updatedSession?.todos) {
									statusManager.callbacks.onTodoUpdate(updatedSession.todos);
								}
							} catch (error) {
								console.error("[StreamOrchestrator] Failed to refetch todos after updateTodos:", error);
							}
						}
					},
					onToolError: (toolCallId, toolName, error, duration) => {
						emitToolError(observer, toolCallId, toolName, error, duration);
						// Notify status manager
						if (statusManager) {
							statusManager.callbacks.onToolError();
						}
					},
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
				// console.log(`[StreamOrchestrator] 🔄 Loop iteration ${iterationCount}`);

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
								stepIdMap, // Pass map to retrieve stepId
							);
							lastCompletedStepNumber = stepNumber;
							state.currentStepParts = [];
						} catch (error) {
							console.error("[onStepFinish] Error:", error);
						}
					},
					prepareStep: async ({ steps, stepNumber, messages: stepMessages }) => {
						// Use our manual step counter, not AI SDK's (which resets per streamText call)
						const actualStepNumber = lastCompletedStepNumber + 1;
						return await prepareStep(
							actualStepNumber,
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
							stepIdMap, // Pass map to track generated stepId
							opts.appContext, // For publishing Lens entity events
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
			// LENS: Create persistence context for incremental database writes
			const currentStepNumber = lastCompletedStepNumber + 1;

			// LENS: Debouncing - publish every N deltas to reduce database contention
			let deltasSinceLastPublish = 0;
			const PUBLISH_INTERVAL = 10; // Publish every 10 deltas

			const persistence = {
				messageRepository,
				getStepId: () => stepIdMap.get(currentStepNumber) || null,

				// LENS: Publish fine-grained part-updated event after upsert
				// Debounced: only publishes every PUBLISH_INTERVAL deltas or when forced
				// Publishes to BOTH channels:
				// - message:${messageId} for entity-level subscriptions
				// - session-stream:${sessionId} for listMessages Live Query
				publishPartUpdate: async (stepId: string, partIndex: number, part: MessagePart, forcePublish = false) => {
					deltasSinceLastPublish++;

					if (forcePublish || deltasSinceLastPublish >= PUBLISH_INTERVAL) {
						const partUpdateEvent = {
							type: 'part-updated',
							messageId: assistantMessageId,
							stepId,
							partIndex,
							part
						};

						// Publish to both channels in parallel
						await Promise.all([
							// Entity-level channel for direct message subscriptions
							opts.appContext.eventStream.publish(`message:${assistantMessageId}`, partUpdateEvent),
							// Session-stream channel for listMessages Live Query
							opts.appContext.eventStream.publish(`session-stream:${sessionId}`, partUpdateEvent),
						]);
						deltasSinceLastPublish = 0;
					}
				}
			};

				const stepResult = await processAIStream(
					fullStream,
					observer,
					state,
					tokenContext,
					callbacks,
					persistence, // LENS: Pass persistence for incremental writes
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

				// console.log(
				// 	`[StreamOrchestrator] Step finished. finishReason: ${finalFinishReason}, hasError: ${hasError}, aborted: ${state.aborted}`,
				// );

				// 4. Check finishReason and decide next action
				if (state.aborted || hasError) {
					// Exit on abort or error
					// console.log("[StreamOrchestrator] Exiting loop: abort or error");
					break;
				}

				if (finalFinishReason === "tool-calls") {
					// Continue loop - AI wants to make more tool calls
					// console.log("[StreamOrchestrator] Continuing loop: tool-calls");
					continue;
				}

				if (finalFinishReason === "stop") {
					// Check queue for pending messages
					const queuedMessages = await sessionRepository.getQueuedMessages(sessionId);

					if (queuedMessages.length > 0) {
						// console.log(
						// 	`[StreamOrchestrator] 📬 Found ${queuedMessages.length} queued messages, injecting into loop`,
						// );

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

							// LENS: Publish user-message-created to session stream for live queries
							await opts.appContext.eventStream.publish(`session-stream:${sessionId}`, {
								type: "user-message-created",
								message: {
									id: result.messageId,
									sessionId,
									role: "user",
									timestamp: Date.now(),
									status: "completed",
									steps: [],
								},
							});

							// Complete the CURRENT assistant message before starting new one
							// This ensures the first message's streaming state is properly cleared
							const previousStatus = state.aborted ? "abort" : finalUsage ? "completed" : "error";
							await updateMessageStatus(
								assistantMessageId,
								previousStatus,
								finalFinishReason,
								finalUsage,
								messageRepository,
								observer,
							);

							// Publish message-updated event to EventStream for Live Query subscribers
							await opts.appContext.eventStream.publish(`session-stream:${sessionId}`, {
								type: "message-updated",
								messageId: assistantMessageId,
								message: {
									id: assistantMessageId,
									status: previousStatus,
									usage: finalUsage,
									finishReason: finalFinishReason,
								},
							});

							// Create NEW assistant message for the new response
							// This is a separate conversation turn after queue injection
							assistantMessageId = await createAssistantMessage(
								sessionId,
								messageRepository,
								observer,
							);

							// LENS: Publish assistant-message-created to session stream for live queries
							await opts.appContext.eventStream.publish(`session-stream:${sessionId}`, {
								type: "assistant-message-created",
								message: {
									id: assistantMessageId,
									sessionId,
									role: "assistant",
									timestamp: Date.now(),
									status: "active",
									steps: [],
								},
							});

							// Reset step counter for new assistant message
							lastCompletedStepNumber = -1;

							// Reset state for new message iteration
							// Clear finalUsage and finalFinishReason so they'll be populated fresh
							finalUsage = undefined;
							finalFinishReason = undefined;

							// Inject queued messages as new user message in history
							currentMessages.push({
								role: "user",
								content: combinedContent,
							});

							// Continue loop with injected messages
							// console.log("[StreamOrchestrator] Continuing loop: queued messages injected");
							continue;
						}
					}

					// No queue, exit loop
					// console.log("[StreamOrchestrator] Exiting loop: stop with no queue");
					break;
				}

				// Unknown finish reason - exit
				// console.log(`[StreamOrchestrator] Exiting loop: unknown finishReason ${finalFinishReason}`);
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

			// 22b. Publish message-updated event to EventStream for Live Query subscribers
			// This enables listMessages Live Query to update msg.status and stop the AnimatedIndicator
			await opts.appContext.eventStream.publish(`session-stream:${sessionId}`, {
				type: "message-updated",
				messageId: assistantMessageId,
				message: {
					id: assistantMessageId,
					status: finalStatus,
					usage: finalUsage,
					finishReason: finalFinishReason,
				},
			});

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

			// 25. Notify status manager that streaming has ended
			if (statusManager) {
				statusManager.callbacks.onStreamEnd();
			}

			// 26. Cleanup status manager
			if (statusManager) {
				statusManager.cleanup();
			}

			// Unsubscribe from token updates
			if (tokenSubscription) {
				tokenSubscription.unsubscribe();
			}

			// 27. Complete observable
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

				// Check if this is an intentional abort (user pressed ESC)
				// Only treat as abort if state.aborted is explicitly true
				const errorMessage = error instanceof Error ? error.message : String(error);
				const isAbortError = state?.aborted ?? false;

				if (isAbortError) {
					// For abort errors: update message status to trigger cleanup, but don't emit error event
					// Only if assistantMessageId was created (error occurred after message creation)
					if (assistantMessageId && sessionId) {
						await updateMessageStatus(
							assistantMessageId,
							"abort",
							undefined, // no finishReason
							undefined, // no usage
							opts.messageRepository,
							observer,
						);

						// Publish message-updated event to EventStream for Live Query subscribers
						await opts.appContext.eventStream.publish(`session-stream:${sessionId}`, {
							type: "message-updated",
							messageId: assistantMessageId,
							message: {
								id: assistantMessageId,
								status: "abort",
							},
						});
					}
					// If message not created yet, just complete silently
				} else {
					// Real error: emit error event for debugging
					emitError(observer, errorMessage);
				}

				// Cleanup status manager on error
				if (statusManager) {
					statusManager.cleanup();
				}

				// Unsubscribe from token updates
				if (tokenSubscription) {
					tokenSubscription.unsubscribe();
				}

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
			// Cleanup status manager
			if (statusManager) {
				statusManager.cleanup();
			}

			// Unsubscribe from token updates
			if (tokenSubscription) {
				tokenSubscription.unsubscribe();
			}

			// Unregister ask observer to prevent memory leak
			if (askToolRegistered) {
				import("../ask-queue.service.js").then(({ unregisterAskObserver }) => {
					unregisterAskObserver(sessionId, observer);
				});
			}
		};
	});
}
