/**
 * Stream Orchestrator V2
 * Perfect architecture: Direct eventStream publishing, no Observable
 *
 * Architecture:
 * - Events published directly to eventStream via StreamPublisher
 * - Returns Promise<StreamResult> for async/await usage
 * - Single event path: modules → StreamPublisher → eventStream
 * - No tRPC Observable/Observer pattern
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
} from "@sylphx/code-core";
import {
	buildModelMessages,
	buildSystemPrompt,
	DEFAULT_AGENT_ID,
	getAISDKTools,
	getProvider,
} from "@sylphx/code-core";
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
	type ParsedTextHandler,
	processAIStream,
	type StreamState,
	type TokenTrackingContext,
} from "./ai-orchestrator.js";
import type { AppContext } from "../../context.js";
import {
	emitError,
	emitFile,
	emitReasoningDelta,
	emitReasoningEnd,
	emitReasoningStart,
	emitSessionCreated,
	emitSystemMessageCreated,
	emitTextEnd,
	emitTextStart,
	emitToolCall,
	emitToolError,
	emitToolResult,
} from "./event-emitter.js";
import {
	createInlineActionDispatcher,
	type InlineActionDispatcher,
} from "./inline-action-dispatcher.js";
import {
	createSessionStatusManager,
	type SessionStatusManager,
} from "./session-status-manager.js";
import {
	createStreamPublisher,
	type StreamAIResponseOptions,
	type StreamPublisher,
} from "./types.js";

/**
 * Result of streamAIResponse
 */
export interface StreamResult {
	success: boolean;
	sessionId: string;
	error?: string;
}

// ============================================================================
// Provider Validator
// ============================================================================

interface ProviderValidationError {
	type: "not-configured" | "invalid-credentials";
	message: string;
}

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
// Session Manager
// ============================================================================

type SessionResult =
	| { type: "existing"; sessionId: string }
	| { type: "new"; sessionId: string; provider: ProviderId; model: string };

