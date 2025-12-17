/**
 * Lens Entity Definitions
 *
 * Defines all data entities for Sylphx Code using Lens 4.0 API.
 *
 * API (lens-core 4.0+):
 * - model("Name", { field: type() }) defines pure type entities
 * - id(), string(), int(), float(), boolean(), list(), nullable(), json()
 * - Resolvers are separate via resolver() function
 *
 * Data Model:
 * - Session (1:N) → Message (1:N) → Step (1:N) → Part
 * - Todo (N:1) → Session
 * - StepUsage (1:1) → Step
 */

import {
	id,
	string,
	int,
	float,
	boolean,
	list,
	nullable,
	json,
	model,
} from "@sylphx/lens-core";

// =============================================================================
// Types
// =============================================================================

/**
 * SessionStatus - Live streaming status for session
 * Client calculates duration from startTime locally
 */
interface SessionStatus {
	text: string;
	startTime: number;
	tokenUsage: number;
	isActive: boolean;
}

/**
 * SessionSuggestions - AI-generated action suggestions
 */
interface SessionSuggestions {
	suggestions: Array<{
		index: number;
		text: string;
		isStreaming: boolean;
	}>;
	isStreaming: boolean;
}

// =============================================================================
// Session Entity
// =============================================================================

/**
 * Session - Chat session with AI
 *
 * Contains configuration, metadata, and token tracking.
 * Messages are loaded via queries, not embedded relations.
 */
export const Session = model("Session", {
	// Primary key
	id: id(),

	// Metadata
	title: nullable(string()),
	flags: nullable(json<Record<string, boolean>>()), // System message flags

	// AI Configuration (new normalized format)
	modelId: nullable(string()), // e.g., 'claude-sonnet-4', 'gpt-4o'

	// Legacy AI config (deprecated, kept for migration)
	provider: nullable(string()),
	model: nullable(string()),

	// Agent configuration
	agentId: string(),

	// Enabled features
	enabledRuleIds: json<string[]>(),
	enabledToolIds: nullable(json<string[]>()),
	enabledMcpServerIds: nullable(json<string[]>()),

	// Token usage (server-computed)
	baseContextTokens: nullable(int()),
	totalTokens: nullable(int()),

	// Live streaming status - transient, not in DB
	status: nullable(json<SessionStatus>()),

	// Live AI suggestions - transient, not in DB
	suggestions: nullable(json<SessionSuggestions>()),

	// Message queue (for queuing during streaming)
	messageQueue: nullable(json()),

	// Todo tracking
	nextTodoId: int(),

	// Timestamps (Unix ms) - match database column names
	created: int(),
	updated: int(),
	lastAccessedAt: nullable(int()),
});

// =============================================================================
// Message Entity
// =============================================================================

/**
 * Message - User or assistant message
 *
 * Container for conversation turns.
 * Steps are loaded via queries.
 */
