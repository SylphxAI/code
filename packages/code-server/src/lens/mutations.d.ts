/**
 * Lens Mutation Definitions
 *
 * Mutations are write operations. Key features:
 * - Auto-optimistic from naming convention (createX, updateX, deleteX)
 * - Streaming via async generators (yield updates to client)
 * - Type-safe input validation with Zod
 *
 * The sendMessage mutation is the core of AI interaction:
 * 1. Creates user message
 * 2. Creates assistant message placeholder
 * 3. Streams AI response (each yield pushes to client)
 * 4. Handles tool calls, errors, abort
 */
/**
 * Create a new session
 *
 * Auto-optimistic: "createSession" → 'create' strategy
 * Client immediately sees new session, server confirms.
 */
export declare const createSession: import("@sylphx/lens-core").MutationDef<{
    title?: string | undefined;
    agentId?: string | undefined;
    modelId?: string | undefined;
    provider?: string | undefined;
    model?: string | undefined;
    enabledRuleIds?: string[] | undefined;
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
 * Update session
 *
 * Auto-optimistic: "updateSession" → 'merge' strategy
 * Client immediately sees changes, server confirms.
 */
export declare const updateSession: import("@sylphx/lens-core").MutationDef<{
    id: string;
    title?: string | undefined;
    agentId?: string | undefined;
    modelId?: string | undefined;
    provider?: string | undefined;
    model?: string | undefined;
    enabledRuleIds?: string[] | undefined;
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
 * Delete session
 *
 * Auto-optimistic: "deleteSession" → 'delete' strategy
 * Client immediately removes session, server confirms.
 */
export declare const deleteSession: import("@sylphx/lens-core").MutationDef<{
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
 * Send message and stream AI response
 *
 * This is the main mutation for AI interaction.
 * Uses async generator for real-time streaming:
 *
 * 1. Create user message
 * 2. Create assistant message placeholder
 * 3. Yield initial state (optimistic confirmed)
 * 4. Stream AI response - yield on every update
 * 5. Handle tool calls, errors, abort
 *
 * Client subscribes and receives updates in real-time:
 * ```typescript
 * api.mutations.sendMessage(input).subscribe(({ assistantMessage }) => {
 *   // Called on every yield - content updates in real-time!
 *   console.log(assistantMessage.steps[0].parts)
 * })
 * ```
 */
export declare const sendMessage: import("@sylphx/lens-core").MutationDef<{
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
}, {
    session: unknown;
    userMessage: unknown;
    assistantMessage: unknown;
}, unknown>;
/**
 * Abort current stream
 */
export declare const abortStream: import("@sylphx/lens-core").MutationDef<{
    sessionId: string;
}, {
    success: boolean;
}, unknown>;
/**
 * Create todo
 */
export declare const createTodo: import("@sylphx/lens-core").MutationDef<{
    sessionId: string;
    content: string;
    activeForm: string;
    status?: "completed" | "pending" | "in_progress" | undefined;
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
}, unknown>;
/**
 * Update todo
 */
export declare const updateTodo: import("@sylphx/lens-core").MutationDef<{
    sessionId: string;
    id: number;
    content?: string | undefined;
    activeForm?: string | undefined;
    status?: "completed" | "pending" | "in_progress" | undefined;
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
}, unknown>;
/**
 * Delete todo
 */
export declare const deleteTodo: import("@sylphx/lens-core").MutationDef<{
    sessionId: string;
    id: number;
}, {
    success: boolean;
}, unknown>;
/**
 * Batch update todos (for todo list sync)
 */
export declare const syncTodos: import("@sylphx/lens-core").MutationDef<{
    sessionId: string;
    todos: {
        content: string;
        activeForm: string;
        status: "completed" | "pending" | "in_progress";
        id?: number | undefined;
    }[];
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
 * Save AI config
 */
export declare const saveConfig: import("@sylphx/lens-core").MutationDef<{
    config: any;
    cwd?: string | undefined;
}, {
    success: boolean;
    error?: string | undefined;
}, unknown>;
/**
 * Set provider secret (API key)
 */
export declare const setProviderSecret: import("@sylphx/lens-core").MutationDef<{
    providerId: string;
    fieldName: string;
    value: string;
    cwd?: string | undefined;
}, {
    success: boolean;
    error?: string | undefined;
}, unknown>;
/**
 * Execute bash command
 */
export declare const executeBash: import("@sylphx/lens-core").MutationDef<{
    command: string;
    mode?: "active" | "background" | undefined;
    cwd?: string | undefined;
    timeout?: number | undefined;
}, {
    bashId: string;
    command: string;
    mode: string;
}, unknown>;
/**
 * Kill bash process
 */
export declare const killBash: import("@sylphx/lens-core").MutationDef<{
    bashId: string;
}, {
    success: boolean;
    bashId: string;
}, unknown>;
/**
 * Demote active bash to background
 */
export declare const demoteBash: import("@sylphx/lens-core").MutationDef<{
    bashId: string;
}, {
    success: boolean;
    bashId: string;
    mode: string;
}, unknown>;
/**
 * Promote background bash to active
 */
export declare const promoteBash: import("@sylphx/lens-core").MutationDef<{
    bashId: string;
}, {
    success: boolean;
    bashId: string;
    mode: string;
}, unknown>;
/**
 * Upload file
 */
export declare const uploadFile: import("@sylphx/lens-core").MutationDef<{
    relativePath: string;
    mediaType: string;
    size: number;
    content: string;
}, {
    fileId: string;
}, unknown>;
/**
 * Answer an ask request (user confirmation)
 */
export declare const answerAsk: import("@sylphx/lens-core").MutationDef<{
    sessionId: string;
    messageId: string;
    answer: "never" | "always" | "yes" | "no";
}, {
    success: boolean;
}, unknown>;
/**
 * Trigger AI streaming
 *
 * This mutation starts server-side AI streaming and returns immediately.
 * All events are published to event bus - client subscribes via useEventStream.
 *
 * tRPC-compatible interface for existing client code.
 */
export declare const triggerStream: import("@sylphx/lens-core").MutationDef<{
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
}, {
    success: boolean;
    sessionId: string;
    queued?: boolean | undefined;
}, unknown>;
//# sourceMappingURL=mutations.d.ts.map