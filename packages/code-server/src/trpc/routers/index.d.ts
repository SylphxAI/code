/**
 * Root App Router
 * Combines all domain routers into a single tRPC router
 */
/**
 * Main application router
 * Namespaced by domain for clarity
 */
export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    session: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getRecent: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
                cursor?: number | undefined;
            };
            output: any;
            meta: object;
        }>;
        getById: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: {
                modelStatus: "unknown" | "available" | "unavailable";
                id: string;
                title?: string;
                modelId: string;
                agentId: string;
                enabledRuleIds: string[];
                enabledToolIds?: string[];
                enabledMcpServerIds?: string[];
                messages: import("@sylphx/code-core").SessionMessage[];
                todos: import("@sylphx/code-core").Todo[];
                nextTodoId: number;
                flags?: Record<string, boolean>;
                baseContextTokens?: number;
                totalTokens?: number;
                status?: import("@sylphx/code-core").SessionStatus;
                created: number;
                updated: number;
                provider?: import("@sylphx/code-core").ProviderId;
                model?: string;
            } | null;
            meta: object;
        }>;
        getCount: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: any;
            meta: object;
        }>;
        getLast: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: any;
            meta: object;
        }>;
        search: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                limit?: number | undefined;
                cursor?: number | undefined;
            };
            output: any;
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                provider: string;
                model: string;
                agentId?: string | undefined;
                enabledRuleIds?: string[] | undefined;
            };
            output: {
                id: `${string}-${string}-${string}-${string}-${string}`;
                title: string;
                agentId: string;
                provider: string | undefined;
                model: string | undefined;
                enabledRuleIds: never[];
                nextTodoId: number;
                createdAt: number;
                updatedAt: number;
            };
            meta: object;
        }>;
        updateTitle: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                title: string;
            };
            output: void;
            meta: object;
        }>;
        updateModel: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                model: string;
            };
            output: void;
            meta: object;
        }>;
        updateProvider: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                provider: string;
            };
            output: void;
            meta: object;
        }>;
        updateRules: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                enabledRuleIds: string[];
            };
            output: void;
            meta: object;
        }>;
        updateAgent: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                agentId: string;
            };
            output: void;
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
            };
            output: void;
            meta: object;
        }>;
        compact: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
        getContextInfo: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: {
                totalTokens: number;
                baseContextTokens: number;
            };
            meta: object;
        }>;
        getTotalTokens: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: any;
            meta: object;
        }>;
    }>>;
    message: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getCount: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                sessionId: string;
            };
            output: number;
            meta: object;
        }>;
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
        updateStatus: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                messageId: string;
                status: "error" | "active" | "completed" | "abort";
                finishReason?: string | undefined;
            };
            output: void;
            meta: object;
        }>;
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
        clearQueue: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
            };
            output: void;
            meta: object;
        }>;
        removeQueuedMessage: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                messageId: string;
            };
            output: void;
            meta: object;
        }>;
    }>>;
    todo: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                sessionId: string;
                todos: {
                    id: number;
                    content: string;
                    activeForm: string;
                    status: "completed" | "pending" | "in_progress";
                    ordering: number;
                }[];
                nextTodoId: number;
            };
            output: void;
            meta: object;
        }>;
    }>>;
    config: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        load: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                cwd?: string | undefined;
            };
            output: {
                success: true;
                config: any;
            };
            meta: object;
        }>;
        updateDefaultProvider: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                provider: string;
                cwd?: string | undefined;
            };
            output: {
                success: false;
                error: string;
            } | {
                success: true;
                error?: undefined;
            };
            meta: object;
        }>;
        updateDefaultModel: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                model: string;
                cwd?: string | undefined;
            };
            output: {
                success: false;
                error: string;
            } | {
                success: true;
                error?: undefined;
            };
            meta: object;
        }>;
        updateProviderConfig: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                providerId: string;
                config: Record<any, unknown>;
                cwd?: string | undefined;
            };
            output: {
                success: false;
                error: string;
            } | {
                success: true;
                error?: undefined;
            };
            meta: object;
        }>;
        setProviderSecret: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                providerId: string;
                fieldName: string;
                value: string;
                cwd?: string | undefined;
            };
            output: {
                success: false;
                error: string;
            } | {
                success: true;
                error?: undefined;
            };
            meta: object;
        }>;
        removeProvider: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                providerId: string;
                cwd?: string | undefined;
            };
            output: {
                success: false;
                error: string;
            } | {
                success: true;
                error?: undefined;
            };
            meta: object;
        }>;
        save: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                config: {
                    defaultProvider?: string | undefined;
                    defaultEnabledRuleIds?: string[] | undefined;
                    defaultAgentId?: string | undefined;
                    providers?: Record<string, {
                        [x: string]: unknown;
                        defaultModel?: string | undefined;
                    }> | undefined;
                };
                cwd?: string | undefined;
            };
            output: {
                success: true;
                error?: undefined;
            } | {
                success: false;
                error: string;
            };
            meta: object;
        }>;
        getPaths: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                cwd?: string | undefined;
            };
            output: {
                global: string;
                project: string;
                local: string;
                legacy: string;
            };
            meta: object;
        }>;
        getProviders: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                cwd?: string | undefined;
            } | undefined;
            output: Record<string, {
                id: string;
                name: string;
                description: string;
                isConfigured: boolean;
            }>;
            meta: object;
        }>;
        getProviderSchema: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                providerId: string;
            };
            output: {
                success: true;
                schema: import("../../../../code-core/src/ai/providers/base-provider.js").ConfigField[];
                error?: undefined;
            } | {
                success: false;
                error: string;
                schema?: undefined;
            };
            meta: object;
        }>;
        getTokenizerInfo: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                model: string;
            };
            output: {
                modelName: string;
                tokenizerName: string;
                loaded: boolean;
                failed: boolean;
            } | null;
            meta: object;
        }>;
        countTokens: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                text: string;
                model?: string | undefined;
            };
            output: {
                count: number;
            };
            meta: object;
        }>;
        countFileTokens: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                filePath: string;
                model?: string | undefined;
            };
            output: {
                success: true;
                count: number;
                error?: undefined;
            } | {
                success: false;
                error: string;
                count?: undefined;
            };
            meta: object;
        }>;
        scanProjectFiles: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                cwd?: string | undefined;
                query?: string | undefined;
            };
            output: {
                files: import("@sylphx/code-core").FileInfo[];
            };
            meta: object;
        }>;
        updateRules: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                ruleIds: string[];
                sessionId?: string | undefined;
                cwd?: string | undefined;
            };
            output: {
                success: true;
                scope: "session";
                error?: undefined;
            } | {
                success: false;
                error: string;
                scope?: undefined;
            } | {
                success: true;
                scope: "global";
                error?: undefined;
            };
            meta: object;
        }>;
        getModelDetails: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                providerId: string;
                modelId: string;
                cwd?: string | undefined;
            };
            output: {
                success: true;
                details: {
                    capabilities: import("../../../../code-core/src/ai/providers/base-provider.js").ModelCapabilities;
                    contextLength?: number;
                    maxOutput?: number;
                    inputPrice?: number;
                    outputPrice?: number;
                    supportedFeatures?: string[];
                };
                error?: undefined;
            } | {
                success: false;
                error: string;
                details?: undefined;
            };
            meta: object;
        }>;
        fetchModels: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                providerId: string;
                cwd?: string | undefined;
            };
            output: {
                success: false;
                error: string;
                models?: undefined;
            } | {
                success: true;
                models: {
                    id: string;
                    name: string;
                }[];
                error?: undefined;
            };
            meta: object;
        }>;
    }>>;
    admin: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        deleteAllSessions: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                confirm: true;
            };
            output: {
                success: boolean;
                deletedCount: number;
                message: string;
            };
            meta: object;
        }>;
        getSystemStats: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                sessions: {
                    total: number;
                    avgMessagesPerSession: number;
                };
                messages: {
                    total: number;
                };
                config: {
                    providers: string[];
                    defaultProvider: any;
                    defaultModel: any;
                };
            };
            meta: object;
        }>;
        getHealth: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                status: string;
                timestamp: number;
                uptime: number;
                memory: {
                    used: number;
                    total: number;
                };
            };
            meta: object;
        }>;
        forceGC: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                success: boolean;
                message: string;
            };
            meta: object;
        }>;
        getAPIInventory: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: import("../../utils/api-inventory.js").APIInventory;
            meta: object;
        }>;
        getAPIDocs: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                format?: "json" | "markdown" | undefined;
            };
            output: string | import("../../utils/api-inventory.js").APIInventory;
            meta: object;
        }>;
    }>>;
    events: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        subscribe: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
            input: {
                channel: string;
                fromCursor?: {
                    timestamp: number;
                    sequence: number;
                } | undefined;
            };
            output: import("../../services/event-persistence.service.js").StoredEvent<any>;
            meta: object;
        }>;
        subscribeToSession: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
            input: {
                sessionId: string;
                replayLast?: number | undefined;
            };
            output: import("../../services/event-persistence.service.js").StoredEvent<any>;
            meta: object;
        }>;
        subscribeToAllSessions: import("@trpc/server/unstable-core-do-not-import").LegacyObservableSubscriptionProcedure<{
            input: {
                replayLast?: number | undefined;
            };
            output: import("../../services/event-persistence.service.js").StoredEvent<any>;
            meta: object;
        }>;
        getChannelInfo: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                channel: string;
            };
            output: {
                inMemoryCount: number;
                persistedCount?: number;
                firstId?: string | null;
                lastId?: string | null;
            };
            meta: object;
        }>;
        cleanupChannel: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                channel: string;
                keepLast?: number | undefined;
            };
            output: {
                success: boolean;
            };
            meta: object;
        }>;
    }>>;
    file: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        upload: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                relativePath: string;
                mediaType: string;
                size: number;
                content: string;
            };
            output: {
                fileId: string;
                sha256: string;
                url: string;
            };
            meta: object;
        }>;
        download: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                fileId: string;
            };
            output: {
                fileId: string;
                relativePath: string;
                mediaType: string;
                size: number;
                content: string;
                sha256: string;
                createdAt: number;
            };
            meta: object;
        }>;
        getMetadata: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                fileId: string;
            };
            output: {
                fileId: string;
                relativePath: string;
                mediaType: string;
                size: number;
                sha256: string;
                createdAt: number;
            };
            meta: object;
        }>;
    }>>;
    bash: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../context.js").Context;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        execute: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                command: string;
                mode?: "active" | "background" | undefined;
                cwd?: string | undefined;
                timeout?: number | undefined;
            };
            output: {
                bashId: string;
                command: string;
                mode: "active" | "background";
            };
            meta: object;
        }>;
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                command: string;
                mode: import("@sylphx/code-core").BashMode;
                status: import("@sylphx/code-core").BashStatus;
                isActive: boolean;
                duration: number;
                exitCode: number | null;
                cwd: string;
            }[];
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                bashId: string;
            };
            output: {
                id: string;
                command: string;
                mode: import("@sylphx/code-core").BashMode;
                status: import("@sylphx/code-core").BashStatus;
                isActive: boolean;
                startTime: number;
                endTime: number | null;
                exitCode: number | null;
                cwd: string;
                duration: number;
                stdout: string;
                stderr: string;
            };
            meta: object;
        }>;
        kill: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                bashId: string;
            };
            output: {
                success: boolean;
                bashId: string;
            };
            meta: object;
        }>;
        demote: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                bashId: string;
            };
            output: {
                success: boolean;
                bashId: string;
                mode: string;
            };
            meta: object;
        }>;
        promote: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                bashId: string;
            };
            output: {
                success: boolean;
                bashId: string;
                mode: string;
            };
            meta: object;
        }>;
        getActive: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                command: string;
                mode: import("@sylphx/code-core").BashMode;
                status: import("@sylphx/code-core").BashStatus;
                startTime: number;
                cwd: string;
                duration: number;
            } | null;
            meta: object;
        }>;
        getActiveQueueLength: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                count: number;
            };
            meta: object;
        }>;
    }>>;
}>>;
/**
 * Export type for client-side type safety
 */
export type AppRouter = typeof appRouter;
//# sourceMappingURL=index.d.ts.map