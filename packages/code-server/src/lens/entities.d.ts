/**
 * Lens Entity Definitions
 *
 * Defines all data entities for Sylphx Code using new Lens API.
 * Entity names are derived from export keys (e.g., `export const Session` → "Session")
 *
 * Architecture:
 * - Session (1:N) → Message (1:N) → Step (1:N) → Part
 * - Todo (N:1) → Session
 * - StepUsage (1:1) → Step
 */
/**
 * Session - Chat session with AI
 *
 * Contains configuration, metadata, and token tracking.
 * Messages are loaded via relations, not embedded.
 */
export declare const Session: import("@sylphx/lens-core").EntityDef<string, {
    id: import("@sylphx/lens-core").IdType;
    title: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    flags: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("../../../../../lens/packages/core/src/schema/types").JsonType>;
    modelId: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    provider: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    model: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    agentId: import("@sylphx/lens-core").StringType;
    enabledRuleIds: import("../../../../../lens/packages/core/src/schema/types").JsonType;
    enabledToolIds: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("../../../../../lens/packages/core/src/schema/types").JsonType>;
    enabledMcpServerIds: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("../../../../../lens/packages/core/src/schema/types").JsonType>;
    baseContextTokens: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").IntType>;
    totalTokens: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").IntType>;
    messageQueue: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("../../../../../lens/packages/core/src/schema/types").JsonType>;
    nextTodoId: import("@sylphx/lens-core").IntType;
    createdAt: import("@sylphx/lens-core").IntType;
    updatedAt: import("@sylphx/lens-core").IntType;
    lastAccessedAt: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").IntType>;
}>;
/**
 * Message - User or assistant message
 *
 * Container for conversation turns.
 * Steps contain the actual content (text, tool calls, etc.)
 */
export declare const Message: import("@sylphx/lens-core").EntityDef<string, {
    id: import("@sylphx/lens-core").IdType;
    sessionId: import("@sylphx/lens-core").StringType;
    role: import("@sylphx/lens-core").StringType;
    timestamp: import("@sylphx/lens-core").IntType;
    ordering: import("@sylphx/lens-core").IntType;
    finishReason: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    status: import("@sylphx/lens-core").StringType;
}>;
/**
 * Step - Individual AI request/turn within a message
 *
 * Each step = one LLM call.
 * Assistant messages may have multiple steps (tool execution loops).
 */
export declare const Step: import("@sylphx/lens-core").EntityDef<string, {
    id: import("@sylphx/lens-core").IdType;
    messageId: import("@sylphx/lens-core").StringType;
    stepIndex: import("@sylphx/lens-core").IntType;
    systemMessages: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("../../../../../lens/packages/core/src/schema/types").JsonType>;
    provider: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    model: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    duration: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").IntType>;
    finishReason: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    status: import("@sylphx/lens-core").StringType;
    startTime: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").IntType>;
    endTime: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").IntType>;
}>;
/**
 * Part - Content part within a step
 *
 * Types: text, reasoning, tool, error
 * Content structure varies by type (stored as JSON).
 */
export declare const Part: import("@sylphx/lens-core").EntityDef<string, {
    id: import("@sylphx/lens-core").IdType;
    stepId: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    ordering: import("@sylphx/lens-core").IntType;
    type: import("@sylphx/lens-core").StringType;
    content: import("../../../../../lens/packages/core/src/schema/types").JsonType;
}>;
/**
 * StepUsage - Token usage for a step
 *
 * 1:1 relationship with Step.
 * Only assistant steps have usage data.
 */
export declare const StepUsage: import("@sylphx/lens-core").EntityDef<string, {
    stepId: import("@sylphx/lens-core").IdType;
    promptTokens: import("@sylphx/lens-core").IntType;
    completionTokens: import("@sylphx/lens-core").IntType;
    totalTokens: import("@sylphx/lens-core").IntType;
}>;
/**
 * Todo - Session-specific task item
 *
 * Note: id is per-session, not globally unique.
 * Combined primary key: (sessionId, id)
 */
export declare const Todo: import("@sylphx/lens-core").EntityDef<string, {
    id: import("@sylphx/lens-core").IntType;
    sessionId: import("@sylphx/lens-core").StringType;
    content: import("@sylphx/lens-core").StringType;
    activeForm: import("@sylphx/lens-core").StringType;
    status: import("@sylphx/lens-core").StringType;
    ordering: import("@sylphx/lens-core").IntType;
    createdByToolId: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    createdByStepId: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").StringType>;
    relatedFiles: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("../../../../../lens/packages/core/src/schema/types").JsonType>;
    metadata: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("../../../../../lens/packages/core/src/schema/types").JsonType>;
    createdAt: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").IntType>;
    completedAt: import("../../../../../lens/packages/core/src/schema/types").OptionalType<import("@sylphx/lens-core").IntType>;
}>;
//# sourceMappingURL=entities.d.ts.map