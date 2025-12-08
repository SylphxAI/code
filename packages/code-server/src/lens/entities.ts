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

import { entity, t } from "@sylphx/lens-core";

// =============================================================================
// Session Entity
// =============================================================================

/**
 * Session - Chat session with AI
 *
 * Contains configuration, metadata, and token tracking.
 * Messages are loaded via relations, not embedded.
 */
export const Session = entity("Session", {
	// Primary key
	id: t.id(),

	// Metadata
	title: t.string().optional(),
	flags: t.json().optional(), // System message flags: Record<string, boolean>

	// AI Configuration (new normalized format)
	modelId: t.string().optional(), // e.g., 'claude-sonnet-4', 'gpt-4o'

	// Legacy AI config (deprecated, kept for migration)
	provider: t.string().optional(),
	model: t.string().optional(),

	// Agent configuration
	agentId: t.string(),

	// Enabled features
	enabledRuleIds: t.json(), // string[]
	enabledToolIds: t.json().optional(), // string[] | undefined
	enabledMcpServerIds: t.json().optional(), // string[] | undefined

	// Token usage (server-computed)
	baseContextTokens: t.int().optional(),
	totalTokens: t.int().optional(),

	// Message queue (for queuing during streaming)
	messageQueue: t.json().optional(), // QueuedMessage[]

	// Todo tracking
	nextTodoId: t.int(),

	// Timestamps (Unix ms)
	createdAt: t.int(),
	updatedAt: t.int(),
	lastAccessedAt: t.int().optional(),
});

// =============================================================================
// Message Entity
// =============================================================================

/**
 * Message - User or assistant message
 *
 * Container for conversation turns.
 * Steps contain the actual content (text, tool calls, etc.)
 */
export const Message = entity("Message", {
	// Primary key
	id: t.id(),

	// Foreign key
	sessionId: t.string(),

	// Metadata
	role: t.string(), // 'user' | 'assistant' | 'system'
	timestamp: t.int(), // Unix ms
	ordering: t.int(), // Display order within session

	// Aggregated status (derived from steps)
	finishReason: t.string().optional(), // 'stop' | 'tool-calls' | 'length' | 'error'
	status: t.string(), // 'active' | 'completed' | 'error' | 'abort'
});

// =============================================================================
// Step Entity
// =============================================================================

/**
 * Step - Individual AI request/turn within a message
 *
 * Each step = one LLM call.
 * Assistant messages may have multiple steps (tool execution loops).
 */
export const Step = entity("Step", {
	// Primary key
	id: t.id(),

	// Foreign key
	messageId: t.string(),

	// Metadata
	stepIndex: t.int(), // 0, 1, 2, ... (order within message)

	// System messages for this step
	systemMessages: t.json().optional(), // SystemMessage[]

	// Execution metadata
	provider: t.string().optional(),
	model: t.string().optional(),
	duration: t.int().optional(), // Execution time (ms)
	finishReason: t.string().optional(),
	status: t.string(), // 'active' | 'completed' | 'error' | 'abort'

	// Timestamps
	startTime: t.int().optional(),
	endTime: t.int().optional(),
});

// =============================================================================
// Part Entity
// =============================================================================

/**
 * Part - Content part within a step
 *
 * Types: text, reasoning, tool, error
 * Content structure varies by type (stored as JSON).
 */
export const Part = entity("Part", {
	// Primary key
	id: t.id(),

	// Foreign key (nullable for orphaned uploads)
	stepId: t.string().optional(),

	// Metadata
	ordering: t.int(), // Order within step
	type: t.string(), // 'text' | 'reasoning' | 'tool' | 'error'

	// Content (JSON, structure varies by type)
	// All parts include status: 'active' | 'completed' | 'error' | 'abort'
	content: t.json(),
});

// =============================================================================
// StepUsage Entity
// =============================================================================

/**
 * StepUsage - Token usage for a step
 *
 * 1:1 relationship with Step.
 * Only assistant steps have usage data.
 */
export const StepUsage = entity("StepUsage", {
	// Primary key (same as step ID)
	stepId: t.id(),

	// Token counts
	promptTokens: t.int(),
	completionTokens: t.int(),
	totalTokens: t.int(),
});

// =============================================================================
// Todo Entity
// =============================================================================

/**
 * Todo - Session-specific task item
 *
 * Note: id is per-session, not globally unique.
 * Combined primary key: (sessionId, id)
 */
export const Todo = entity("Todo", {
	// Per-session ID
	id: t.int(),

	// Foreign key
	sessionId: t.string(),

	// Content
	content: t.string(),
	activeForm: t.string(),
	status: t.string(), // 'pending' | 'in_progress' | 'completed'
	ordering: t.int(),

	// Entity relationships
	createdByToolId: t.string().optional(),
	createdByStepId: t.string().optional(),
	relatedFiles: t.json().optional(), // string[]
	metadata: t.json().optional(),

	// Timestamps
	createdAt: t.int().optional(),
	completedAt: t.int().optional(),
});
