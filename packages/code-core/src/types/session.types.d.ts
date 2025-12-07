/**
 * Session Types
 * Unified session and message types used across TUI and headless modes
 */
import type { ProviderId } from "../config/ai-config.js";
import type { SessionStatus } from "./streaming-events.types.js";
import type { Todo } from "./todo.types.js";
/**
 * Message Part - unified type for all content parts
 *
 * ALL parts have status field to track their lifecycle state:
 * - 'active': Being generated/processed
 * - 'completed': Successfully finished
 * - 'error': Failed with error
 * - 'abort': User cancelled
 *
 * Design: No separate "StreamingPart" type needed
 * - Streaming parts ARE message parts
 * - Status field tracks state during and after streaming
 * - No conversion required between streaming/stored formats
 *
 * Multiple parts can be active simultaneously (parallel tool calls).
 */
export type MessagePart = {
    type: "text";
    content: string;
    status: "active" | "completed" | "error" | "abort";
} | {
    type: "reasoning";
    content: string;
    status: "active" | "completed" | "error" | "abort";
    duration?: number;
    startTime?: number;
} | {
    type: "tool";
    toolId: string;
    name: string;
    mcpServerId?: string;
    status: "active" | "completed" | "error" | "abort";
    input?: unknown;
    result?: unknown;
    error?: string;
    duration?: number;
    startTime?: number;
} | {
    type: "file";
    relativePath: string;
    size: number;
    mediaType: string;
    base64: string;
    status: "completed";
} | {
    type: "file-ref";
    fileContentId: string;
    relativePath: string;
    size: number;
    mediaType: string;
    status: "completed";
} | {
    type: "system-message";
    content: string;
    messageType: string;
    timestamp: number;
    status: "completed";
} | {
    type: "error";
    error: string;
    status: "completed";
};
/**
 * Legacy type alias for backwards compatibility
 * @deprecated Use MessagePart directly
 */
export type StreamingPart = MessagePart;
/**
 * Message Step - represents one reasoning/generation cycle (ONE REQUEST)
 *
 * Design: Step = Request/Turn, not just content grouping
 * ======================================================
 *
 * CRITICAL: Step represents ONE AI call at ONE point in time
 * - Has its own timestamp → its own system status (cpu, memory)
 * - Has its own cost → usage, provider, model, duration
 *
 * Why steps have metadata:
 * 1. Step = request at specific time → captures system status at that moment
 * 2. Multi-step execution → step 0 may have different CPU/memory than step 1
 *
 * Note: todoSnapshot REMOVED for performance
 * - Original design: Each step stored todos (step 0 sees [A,B], step 1 sees [A,B,C])
 * - Problem: 100+ steps per message × todos = excessive storage
 * - Current: Todos managed at session level only (session.todos)
 * - See: TODOSNAPSHOT-REALITY.md
 *
 * Example multi-step flow:
 * Step 0 (t=0) at 10:00:00
 *   → Tool calls to read files
 * Step 1 (t=5s) at 10:00:05
 *   → Process tool results, generate response
 *
 * Step lifecycle:
 * - status: 'active' → generating this step
 * - status: 'completed' → step finished successfully
 * - status: 'error' → step failed
 * - status: 'abort' → user cancelled
 *
 * Step boundaries (when to start new step):
 * - finishReason === 'tool-calls' → automatic new step for processing tool results
 * - finishReason === 'stop' → end of message, no new step
 * - finishReason === 'length' → token limit, may continue in new step
 */