async function ensureSession(
	sessionRepository: SessionRepositoryType,
	aiConfig: AIConfig,
	sessionId: string | null,
	provider?: ProviderId,
	model?: string,
	agentId?: string,
): Promise<SessionResult> {
	if (sessionId) {
		return { type: "existing", sessionId };
	}

	if (!provider || !model) {
		throw new Error("Provider and model required when creating new session");
	}

	const providerConfig = aiConfig?.providers?.[provider];
	if (!providerConfig) {
		throw new Error("Provider not configured. Please configure your provider using settings.");
	}

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
// File Handler
// ============================================================================

async function buildFrozenContent(
	userMessageContent: Array<{ type: string; [key: string]: any }> | null | undefined,
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
				const fileRepo = messageRepository.getFileRepository();
				const fileRecord = await fileRepo.getFileContent(part.fileId);

				if (!fileRecord) {
					throw new Error(`File not found in storage: ${part.fileId}`);
				}

				const base64Data = fileRecord.content.toString("base64");

				frozenContent.push({
					type: "file",
					relativePath: part.relativePath,
					size: part.size,
					mediaType: part.mimeType,
					base64: base64Data,
					status: "completed",
				});
			} catch (error) {
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
// Title Generator
// ============================================================================

function needsTitleGeneration(
	session: Session,
	isNewSession: boolean,
	isFirstMessage: boolean,
): boolean {
	return isNewSession && isFirstMessage && !session.title;
}

// ============================================================================
// Stream Orchestrator V2
// ============================================================================

const STREAM_TIMEOUT_MS = 45000;

/**
 * Stream AI response with direct eventStream publishing
 *
 * Perfect Architecture:
 * - No Observable/Observer pattern
 * - Events published directly to eventStream via StreamPublisher
 * - Returns Promise<StreamResult> for async/await usage
 * - Single event path: modules → StreamPublisher → eventStream
 */
export async function streamAIResponseV2(opts: StreamAIResponseOptions): Promise<StreamResult> {
	const {
		appContext,
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

	// Track state for cleanup
	let sessionId: string;
	let assistantMessageId: string | undefined;
	let state: StreamState | null = null;
	let statusManager: SessionStatusManager | null = null;
	let tokenSubscription: any = null;
	let publisher: StreamPublisher;

	try {
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

			// 2. Create StreamPublisher for direct eventStream publishing
			publisher = createStreamPublisher(appContext, sessionId);

			// Emit session-created if new
			if (result.type === "new") {
				emitSessionCreated(publisher, result.sessionId, result.provider, result.model);

				// Also publish to global channel for triggerStreamMutation to get sessionId early
				await appContext.eventStream.publish("session-created", {
					type: "session-created",
					sessionId: result.sessionId,
					provider: result.provider,
					model: result.model,
				});
			}
		} catch (error) {
			return {
				success: false,
				sessionId: "",
				error: error instanceof Error ? error.message : String(error),
			};
		}

		// 3. Load session from database
		const session = await sessionRepository.getSessionById(sessionId);
		if (!session) {
			emitError(publisher, "Session not found");
			publisher.complete();
			return { success: false, sessionId, error: "Session not found" };
		}

		// 4. Create Session Status Manager
		statusManager = createSessionStatusManager(publisher, sessionId, session, appContext);

		// Subscribe to token updates
		tokenSubscription = appContext.eventStream
			.subscribe(`session-stream:${sessionId}`)
			.subscribe((event) => {
				if (event.type === "session-tokens-updated" && statusManager) {
					const payload = event.payload as any;
					const tokenUsage = payload.outputTokens ?? payload.totalTokens ?? 0;
					statusManager.callbacks.onTokenUpdate(tokenUsage);
				}
			});

		// 5. Validate provider configuration
		const validationError = validateProvider(aiConfig, session);
		if (validationError) {
			const errorMessageId = randomUUID();
			emitSystemMessageCreated(publisher, errorMessageId, validationError.message);
			publisher.complete();
			return { success: false, sessionId, error: validationError.message };
		}

		const provider = session.provider;
		const modelName = session.model;
		const providerConfig = aiConfig?.providers?.[provider];
		if (!providerConfig) {
			throw new Error(`Provider ${provider} is not configured`);
		}
		const providerInstance = getProvider(provider);

		// 6. Fetch file content from storage
		const frozenContent = await buildFrozenContent(userMessageContent, messageRepository);

		// 7. Add user message to session
		let userMessageText = "";

		if (userMessageContent) {
			const result = await createUserMessage(
				sessionId,
				frozenContent,
				messageRepository,
				publisher,
			);
			userMessageText = result.messageText;

			await appContext.eventStream.publish(`session-stream:${sessionId}`, {
				type: "user-message-created",
				message: {
					id: result.messageId,
					sessionId,
					role: "user",
					content: userMessageText,
					timestamp: Date.now(),
					status: "completed",
					steps: [],
				},
			});
		}

		// 8. Reload session
		const updatedSession = await sessionRepository.getSessionById(sessionId);
		if (!updatedSession) {
			emitError(publisher, "Session not found after adding message");
			publisher.complete();
			return { success: false, sessionId, error: "Session not found after adding message" };
		}

		// 9. Lazy load model capabilities
		let modelCapabilities = providerInstance.getModelCapabilities(modelName);
		if (modelCapabilities.size === 0) {
			try {
				await providerInstance.fetchModels(providerConfig);
				modelCapabilities = providerInstance.getModelCapabilities(modelName);
			} catch (err) {
				console.error("[StreamOrchestrator] Failed to fetch model capabilities:", err);
			}
		}

		// 10. Build ModelMessage[] for AI
		const messages = await buildModelMessages(
			updatedSession.messages,
			modelCapabilities,
			messageRepository.getFileRepository(),
		);

		// 11. Build system prompt
		const agentId = inputAgentId || session.agentId || "coder";
		const agents = appContext.agentManager.getAll();
		const enabledRuleIds = session.enabledRuleIds || [];
		const enabledRules = appContext.ruleManager.getEnabled(enabledRuleIds);
		const systemPrompt = buildSystemPrompt(agentId, agents, enabledRules, {
			enableInlineActions: true,
		});

		// 12. Create AI model
		const model = await providerInstance.createClient(providerConfig, modelName);

		// 13. Load tools
		const supportsTools = modelCapabilities.has("tools");
		let tools: Record<string, any> | undefined;
		if (supportsTools) {
			const baseTools = await getAISDKTools({ interactive: false });

			const { createAskTool } = await import("./ask-tool.js");
			const askTool = createAskTool(sessionId);

			const { createServerTodoTool } = await import("./todo-tool.js");
			const todoTool = createServerTodoTool(sessionId, sessionRepository, appContext);

			tools = {
				...baseTools,
				ask: askTool,
				updateTodos: todoTool,
			};
		}

		// 14. Check if title generation is needed
		const isFirstMessage =
			updatedSession.messages.filter((m) => m.role === "user").length === 1;
		const needsTitle = needsTitleGeneration(updatedSession, isNewSession, isFirstMessage);

		// 15. Create assistant message
		assistantMessageId = await createAssistantMessage(
			sessionId,
			messageRepository,
			publisher,
		);

		await appContext.eventStream.publish(`session-stream:${sessionId}`, {
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

		// 16. Initialize stream state
		state = createStreamState();

		if (abortSignal) {
			abortSignal.addEventListener("abort", () => {
				if (state) {
					state.aborted = true;
				}
			});
		}

		let lastCompletedStepNumber = -1;
		const streamStartTime = Date.now();
		const stepIdMap = new Map<number, string>();

		// 17. Initialize token tracking
		const cwd = process.cwd();
		const { tracker: tokenTracker, baseContextTokens } = await initializeTokenTracking(
			sessionId,
			session,
			messageRepository,
			cwd,
			appContext,
		);

		const tokenContext: TokenTrackingContext = {
			tracker: tokenTracker,
			sessionId,
			baseContextTokens,
			appContext,
		};

		// 18. Create parsed text handler
		let accumulatedParsedText = "";
		const parsedTextHandler: ParsedTextHandler = {
			onParsedText: (text: string) => {
				accumulatedParsedText += text;
			},
			getAccumulatedContent: () => accumulatedParsedText,
		};

		// 19. Create inline action dispatcher
		const inlineActionDispatcher: InlineActionDispatcher = createInlineActionDispatcher({
			publisher,
			sessionId,
			sessionRepository,
			appContext,
			onParsedText: parsedTextHandler.onParsedText,
		});

		// 20. Create callbacks
		const callbacks: StreamCallbacks = {
			onTextStart: () => emitTextStart(publisher),
			onTextDelta: (text) => {
				inlineActionDispatcher.processChunk(text);
			},
			onTextEnd: () => {
				inlineActionDispatcher.flush();
				emitTextEnd(publisher);
			},
			onReasoningStart: () => emitReasoningStart(publisher),
			onReasoningDelta: (text) => {
				emitReasoningDelta(publisher, text);
			},
			onReasoningEnd: (duration) => emitReasoningEnd(publisher, duration),
			onToolCall: (toolCallId, toolName, input, startTime) => {
				emitToolCall(publisher, toolCallId, toolName, input, startTime);
				statusManager?.callbacks.onToolCall(toolName);
			},
			onToolResult: async (toolCallId, toolName, result, duration) => {
				emitToolResult(publisher, toolCallId, toolName, result, duration);
				statusManager?.callbacks.onToolResult();
				if (toolName === "updateTodos" && statusManager) {
					try {
						const sess = await sessionRepository.getSessionById(sessionId);
						if (sess?.todos) {
							statusManager.callbacks.onTodoUpdate(sess.todos);
						}
					} catch (error) {
						console.error("[StreamOrchestrator] Failed to refetch todos:", error);
					}
				}
			},
			onToolError: (toolCallId, toolName, error, duration) => {
				emitToolError(publisher, toolCallId, toolName, error, duration);
				statusManager?.callbacks.onToolError();
			},
			onFile: (mediaType, base64) => emitFile(publisher, mediaType, base64),
			onAbort: () => {
				if (state) state.aborted = true;
			},
			onError: (error) => {
				const errorMessage = error instanceof Error ? error.message : String(error);
				emitError(publisher, errorMessage);
			},
		};

		// 21. Manual agent loop
		let currentMessages = messages;
		let finalUsage: any;
		let finalFinishReason: string | undefined;
		let hasError = false;
		let iterationCount = 0;
		const MAX_ITERATIONS = 100;

		while (iterationCount < MAX_ITERATIONS) {
			iterationCount++;

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
							assistantMessageId!,
							sessionId,
							stepResult,
							state!.currentStepParts,
							sessionRepository,
							messageRepository,
							tokenTracker,
							appContext,
							publisher,
							session,
							cwd,
							stepIdMap,
						);
						lastCompletedStepNumber = stepNumber;
						state!.currentStepParts = [];
					} catch (error) {
						console.error("[onStepFinish] Error:", error);
					}
				},
				prepareStep: async ({ steps, stepNumber, messages: stepMessages }) => {
					const actualStepNumber = lastCompletedStepNumber + 1;
					return await prepareStep(
						actualStepNumber,
						assistantMessageId!,
						sessionId,
						stepMessages,
						steps,
						sessionRepository,
						messageRepository,
						providerInstance,
						modelName,
						providerConfig,
						publisher,
						stepIdMap,
						appContext,
					);
				},
			});

			// Title generation is handled by inline action dispatcher
			// when it parses <title> tags from AI response

			// Process stream
			const currentStepNumber = lastCompletedStepNumber + 1;
			let deltasSinceLastPublish = 0;
			const PUBLISH_INTERVAL = 10;

			const persistence = {
				messageRepository,
				getStepId: () => stepIdMap.get(currentStepNumber) || null,
				publishPartUpdate: async (
					stepId: string,
					partIndex: number,
					part: MessagePart,
					forcePublish = false,
				) => {
					deltasSinceLastPublish++;
					if (forcePublish || deltasSinceLastPublish >= PUBLISH_INTERVAL) {
						const partUpdateEvent = {
							type: "part-updated",
							messageId: assistantMessageId,
							stepId,
							partIndex,
							part,
						};
						await Promise.all([
							appContext.eventStream.publish(`message:${assistantMessageId}`, partUpdateEvent),
							appContext.eventStream.publish(`session-stream:${sessionId}`, partUpdateEvent),
						]);
						deltasSinceLastPublish = 0;
					}
				},
			};

			accumulatedParsedText = "";

			const stepResult = await processAIStream(
				fullStream,
				publisher,
				state!,
				tokenContext,
				callbacks,
				persistence,
				parsedTextHandler,
			);

			if (stepResult.finalUsage) finalUsage = stepResult.finalUsage;
			if (stepResult.finalFinishReason) finalFinishReason = stepResult.finalFinishReason;
			if (stepResult.hasError) hasError = true;

			const responseData = await response;
			currentMessages = [...currentMessages, ...responseData.messages];

			if (state!.aborted || hasError) break;

			if (finalFinishReason === "tool-calls") continue;

			if (finalFinishReason === "stop") {
				const queuedMessages = await sessionRepository.getQueuedMessages(sessionId);

				if (queuedMessages.length > 0) {
					await sessionRepository.clearQueue(sessionId);

					publisher.emit({
						type: "queue-cleared",
						sessionId,
					});

					const combinedContent = queuedMessages
						.map((msg) => msg.content)
						.filter((content) => content?.trim())
						.join("\n\n");

					if (combinedContent.trim()) {
						const result = await createUserMessage(
							sessionId,
							[{ type: "text", content: combinedContent }],
							messageRepository,
							publisher,
						);

						await appContext.eventStream.publish(`session-stream:${sessionId}`, {
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

						const previousStatus = state!.aborted ? "abort" : finalUsage ? "completed" : "error";
						await updateMessageStatus(
							assistantMessageId!,
							previousStatus,
							finalFinishReason,
							finalUsage,
							messageRepository,
							publisher,
						);

						await appContext.eventStream.publish(`session-stream:${sessionId}`, {
							type: "message-updated",
							messageId: assistantMessageId,
							message: {
								id: assistantMessageId,
								status: previousStatus,
								usage: finalUsage,
								finishReason: finalFinishReason,
							},
						});

						assistantMessageId = await createAssistantMessage(
							sessionId,
							messageRepository,
							publisher,
						);

						await appContext.eventStream.publish(`session-stream:${sessionId}`, {
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

						lastCompletedStepNumber = -1;
						finalUsage = undefined;
						finalFinishReason = undefined;

						currentMessages.push({
							role: "user",
							content: combinedContent,
						});

						continue;
					}
				}

				break;
			}

			break;
		}

		// Check max iterations
		if (iterationCount >= MAX_ITERATIONS) {
			console.error(`[StreamOrchestrator] Max iterations (${MAX_ITERATIONS}) reached`);
			const maxIterError = `Maximum iteration limit (${MAX_ITERATIONS}) reached.`;
			state!.currentStepParts.push({
				type: "error",
				error: maxIterError,
				status: "completed",
			});
			emitError(publisher, maxIterError);
			hasError = true;
		}

		// Check timeout
		const elapsedMs = Date.now() - streamStartTime;
		if (!state!.hasEmittedAnyEvent && elapsedMs > STREAM_TIMEOUT_MS) {
			const timeoutError = `Request timed out after ${Math.round(elapsedMs / 1000)}s.`;
			state!.currentStepParts.push({
				type: "error",
				error: timeoutError,
				status: "completed",
			});
			emitError(publisher, timeoutError);
		}

		// Emit error if no valid response
		if (!finalUsage && !state!.aborted && !hasError) {
			const errorPart = state!.currentStepParts.find((p) => p.type === "error");
			if (errorPart && errorPart.type === "error") {
				emitError(publisher, errorPart.error);
			} else {
				emitError(publisher, "API request failed to generate a response.");
			}
		}

		// Update message status
		const finalStatus = state!.aborted ? "abort" : finalUsage ? "completed" : "error";
		await updateMessageStatus(
			assistantMessageId!,
			finalStatus,
			finalFinishReason,
			finalUsage,
			messageRepository,
			publisher,
		);

		await appContext.eventStream.publish(`session-stream:${sessionId}`, {
			type: "message-updated",
			messageId: assistantMessageId,
			message: {
				id: assistantMessageId,
				status: finalStatus,
				usage: finalUsage,
				finishReason: finalFinishReason,
			},
		});

		// Create abort notification if needed
		if (finalStatus === "abort") {
			await createAbortNotificationMessage(sessionId, aiConfig, messageRepository, publisher);
		}

		// Calculate final tokens
		await calculateFinalTokens(
			sessionId,
			sessionRepository,
			messageRepository,
			appContext,
			cwd,
		);

		// Cleanup
		statusManager?.callbacks.onStreamEnd();
		statusManager?.cleanup();
		tokenSubscription?.unsubscribe();

		// Complete stream
		publisher.complete();

		return { success: true, sessionId };
	} catch (error) {
		console.error("[StreamOrchestrator] Error:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		const isAbortError = state?.aborted ?? false;

		if (!isAbortError && publisher!) {
			emitError(publisher, errorMessage);
		}

		// Cleanup
		statusManager?.cleanup();
		tokenSubscription?.unsubscribe();

		if (publisher!) {
			publisher.complete();
		}

		return {
			success: false,
			sessionId: sessionId!,
			error: errorMessage,
		};
	}
}
