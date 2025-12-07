/**
 * Message Router
 * Efficient message operations with lazy loading and streaming support
 * REACTIVE: Emits events for all state changes
 * SECURITY: Protected mutations (OWASP API2) + Rate limiting (OWASP API4)
 */
import { z } from "zod";
declare const StreamEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"session-created">;
    sessionId: z.ZodString;
    provider: z.ZodString;
    model: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-deleted">;
    sessionId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-title-updated">;
    sessionId: z.ZodString;
    title: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-title-updated-start">;
    sessionId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-title-updated-delta">;
    sessionId: z.ZodString;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-title-updated-end">;
    sessionId: z.ZodString;
    title: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-model-updated">;
    sessionId: z.ZodString;
    model: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-provider-updated">;
    sessionId: z.ZodString;
    provider: z.ZodString;
    model: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"assistant-message-created">;
    messageId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"message-status-updated">;
    messageId: z.ZodString;
    status: z.ZodEnum<{
        error: "error";
        active: "active";
        completed: "completed";
        abort: "abort";
    }>;
    usage: z.ZodOptional<z.ZodObject<{
        promptTokens: z.ZodNumber;
        completionTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
    }, z.core.$strip>>;
    finishReason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"text-start">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"text-delta">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"text-end">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning-start">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning-delta">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning-end">;
    duration: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool-call">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    input: z.ZodUnknown;
    startTime: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool-result">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    result: z.ZodUnknown;
    duration: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool-error">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    error: z.ZodString;
    duration: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool-input-start">;
    toolCallId: z.ZodString;
    startTime: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool-input-delta">;
    toolCallId: z.ZodString;
    inputTextDelta: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool-input-end">;
    toolCallId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"ask-question">;
    questionId: z.ZodString;
    questions: z.ZodArray<z.ZodObject<{
        question: z.ZodString;
        header: z.ZodString;
        multiSelect: z.ZodBoolean;
        options: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            description: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"step-start">;
    stepId: z.ZodString;
    stepIndex: z.ZodNumber;
    metadata: z.ZodObject<{
        cpu: z.ZodString;
        memory: z.ZodString;
    }, z.core.$strip>;
    todoSnapshot: z.ZodArray<z.ZodUnknown>;
    systemMessages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        content: z.ZodString;
        timestamp: z.ZodNumber;
    }, z.core.$strip>>>;
    provider: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"step-complete">;
    stepId: z.ZodString;
    usage: z.ZodObject<{
        promptTokens: z.ZodNumber;
        completionTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
    }, z.core.$strip>;
    duration: z.ZodNumber;
    finishReason: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"user-message-created">;
    messageId: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"system-message-created">;
    messageId: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"complete">;
    usage: z.ZodOptional<z.ZodObject<{
        promptTokens: z.ZodNumber;
        completionTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
    }, z.core.$strip>>;
    finishReason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"queue-message-added">;
    sessionId: z.ZodString;
    message: z.ZodObject<{
        id: z.ZodString;
        content: z.ZodString;
        attachments: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            relativePath: z.ZodString;
            size: z.ZodOptional<z.ZodNumber>;
            mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        enqueuedAt: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"queue-message-updated">;
    sessionId: z.ZodString;
    message: z.ZodObject<{
        id: z.ZodString;
        content: z.ZodString;
        attachments: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            relativePath: z.ZodString;
            size: z.ZodOptional<z.ZodNumber>;
            mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        enqueuedAt: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"queue-message-removed">;
    sessionId: z.ZodString;
    messageId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"queue-cleared">;
    sessionId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"file">;
    mediaType: z.ZodString;
    base64: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    error: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"abort">;
}, z.core.$strip>], "type">;
export type StreamEvent = z.infer<typeof StreamEventSchema>;
/**
 * Session Event Type
 * Alias for StreamEvent with semantic naming
 * Used by message.subscribe() for strongly-typed session event subscriptions
 */