export interface MessageStep {
    id: string;
    stepIndex: number;
    parts: MessagePart[];
    systemMessages?: SystemMessage[];
    usage?: TokenUsage;
    provider?: string;
    model?: string;
    duration?: number;
    finishReason?: "stop" | "tool-calls" | "length" | "error";
    status: "active" | "completed" | "error" | "abort";
    startTime?: number;
    endTime?: number;
}
/**
 * File attachment input (from frontend)
 * REFACTORED: Files uploaded immediately on paste/select, referenced by fileId
 *
 * Correct Flow (ChatGPT-style):
 * 1. User pastes/selects file → Frontend uploads immediately to /file/upload
 * 2. Server returns { fileId, url } → Frontend stores fileId + metadata
 * 3. User submits message → Send fileId (NOT content!)
 * 4. Other clients fetch file on-demand via /file/download?fileId=xxx
 */
export interface FileAttachmentInput {
    fileId: string;
    relativePath: string;
    size: number;
    mimeType: string;
    type?: "file" | "image";
}
/**
 * @deprecated Use FileAttachmentInput for new code
 * Legacy type kept for backwards compatibility
 */
export type FileAttachment = FileAttachmentInput;
/**
 * Queued Message - Message waiting in queue to be sent
 * Used for per-session message queuing during AI streaming
 */
export interface QueuedMessage {
    id: string;
    content: string;
    attachments: FileAttachment[];
    enqueuedAt: number;
}
/**
 * System Message - Runtime warnings/notifications inserted between steps
 * Used for mid-execution alerts (context warnings, resource warnings, etc.)
 */
export interface SystemMessage {
    type: string;
    content: string;
    timestamp?: number;
}
/**
 * Token usage statistics
 */
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}
/**
 * Session message - Container for steps representing a conversation turn
 *
 * Design: Message = Container, Step = Request
 * ===========================================
 *
 * CORRECTED: Messages are CONTAINERS for steps
 * - User message: 1 step (user input at one time)
 * - Assistant message: 1+ steps (may need multiple AI calls for tool execution)
 * - metadata/todoSnapshot belong to STEPS, not messages
 *
 * Why steps have their own metadata/todoSnapshot:
 * - Step = ONE AI call at ONE point in time
 * - System status (cpu, memory) captured PER step (not per message)
 * - Todo state captured PER step (todos change during execution)
 * - Example: Step 0 has todos=[A,B], then tool creates C, Step 1 has todos=[A,B,C]
 *
 * Message-level fields:
 * - id, role, timestamp: Identity and conversation structure
 * - attachments: Files uploaded with user message (applies to all steps)
 * - usage: SUM of all steps (total cost for this message)
 * - finishReason: FINAL reason from last step
 * - status: Overall message status (derived from steps)
 *
 * UI Display:
 * - Render each step with its own header (step index, duration, usage)
 * - Show per-step system status and todos if needed
 * - Total message cost = sum of step costs
 *
 * LLM Context:
 * - Each step's metadata + todoSnapshot injected when building ModelMessage
 * - Attachments (files) read and injected for first step
 * - Steps after first only get tool results context
 */
export interface SessionMessage {
    id: string;
    role: "system" | "user" | "assistant";
    steps: MessageStep[];
    timestamp: number;
    status?: "active" | "completed" | "error" | "abort";
    usage?: TokenUsage;
    finishReason?: string;
}
/**
 * Role conversion rules when building ModelMessage for LLM:
 * - 'system' → 'user'  (system messages become user context for attention decay)
 * - 'user' → 'user'    (direct mapping)
 * - 'assistant' → 'assistant' (direct mapping)
 *
 * UI behavior:
 * - 'system' messages: Skip in history navigation (up/down arrows), show with special styling
 * - 'user' messages: Normal user input, included in history navigation
 * - 'assistant' messages: AI responses, not in history navigation
 */
/**
 * Convenience type alias for SessionMessage
 * Used throughout codebase for brevity
 */
export type Message = SessionMessage;
/**
 * Model availability status
 * Used to indicate if a session's configured model is still available
 */
export type ModelStatus = "available" | "unavailable" | "unknown";
/**
 * Session metadata (lightweight)
 * Used for lists and selection UI - no messages or todos included
 *
 * Design: Data on demand
 * ======================
 * - SessionMetadata: Lightweight, for lists/selection (this type)
 * - Session: Full data with messages/todos (below)
 *
 * Why separate types:
 * - Avoids loading all messages when showing session list
 * - Efficient cursor-based pagination
 * - Clear API contracts (metadata vs full session)
 */