export const Message = model("Message", {
	// Primary key
	id: id(),

	// Foreign key
	sessionId: string(),

	// Metadata
	role: string(), // 'user' | 'assistant' | 'system'
	timestamp: int(), // Unix ms
	ordering: int(), // Display order within session

	// Aggregated status (derived from steps)
	finishReason: nullable(string()), // 'stop' | 'tool-calls' | 'length' | 'error'
	status: string(), // 'active' | 'completed' | 'error' | 'abort'

	// Embedded steps (loaded by query)
	steps: nullable(json()),
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
export const Step = model("Step", {
	// Primary key
	id: id(),

	// Foreign key
	messageId: string(),

	// Metadata
	stepIndex: int(), // 0, 1, 2, ... (order within message)

	// System messages for this step
	systemMessages: nullable(json()),

	// Execution metadata
	provider: nullable(string()),
	model: nullable(string()),
	duration: nullable(int()), // Execution time (ms)
	finishReason: nullable(string()),
	status: string(), // 'active' | 'completed' | 'error' | 'abort'

	// Timestamps
	startTime: nullable(int()),
	endTime: nullable(int()),

	// Embedded parts (loaded by query)
	parts: nullable(json()),
});

// =============================================================================
// Part Entity
// =============================================================================

/**
 * Part - Content part within a step (matches MessagePart type)
 *
 * Types: text, reasoning, tool, error, file, file-ref, system-message
 * This entity matches the MessagePart discriminated union from code-core.
 */
export const Part = model("Part", {
	// Discriminator field (required for all parts)
	type: string(), // 'text' | 'reasoning' | 'tool' | 'error' | 'file' | 'file-ref' | 'system-message'

	// Common fields
	status: string(), // 'pending' | 'active' | 'completed' | 'error' | 'abort'

	// Text/Reasoning content (for type: 'text' | 'reasoning')
	content: nullable(string()),

	// Tool fields (for type: 'tool')
	toolId: nullable(string()),
	name: nullable(string()),
	mcpServerId: nullable(string()),
	input: nullable(json()),
	result: nullable(json()),
	error: nullable(string()),
	duration: nullable(int()),
	startTime: nullable(int()),

	// File fields (for type: 'file' | 'file-ref')
	relativePath: nullable(string()),
	size: nullable(int()),
	mediaType: nullable(string()),
	base64: nullable(string()), // Legacy file
	fileContentId: nullable(string()), // File reference

	// System message fields (for type: 'system-message')
	messageType: nullable(string()),
	timestamp: nullable(int()),
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
export const StepUsage = model("StepUsage", {
	// Primary key (same as step ID)
	stepId: id(),

	// Token counts
	promptTokens: int(),
	completionTokens: int(),
	totalTokens: int(),
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
export const Todo = model("Todo", {
	// Per-session ID
	id: int(),

	// Foreign key
	sessionId: string(),

	// Content
	content: string(),
	activeForm: string(),
	status: string(), // 'pending' | 'in_progress' | 'completed'
	ordering: int(),

	// Entity relationships
	createdByToolId: nullable(string()),
	createdByStepId: nullable(string()),
	relatedFiles: nullable(json<string[]>()),
	metadata: nullable(json()),

	// Timestamps
	createdAt: nullable(int()),
	completedAt: nullable(int()),
});

// =============================================================================
// BashProcess Entity
// =============================================================================

/**
 * BashProcess - Running or completed bash process
 *
 * Live output streamed via subscriptions.
 */
export const BashProcess = model("BashProcess", {
	// Primary key
	id: id(),

	// Command info
	command: string(),
	cwd: nullable(string()),

	// Mode and status
	mode: string(), // 'active' | 'background'
	status: string(), // 'running' | 'completed' | 'error' | 'killed'

	// Timing
	startTime: int(),
	endTime: nullable(int()),
	duration: nullable(int()),

	// Result
	exitCode: nullable(int()),

	// Output (populated by query)
	stdout: string(),
	stderr: string(),
});

// =============================================================================
// Agent Entity
// =============================================================================

/**
 * Agent - AI agent with custom system prompt
 *
 * Agents define different AI behaviors (coder, planner, etc.)
 * Can be builtin or user-defined.
 */
export const Agent = model("Agent", {
	// Primary key
	id: id(), // e.g., 'coder', 'planner', 'reviewer'

	// Metadata
	name: string(),
	description: string(),

	// System prompt content
	systemPrompt: string(),

	// Source info
	isBuiltin: boolean(),
	filePath: nullable(string()),

	// Associated rules
	defaultRuleIds: nullable(json<string[]>()),
});

// =============================================================================
// Rule Entity
// =============================================================================

/**
 * Rule - Shared system prompt rules
 *
 * Rules add content to system prompts for all agents.
 * Can be enabled/disabled per session.
 */
export const Rule = model("Rule", {
	// Primary key
	id: id(), // e.g., 'coding/typescript', 'style/concise'

	// Metadata
	name: string(),
	description: string(),

	// Content
	content: string(),

	// Source info
	isBuiltin: boolean(),
	filePath: nullable(string()),

	// Glob patterns for auto-apply
	globs: nullable(json<string[]>()),

	// Auto-apply behavior
	alwaysApply: boolean(),
});

// =============================================================================
// Provider Entity
// =============================================================================

/**
 * Provider - AI service provider
 *
 * Represents providers like Anthropic, OpenAI, etc.
 * isConfigured indicates if API key is set.
 */
export const Provider = model("Provider", {
	// Primary key
	id: id(), // e.g., 'anthropic', 'openai', 'google'

	// Metadata
	name: string(),
	description: string(),

	// Status
	isConfigured: boolean(),
	isEnabled: boolean(),

	// Config schema fields (for UI)
	configFields: nullable(json()),
});

// =============================================================================
// Model Entity
// =============================================================================

/**
 * Model - AI model from a provider
 *
 * Models have capabilities, context limits, and pricing.
 */
export const Model = model("Model", {
	// Primary key
	id: id(), // e.g., 'claude-sonnet-4-20250514'

	// Provider
	providerId: string(),

	// Metadata
	name: string(),
	description: nullable(string()),

	// Capabilities
	contextLength: nullable(int()),
	maxOutputTokens: nullable(int()),
	supportsVision: nullable(boolean()),
	supportsTools: nullable(boolean()),
	supportsStreaming: nullable(boolean()),

	// Pricing (per 1M tokens)
	inputPrice: nullable(float()),
	outputPrice: nullable(float()),

	// Status
	isAvailable: boolean(),
	isDefault: nullable(boolean()),
});

// =============================================================================
// Tool Entity
// =============================================================================

/**
 * Tool - Callable function for AI
 *
 * Tools can be builtin, from MCP servers, or plugins.
 * Can be enabled/disabled per session.
 */
export const Tool = model("Tool", {
	// Primary key
	id: id(), // e.g., 'Read', 'Write', 'Bash', 'mcp__server__tool'

	// Metadata
	name: string(),
	description: string(),
	category: string(), // 'filesystem' | 'shell' | 'search' | 'interaction' | 'todo' | 'mcp'

	// Capabilities
	isAsync: boolean(),
	isDangerous: nullable(boolean()),
	requiresConfirmation: nullable(boolean()),

	// Source
	source: string(), // 'builtin' | 'mcp' | 'plugin'
	mcpServerId: nullable(string()),

	// Status
	isEnabled: boolean(),
	enabledByDefault: boolean(),
});

// =============================================================================
// MCPServer Entity
// =============================================================================

/**
 * MCPServer - Model Context Protocol server
 *
 * Connection status managed by queries/subscriptions.
 */
export const MCPServer = model("MCPServer", {
	// Primary key
	id: id(), // Server identifier

	// Config
	name: string(),
	description: nullable(string()),
	transportType: string(), // 'http' | 'sse' | 'stdio'

	// Status
	status: string(),

	// Stats
	toolCount: int(),
	resourceCount: nullable(int()),
	promptCount: nullable(int()),

	// Error info
	error: nullable(string()),

	// Timestamps
	connectedAt: nullable(int()),
	lastActivity: nullable(int()),

	// Enabled state
	enabled: boolean(),
});

// =============================================================================
// Credential Entity
// =============================================================================

/**
 * Credential - API key/secret for providers
 *
 * API keys are masked for display.
 * Never expose full API key to client.
 */
export const Credential = model("Credential", {
	// Primary key
	id: id(),

	// Provider
	providerId: string(),

	// Display
	label: nullable(string()),
	maskedApiKey: string(), // e.g., 'sk-...abc123'

	// Scope
	scope: string(), // 'global' | 'project'

	// Status
	status: string(), // 'active' | 'expired' | 'revoked' | 'invalid'
	isDefault: boolean(),

	// Timestamps
	createdAt: int(),
	lastUsedAt: nullable(int()),
	expiresAt: nullable(int()),
});

// =============================================================================
// File Entity
// =============================================================================

/**
 * File - Uploaded file reference
 *
 * Stores metadata for uploaded files (images, documents, etc.)
 */
export const File = model("File", {
	// Primary key
	id: id(), // File content ID

	// Metadata
	relativePath: string(),
	mediaType: string(),
	size: int(),

	// Timestamps
	uploadedAt: int(),

	// Session association (optional)
	sessionId: nullable(string()),
});

// =============================================================================
// AskRequest Entity
// =============================================================================

/**
 * AskRequest - User confirmation request
 *
 * For tools that require user approval before execution.
 */
export const AskRequest = model("AskRequest", {
	// Primary key
	id: id(), // Question ID

	// Session
	sessionId: string(),

	// Request type
	type: string(), // 'tool-approval' | 'question' | 'confirmation'

	// Questions
	questions: json(),

	// Status
	status: string(),

	// Answers (populated after user responds)
	answers: nullable(json<Record<string, string | string[]>>()),

	// Timestamps
	createdAt: int(),
	answeredAt: nullable(int()),
});
