/**
 * Lens Query Definitions
 *
 * Queries are read-only operations. They can return single values or streams.
 * All queries support field selection via .select() on client.
 *
 * Streaming queries use async generators - each yield pushes to client.
 */
/**
 * Get session by ID
 */
export declare const getSession: import("@sylphx/lens-core").QueryDef<{
    id: string;
}, {
    id: string;
    agentId: string;
    createdAt: number;
    enabledRuleIds: unknown;
    nextTodoId: number;
    updatedAt: number;
    model?: string | undefined;
    modelId?: string | undefined;
    provider?: string | undefined;
    totalTokens?: number | undefined;
    title?: string | undefined;
    enabledToolIds?: unknown;
    enabledMcpServerIds?: unknown;
    flags?: unknown;
    baseContextTokens?: number | undefined;
    messageQueue?: unknown;
    lastAccessedAt?: number | undefined;
}, unknown>;
/**
 * List all sessions (ordered by updatedAt desc)
 */
export declare const listSessions: import("@sylphx/lens-core").QueryDef<{
    limit?: number | undefined;
    cursor?: number | undefined;
} | undefined, {
    id: string;
    agentId: string;
    createdAt: number;
    enabledRuleIds: unknown;
    nextTodoId: number;
    updatedAt: number;
    model?: string | undefined;
    modelId?: string | undefined;
    provider?: string | undefined;
    totalTokens?: number | undefined;
    title?: string | undefined;
    enabledToolIds?: unknown;
    enabledMcpServerIds?: unknown;
    flags?: unknown;
    baseContextTokens?: number | undefined;
    messageQueue?: unknown;
    lastAccessedAt?: number | undefined;
}[], unknown>;
/**
 * Get last session (for headless mode)
 */
export declare const getLastSession: import("@sylphx/lens-core").QueryDef<void, {
    id: string;
    agentId: string;
    createdAt: number;
    enabledRuleIds: unknown;
    nextTodoId: number;
    updatedAt: number;
    model?: string | undefined;
    modelId?: string | undefined;
    provider?: string | undefined;
    totalTokens?: number | undefined;
    title?: string | undefined;
    enabledToolIds?: unknown;
    enabledMcpServerIds?: unknown;
    flags?: unknown;
    baseContextTokens?: number | undefined;
    messageQueue?: unknown;
    lastAccessedAt?: number | undefined;
}, unknown>;
/**
 * Search sessions by title
 */
export declare const searchSessions: import("@sylphx/lens-core").QueryDef<{
    query: string;
    limit?: number | undefined;
}, {
    id: string;
    agentId: string;
    createdAt: number;
    enabledRuleIds: unknown;
    nextTodoId: number;
    updatedAt: number;
    model?: string | undefined;
    modelId?: string | undefined;
    provider?: string | undefined;
    totalTokens?: number | undefined;
    title?: string | undefined;
    enabledToolIds?: unknown;
    enabledMcpServerIds?: unknown;
    flags?: unknown;
    baseContextTokens?: number | undefined;
    messageQueue?: unknown;
    lastAccessedAt?: number | undefined;
}[], unknown>;
/**
 * Get session count
 */
export declare const getSessionCount: import("@sylphx/lens-core").QueryDef<void, number, unknown>;
/**
 * Get message by ID
 */
export declare const getMessage: import("@sylphx/lens-core").QueryDef<{
    id: string;
}, {
    id: string;
    role: string;
    timestamp: number;
    sessionId: string;
    status: string;
    ordering: number;
    finishReason?: string | undefined;
}, unknown>;
/**
 * List messages for a session
 */
export declare const listMessages: import("@sylphx/lens-core").QueryDef<{
    sessionId: string;
    limit?: number | undefined;
}, {
    id: string;
    role: string;
    timestamp: number;
    sessionId: string;
    status: string;
    ordering: number;
    finishReason?: string | undefined;
}[], unknown>;
/**
 * Get recent user messages (for input history)
 * Returns user messages across all sessions, most recent first
 */
export declare const getRecentUserMessages: import("@sylphx/lens-core").QueryDef<{
    limit?: number | undefined;
} | undefined, {
    text: string;
    files: {
        fileId: string;
        relativePath: string;
        mediaType: string;
        size: number;
    }[];
}[], unknown>;
/**
 * Get step by ID
 */
export declare const getStep: import("@sylphx/lens-core").QueryDef<{
    id: string;
}, {
    id: string;
    status: string;
    stepIndex: number;
    messageId: string;
    duration?: number | undefined;
    model?: string | undefined;
    provider?: string | undefined;
    finishReason?: string | undefined;
    startTime?: number | undefined;
    systemMessages?: unknown;
    endTime?: number | undefined;
}, unknown>;
/**
 * List steps for a message
 */
export declare const listSteps: import("@sylphx/lens-core").QueryDef<{
    messageId: string;
}, {
    id: string;
    status: string;
    stepIndex: number;
    messageId: string;
    duration?: number | undefined;
    model?: string | undefined;
    provider?: string | undefined;
    finishReason?: string | undefined;
    startTime?: number | undefined;
    systemMessages?: unknown;
    endTime?: number | undefined;
}[], unknown>;
/**
 * Get part by ID
 */
export declare const getPart: import("@sylphx/lens-core").QueryDef<{
    id: string;
}, {
    content: unknown;
    id: string;
    type: string;
    ordering: number;
    stepId?: string | undefined;
}, unknown>;
/**
 * List parts for a step
 */