export interface SessionMetadata {
    id: string;
    title?: string;
    /**
     * Model ID (normalized)
     * References Model.id in model registry
     * @example 'claude-sonnet-4', 'gpt-4o', 'openrouter/anthropic/claude-sonnet-3.5'
     */
    modelId: string;
    modelStatus?: ModelStatus;
    agentId: string;
    enabledRuleIds?: string[];
    enabledToolIds?: string[];
    enabledMcpServerIds?: string[];
    created: number;
    updated: number;
    messageCount: number;
    /** @deprecated Use modelId instead */
    provider?: ProviderId;
    /** @deprecated Use modelId instead */
    model?: string;
}
/**
 * Chat session
 *
 * Design: Per-session todo lists
 * ================================
 *
 * Why todos are scoped to sessions (not global):
 * 1. Context isolation - Each conversation has its own task context
 * 2. Prevents cross-contamination - New session won't see old todos
 * 3. LLM clarity - AI only sees tasks relevant to current conversation
 *
 * Before (global todos):
 * - Session A creates todos ["Build feature X", "Test feature X"]
 * - Session B starts, user says "hi"
 * - LLM sees Session A's todos and tries to complete them ❌
 *
 * After (per-session todos):
 * - Session A has its own todos
 * - Session B starts with empty todos ✅
 * - Each session manages independent task lists
 *
 * Implementation notes:
 * - nextTodoId is also per-session to avoid ID conflicts
 * - Todos are persisted with session to disk
 * - updateTodos tool requires sessionId parameter
 *
 * Design: Message status-based state
 * ===================================
 *
 * Streaming state is derived from message status, not stored separately:
 * - message.status: 'active' | 'completed' | 'error' | 'abort'
 * - part.status: 'active' | 'completed' | 'error' | 'abort'
 *
 * Session recovery:
 * 1. Find messages with status === 'active'
 * 2. Display their parts directly
 * 3. No separate streaming state needed
 *
 * Streaming lifecycle:
 * 1. User sends message → Create message with status='active'
 * 2. Parts arrive → Add/update parts in message
 * 3. User switches session → Message stays in DB with status='active'
 * 4. Streaming completes → Update message status='completed'
 * 5. User aborts (ESC) → Update message status='abort'
 *
 * Benefits:
 * - Single source of truth (message data)
 * - No conversion between streaming/persistent formats
 * - Recovery is just "display active messages"
 * - Archives naturally (status='archived')
 */
export interface Session {
    id: string;
    title?: string;
    /**
     * Model ID (normalized)
     * References Model.id in model registry
     * @example 'claude-sonnet-4', 'gpt-4o', 'openrouter/anthropic/claude-sonnet-3.5'
     */
    modelId: string;
    modelStatus?: ModelStatus;
    agentId: string;
    enabledRuleIds: string[];
    /**
     * Enabled tools for this session (normalized)
     * References Tool.id[] from tool registry
     * If undefined/empty, all tools enabled by default
     */
    enabledToolIds?: string[];
    /**
     * Enabled MCP servers for this session (normalized)
     * References MCPServer.id[] from MCP server registry
     * If undefined/empty, all enabled MCP servers are used
     */
    enabledMcpServerIds?: string[];
    messages: SessionMessage[];
    todos: Todo[];
    nextTodoId: number;
    flags?: Record<string, boolean>;
    baseContextTokens?: number;
    totalTokens?: number;
    status?: SessionStatus;
    created: number;
    updated: number;
    /** @deprecated Use modelId instead */
    provider?: ProviderId;
    /** @deprecated Use modelId instead */
    model?: string;
}
//# sourceMappingURL=session.types.d.ts.map