export type SessionEvent = StreamEvent;
export declare const messageRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Get message count for session
     * EFFICIENT: Count only, no data loading
     */
    getCount: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sessionId: string;
        };
        output: number;
        meta: object;
    }>;
    /**
     * Add message to session
     * Used for both user messages and assistant messages
     * AUTO-CREATE: If sessionId is null, creates new session with provider/model
     * REACTIVE: Emits message-added event (and session-created if new)
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    add: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            role: "user" | "assistant";
            content: ({
                type: "text";
                content: string;
            } | {
                type: "tool-use";
                toolUseId: string;
                toolName: string;
                toolInput: unknown;
            } | {
                type: "tool-result";
                toolUseId: string;
                toolName: string;
                content: string;
                isError?: boolean | undefined;
            } | {
                type: "reasoning";
                reasoning: string;
            })[];
            sessionId?: string | null | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            agentId?: string | undefined;
            attachments?: {
                path: string;
                relativePath: string;
                size?: number | undefined;
                mimeType?: string | undefined;
            }[] | undefined;
            usage?: {
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
            } | undefined;
            finishReason?: string | undefined;
            metadata?: {
                agentId?: string | undefined;
                ruleIds?: string[] | undefined;
                isCommandExecution?: boolean | undefined;
            } | undefined;
            todoSnapshot?: {
                id: number;
                content: string;
                activeForm: string;
                status: "completed" | "pending" | "in_progress";
                ordering: number;
            }[] | undefined;
            status?: "error" | "active" | "completed" | "abort" | undefined;
        };
        output: {
            messageId: string;
            sessionId: string;
        };
        meta: object;
    }>;
    /**
     * Update message parts (during streaming)
     * Replaces all parts atomically
     * REACTIVE: Emits message-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateParts: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            messageId: string;
            parts: ({
                type: "text";
                content: string;
            } | {
                type: "tool-use";
                toolUseId: string;
                toolName: string;
                toolInput: unknown;
            } | {
                type: "tool-result";
                toolUseId: string;
                toolName: string;
                content: string;
                isError?: boolean | undefined;
            } | {
                type: "reasoning";
                reasoning: string;
            })[];
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update message status
     * Used when streaming completes/aborts
     * REACTIVE: Emits message-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateStatus: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            messageId: string;
            status: "error" | "active" | "completed" | "abort";
            finishReason?: string | undefined;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Update message usage
     * Used when streaming completes with token counts
     * REACTIVE: Emits message-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateUsage: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            messageId: string;
            usage: {
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
            };
        };
        output: void;
        meta: object;
    }>;
    /**
     * Get recent user messages for command history (cursor-based pagination)
     * DATA ON DEMAND: Returns paginated results, not all messages at once
     * CURSOR-BASED PAGINATION: Efficient for large message history
     * INDEXED: Uses efficient database query with role index
     */
    getRecentUserMessages: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            cursor?: number | undefined;
        };
        output: {
            messages: Array<{
                text: string;
                files: Array<{
                    fileId: string;
                    relativePath: string;
                    mediaType: string;
                    size: number;
                }>;
            }>;
            nextCursor: number | null;
        };
        meta: object;
    }>;
    /**
     * Answer Ask tool question
     * Called by client when user answers Ask tool question
     * Resolves pending Ask tool Promise on server
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    answerAsk: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            toolCallId: string;
            answer: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    /**
     * Trigger AI streaming (MUTATION - Single Event Stream Architecture)
     *
     * This mutation triggers server-side AI streaming and returns immediately.
     * All events (user-message-created, assistant-message-created, text-delta,
     * reasoning-delta, complete, error, etc.) are published to event bus.
     *
     * Client receives events via useEventStream subscription (unified path).
     *
     * Architecture:
     * 1. Client calls mutation → Returns immediately with success
     * 2. Server streams in background → Publishes all events to event bus
     * 3. Client's useEventStream subscription → Receives and handles events
     *
     * Benefits:
     * - Single event path (no dual subscription/event stream)
     * - Clean separation: mutation triggers, event stream delivers
     * - Supports replay, multi-client, late join
     *
     * SECURITY: Protected + streaming rate limiting (5 streams/min)
     */
    triggerStream: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            content: ({
                type: "text";
                content: string;
            } | {
                type: "file";
                fileId: string;
                relativePath: string;
                size: number;
                mimeType: string;
            })[];
            sessionId?: string | null | undefined;
            agentId?: string | undefined;
            provider?: string | undefined;
            model?: string | undefined;
        };
        output: {
            success: boolean;
            sessionId: string;
            queued: boolean;
        } | {
            success: boolean;
            sessionId: string;
            queued?: undefined;
        };
        meta: object;
    }>;
    /**
     * Abort active stream for a session
     *
     * Allows client to abort server-side streaming in progress.
     * - Aborts the AI SDK stream generation
     * - Stops any pending tool executions
     * - Marks active message parts as 'abort' status
     *
     * SECURITY: Protected (user can only abort their own sessions)
     */
    abortStream: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
        };
        output: {
            success: boolean;
            message: string;
        };
        meta: object;
    }>;
    /**
     * Subscribe to session events (SUBSCRIPTION - Strongly Typed)
     *
     * Subscribe to strongly-typed session events with replay support.
     * Receives all streaming events for a specific session.
     *
     * Architecture:
     * - Client calls triggerStream mutation to start streaming
     * - Client subscribes to session events (this endpoint)
     * - Server publishes events to session:{id} channel
     * - Client receives strongly-typed SessionEvent (not StoredEvent wrapper)
     *
     * Usage:
     * ```ts
     * // Trigger streaming
     * await client.message.triggerStream.mutate({ sessionId: 'abc123', content: [...] });
     *
     * // Subscribe to events
     * client.message.subscribe.subscribe(
     *   { sessionId: 'abc123', replayLast: 10 },
     *   {
     *     onData: (event: SessionEvent) => {
     *       // Strongly typed, no need to unwrap payload
     *       if (event.type === 'text-delta') {
     *         console.log(event.text);
     *       }
     *     },
     *     onError: (error) => console.error(error),
     *   }
     * );
     * ```
     *
     * Benefits:
     * - Strongly typed SessionEvent (not any)
     * - No StoredEvent wrapper to unwrap
     * - IDE autocomplete for event types
     * - Clean separation: mutation triggers, subscription receives
     *
     * Transport:
     * - TUI: In-process observable (zero overhead)
     * - Web: SSE (httpSubscriptionLink)
     *
     * SECURITY: Protected + streaming rate limiting (5 streams/min)
     */
    subscribe: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
        input: {
            sessionId: string;
            replayLast?: number | undefined;
        };
        output: {
            type: "session-created";
            sessionId: string;
            provider: string;
            model: string;
        } | {
            type: "session-deleted";
            sessionId: string;
        } | {
            type: "session-title-updated";
            sessionId: string;
            title: string;
        } | {
            type: "session-title-updated-start";
            sessionId: string;
        } | {
            type: "session-title-updated-delta";
            sessionId: string;
            text: string;
        } | {
            type: "session-title-updated-end";
            sessionId: string;
            title: string;
        } | {
            type: "session-model-updated";
            sessionId: string;
            model: string;
        } | {
            type: "session-provider-updated";
            sessionId: string;
            provider: string;
            model: string;
        } | {
            type: "assistant-message-created";
            messageId: string;
        } | {
            type: "message-status-updated";
            messageId: string;
            status: "error" | "active" | "completed" | "abort";
            usage?: {
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
            } | undefined;
            finishReason?: string | undefined;
        } | {
            type: "text-start";
        } | {
            type: "text-delta";
            text: string;
        } | {
            type: "text-end";
        } | {
            type: "reasoning-start";
        } | {
            type: "reasoning-delta";
            text: string;
        } | {
            type: "reasoning-end";
            duration: number;
        } | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            input: unknown;
            startTime: number;
        } | {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            result: unknown;
            duration: number;
        } | {
            type: "tool-error";
            toolCallId: string;
            toolName: string;
            error: string;
            duration: number;
        } | {
            type: "tool-input-start";
            toolCallId: string;
            startTime: number;
        } | {
            type: "tool-input-delta";
            toolCallId: string;
            inputTextDelta: string;
        } | {
            type: "tool-input-end";
            toolCallId: string;
        } | {
            type: "ask-question";
            questionId: string;
            questions: {
                question: string;
                header: string;
                multiSelect: boolean;
                options: {
                    label: string;
                    description: string;
                }[];
            }[];
        } | {
            type: "step-start";
            stepId: string;
            stepIndex: number;
            metadata: {
                cpu: string;
                memory: string;
            };
            todoSnapshot: unknown[];
            systemMessages?: {
                type: string;
                content: string;
                timestamp: number;
            }[] | undefined;
            provider?: string | undefined;
            model?: string | undefined;
        } | {
            type: "step-complete";
            stepId: string;
            usage: {
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
            };
            duration: number;
            finishReason: string;
        } | {
            type: "user-message-created";
            messageId: string;
            content: string;
        } | {
            type: "system-message-created";
            messageId: string;
            content: string;
        } | {
            type: "complete";
            usage?: {
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
            } | undefined;
            finishReason?: string | undefined;
        } | {
            type: "queue-message-added";
            sessionId: string;
            message: {
                id: string;
                content: string;
                attachments: {
                    path: string;
                    relativePath: string;
                    size?: number | undefined;
                    mimeType?: string | undefined;
                }[];
                enqueuedAt: number;
            };
        } | {
            type: "queue-message-updated";
            sessionId: string;
            message: {
                id: string;
                content: string;
                attachments: {
                    path: string;
                    relativePath: string;
                    size?: number | undefined;
                    mimeType?: string | undefined;
                }[];
                enqueuedAt: number;
            };
        } | {
            type: "queue-message-removed";
            sessionId: string;
            messageId: string;
        } | {
            type: "queue-cleared";
            sessionId: string;
        } | {
            type: "file";
            mediaType: string;
            base64: string;
        } | {
            type: "error";
            error: string;
        } | {
            type: "abort";
        };
        meta: object;
    }>;
    /**
     * Enqueue message - Add message to session queue
     * Used when user submits message while AI is streaming
     * REACTIVE: Emits queue-message-added event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    enqueueMessage: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            content: string;
            attachments?: {
                path: string;
                relativePath: string;
                size?: number | undefined;
                mimeType?: string | undefined;
            }[] | undefined;
        };
        output: {
            id: string;
            content: string;
            attachments: Array<{
                path: string;
                relativePath: string;
                size: number;
                mimeType?: string;
            }>;
            enqueuedAt: number;
        };
        meta: object;
    }>;
    /**
     * Dequeue message - Get and remove next message from queue
     * REACTIVE: Emits queue-message-removed event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    dequeueMessage: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
        };
        output: {
            id: string;
            content: string;
            attachments: Array<{
                path: string;
                relativePath: string;
                size: number;
                mimeType?: string;
            }>;
            enqueuedAt: number;
        } | null;
        meta: object;
    }>;
    /**
     * Get queued messages - Get all queued messages for display
     * SECURITY: Public procedure (read-only)
     */
    getQueuedMessages: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            sessionId: string;
        };
        output: {
            id: string;
            content: string;
            attachments: Array<{
                path: string;
                relativePath: string;
                size: number;
                mimeType?: string;
            }>;
            enqueuedAt: number;
        }[];
        meta: object;
    }>;
    /**
     * Update queued message - Update content/attachments of specific queued message
     * Used when user edits queued message via UP arrow browsing
     * REACTIVE: Emits queue-message-updated event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    updateQueuedMessage: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            messageId: string;
            content: string;
            attachments?: {
                path: string;
                relativePath: string;
                size?: number | undefined;
                mimeType?: string | undefined;
            }[] | undefined;
        };
        output: {
            id: string;
            content: string;
            attachments: Array<{
                path: string;
                relativePath: string;
                size: number;
                mimeType?: string;
            }>;
            enqueuedAt: number;
        };
        meta: object;
    }>;
    /**
     * Clear queue - Remove all queued messages
     * REACTIVE: Emits queue-cleared event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    clearQueue: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
        };
        output: void;
        meta: object;
    }>;
    /**
     * Remove queued message - Remove specific message from queue
     * REACTIVE: Emits queue-message-removed event
     * SECURITY: Protected + moderate rate limiting (30 req/min)
     */
    removeQueuedMessage: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            sessionId: string;
            messageId: string;
        };
        output: void;
        meta: object;
    }>;
}>>;
export {};
//# sourceMappingURL=message.router.d.ts.map