export declare const listParts: import("@sylphx/lens-core").QueryDef<{
    stepId: string;
}, {
    content: unknown;
    id: string;
    type: string;
    ordering: number;
    stepId?: string | undefined;
}[], unknown>;
/**
 * List todos for a session
 */
export declare const listTodos: import("@sylphx/lens-core").QueryDef<{
    sessionId: string;
}, {
    content: string;
    id: number;
    sessionId: string;
    status: string;
    ordering: number;
    activeForm: string;
    metadata?: unknown;
    createdAt?: number | undefined;
    createdByToolId?: string | undefined;
    createdByStepId?: string | undefined;
    relatedFiles?: unknown;
    completedAt?: number | undefined;
}[], unknown>;
/**
 * Subscribe to session updates
 *
 * Uses async generator - yields on every update.
 * Client receives updates in real-time via WebSocket.
 */
export declare const subscribeSession: import("@sylphx/lens-core").QueryDef<{
    id: string;
}, {
    id: string;
    agentId: string;
    createdAt: number;
    enabledRuleIds: unknown;
    nextTodoId: number;
    updatedAt: number;
    model?: string | undefined;
    modelId?: string | undefined;
    provider?: string | undefined;
    totalTokens?: number | undefined;
    title?: string | undefined;
    enabledToolIds?: unknown;
    enabledMcpServerIds?: unknown;
    flags?: unknown;
    baseContextTokens?: number | undefined;
    messageQueue?: unknown;
    lastAccessedAt?: number | undefined;
}, unknown>;
/**
 * Subscribe to session list updates
 *
 * Yields when any session is created, updated, or deleted.
 */
export declare const subscribeSessionList: import("@sylphx/lens-core").QueryDef<void, {
    id: string;
    agentId: string;
    createdAt: number;
    enabledRuleIds: unknown;
    nextTodoId: number;
    updatedAt: number;
    model?: string | undefined;
    modelId?: string | undefined;
    provider?: string | undefined;
    totalTokens?: number | undefined;
    title?: string | undefined;
    enabledToolIds?: unknown;
    enabledMcpServerIds?: unknown;
    flags?: unknown;
    baseContextTokens?: number | undefined;
    messageQueue?: unknown;
    lastAccessedAt?: number | undefined;
}[], unknown>;
/**
 * Subscribe to session streaming events
 *
 * This is used for real-time streaming events (text-delta, tool-call, etc.)
 * Channel: session-stream:${sessionId}
 *
 * Matches tRPC events.subscribeToSession API for client compatibility.
 */
export declare const subscribeToSession: import("@sylphx/lens-core").QueryDef<{
    sessionId: string;
    replayLast: number;
}, {
    id: string;
    cursor: {
        timestamp: number;
        sequence: number;
    };
    channel: string;
    type: string;
    timestamp: number;
    payload: any;
}, unknown>;
/**
 * Load AI config from file system
 */
export declare const loadConfig: import("@sylphx/lens-core").QueryDef<{
    cwd?: string | undefined;
} | undefined, {
    success: boolean;
    config?: any;
    error?: string | undefined;
}, unknown>;
/**
 * Get all available providers
 */
export declare const getProviders: import("@sylphx/lens-core").QueryDef<{
    cwd?: string | undefined;
} | undefined, Record<string | number | symbol, unknown>, unknown>;
/**
 * Get provider config schema
 */
export declare const getProviderSchema: import("@sylphx/lens-core").QueryDef<{
    providerId: string;
}, {
    success: boolean;
    schema?: any[] | undefined;
    error?: string | undefined;
}, unknown>;
/**
 * Fetch models for a provider
 */
export declare const fetchModels: import("@sylphx/lens-core").QueryDef<{
    providerId: string;
    cwd?: string | undefined;
}, {
    success: boolean;
    models?: {
        id: string;
        name: string;
    }[] | undefined;
    error?: string | undefined;
}, unknown>;
/**
 * Scan project files
 */
export declare const scanProjectFiles: import("@sylphx/lens-core").QueryDef<{
    cwd?: string | undefined;
    query?: string | undefined;
} | undefined, {
    files: any[];
}, unknown>;
/**
 * Count tokens for file
 */
export declare const countFileTokens: import("@sylphx/lens-core").QueryDef<{
    filePath: string;
    model?: string | undefined;
}, {
    success: boolean;
    count?: number | undefined;
    error?: string | undefined;
}, unknown>;
/**
 * List all bash processes
 */
export declare const listBash: import("@sylphx/lens-core").QueryDef<void, any[], unknown>;
/**
 * Get bash process info
 */
export declare const getBash: import("@sylphx/lens-core").QueryDef<{
    bashId: string;
}, any, unknown>;
/**
 * Get active bash
 */
export declare const getActiveBash: import("@sylphx/lens-core").QueryDef<void, any, unknown>;
/**
 * Get tokenizer info for a model
 * Returns tokenizer name and status
 */
export declare const getTokenizerInfo: import("@sylphx/lens-core").QueryDef<{
    model: string;
}, {
    name: string;
    modelId: string;
    source: string;
}, unknown>;
/**
 * Get model details (context length, pricing, capabilities, etc.)
 */
export declare const getModelDetails: import("@sylphx/lens-core").QueryDef<{
    providerId: string;
    modelId: string;
    cwd?: string | undefined;
}, {
    success: boolean;
    details?: any;
    error?: string | undefined;
}, unknown>;
//# sourceMappingURL=queries.d.ts.map