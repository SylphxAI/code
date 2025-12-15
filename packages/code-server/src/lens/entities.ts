/**
 * Lens Entity Definitions with Inline Resolvers
 *
 * Defines all data entities for Sylphx Code using Lens 2.6.0+ unified API.
 * Entity names are derived from export keys (e.g., `export const Session` → "Session")
 *
 * Architecture (lens-core 2.6.0+):
 * - model() with builder pattern: entity<Context>("Name").define((t) => ({ ... }))
 * - Two-Phase Field Resolution (ADR-002):
 *   - .resolve() for initial value (batchable with DataLoader)
 *   - .subscribe() returns publisher function for live updates
 *   - .resolve().subscribe() combines both (recommended for live fields)
 * - Lazy relations for circular refs: t.many(() => Entity)
 * - createResolverFromEntity() to get resolver at runtime
 * - Type-safe context in resolvers: ctx is typed as Context
 *
 * Data Model:
 * - Session (1:N) → Message (1:N) → Step (1:N) → Part
 * - Todo (N:1) → Session
 * - StepUsage (1:1) → Step
 */

import { model } from "@sylphx/lens-core";
import type { LensContext } from "./context.js";

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
// Helper Functions
// =============================================================================

/**
 * Get session stream channel for events
 */
function getSessionChannel(sessionId: string): string {
	return `session-stream:${sessionId}`;
}


// =============================================================================
// Session Entity
// =============================================================================

/**
 * Session - Chat session with AI
 *
 * Contains configuration, metadata, and token tracking.
 * Messages are loaded via relations, not embedded.
 * Status field uses Two-Phase Resolution for live streaming updates.
 */
export const Session = model<LensContext>("Session", (t) => ({
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

	// Live streaming status - transient, not in DB
	status: t.json<SessionStatus | null>(),

	// Live AI suggestions - transient, not in DB
	suggestions: t.json<SessionSuggestions | null>(),

	// Message queue (for queuing during streaming)
	messageQueue: t.json().optional(), // QueuedMessage[]

	// Todo tracking
	nextTodoId: t.int(),

	// Timestamps (Unix ms) - match database column names
	created: t.int(),
	updated: t.int(),
	lastAccessedAt: t.int().optional(),

	// Relations
	messages: t.many(() => Message),
	todos: t.many(() => Todo),
	askRequests: t.many(() => AskRequest),
}))
.resolve({
	// Title: resolve from source (DB row)
	title: ({ source }) => (source as { title?: string }).title,

	// Status: transient, starts null
	status: () => null,

	// Suggestions: transient, starts null
	suggestions: () => null,

	// Messages: load from DB
	messages: async ({ source, ctx }) => {
		const session = source as { id: string };
		return ctx.db.message.findMany({
			where: { sessionId: session.id },
		});
	},

	// Todos: load from DB
	todos: async ({ source, ctx }) => {
		const session = source as { id: string };
		return ctx.db.todo.findMany({
			where: { sessionId: session.id },
		});
	},

	// AskRequests: load from DB
	askRequests: async ({ source, ctx }) => {
		const session = source as { id: string };
		return ctx.db.askRequest.findMany({
			where: { sessionId: session.id },
		});
	},
})
;

// =============================================================================
// Message Entity
// =============================================================================

/**
 * Message - User or assistant message
 *
 * Container for conversation turns.
 * Steps field uses Two-Phase Resolution for live streaming updates.
 */
export const Message = model<LensContext>("Message", (t) => ({
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

	// Relations
	session: t.one(() => Session),
	steps: t.many(() => Step),
}))
.resolve({
	session: async ({ source, ctx }) => {
		const message = source as { sessionId: string };
		return ctx.db.session.findUnique({ where: { id: message.sessionId } });
	},
	steps: ({ source }) => {
		const message = source as { steps?: any[] };
		return message.steps || [];
	},
})
.subscribe({
	steps: ({ source, ctx }) => ({ emit, onCleanup }) => {
		const message = source as { id: string; sessionId: string };
		const channel = getSessionChannel(message.sessionId);
		let cancelled = false;

		(async () => {
			for await (const { payload } of ctx.eventStream.subscribe(channel)) {
				if (cancelled) break;

				if (payload?.type === "step-added" && payload.messageId === message.id) {
					emit.push(payload.step);
				}
				if (payload?.type === "step-updated" && payload.messageId === message.id) {
					emit.patch([
						{ op: "replace", path: `/${payload.stepIndex}`, value: payload.step },
					]);
				}
				if (payload?.type === "part-content-delta" && payload.messageId === message.id) {
					emit.patch([
						{
							op: "replace",
							path: `/${payload.stepIndex}/parts/${payload.partIndex}/content`,
							value: payload.content,
						},
					]);
				}
			}
		})();

		onCleanup(() => { cancelled = true; });
	},
});

// =============================================================================
// Step Entity
// =============================================================================

/**
 * Step - Individual AI request/turn within a message
 *
 * Each step = one LLM call.
 * Assistant messages may have multiple steps (tool execution loops).
 * Parts are resolved from parent data (updates driven by Message.steps).
 */
export const Step = model<LensContext>("Step", (t) => ({
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

	// Relations
	message: t.one(() => Message),
	parts: t.many(() => Part),
}))
.resolve({
	message: ({ source }) => {
		const step = source as { messageId: string; _message?: any };
		return step._message || { id: step.messageId };
	},
	parts: ({ source }) => {
		const step = source as { parts?: any[] };
		return step.parts || [];
	},
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
export const Part = model<LensContext>("Part", (t) => ({
	// Discriminator field (required for all parts)
	type: t.string(), // 'text' | 'reasoning' | 'tool' | 'error' | 'file' | 'file-ref' | 'system-message'

	// Common fields
	status: t.string(), // 'pending' | 'active' | 'completed' | 'error' | 'abort'

	// Text/Reasoning content (for type: 'text' | 'reasoning')
	content: t.string().optional(),

	// Tool fields (for type: 'tool')
	toolId: t.string().optional(),
	name: t.string().optional(),
	mcpServerId: t.string().optional(),
	input: t.json().optional(),
	result: t.json().optional(),
	error: t.string().optional(),
	duration: t.int().optional(),
	startTime: t.int().optional(),

	// File fields (for type: 'file' | 'file-ref')
	relativePath: t.string().optional(),
	size: t.int().optional(),
	mediaType: t.string().optional(),
	base64: t.string().optional(), // Legacy file
	fileContentId: t.string().optional(), // File reference

	// System message fields (for type: 'system-message')
	messageType: t.string().optional(),
	timestamp: t.int().optional(),
}));

// =============================================================================
// StepUsage Entity
// =============================================================================

/**
 * StepUsage - Token usage for a step
 *
 * 1:1 relationship with Step.
 * Only assistant steps have usage data.
 */
export const StepUsage = model<LensContext>("StepUsage", (t) => ({
	// Primary key (same as step ID)
	stepId: t.id(),

	// Token counts
	promptTokens: t.int(),
	completionTokens: t.int(),
	totalTokens: t.int(),
}));

// =============================================================================
// Todo Entity
// =============================================================================

/**
 * Todo - Session-specific task item
 *
 * Note: id is per-session, not globally unique.
 * Combined primary key: (sessionId, id)
 */
export const Todo = model<LensContext>("Todo", (t) => ({
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

	// Relations
	session: t.one(() => Session),
}))
.resolve({
	session: async ({ source, ctx }) => {
		const todo = source as { sessionId: string };
		return ctx.db.session.findUnique({ where: { id: todo.sessionId } });
	},
});

// =============================================================================
// BashProcess Entity
// =============================================================================

/**
 * BashProcess - Running or completed bash process
 *
 * Live fields for real-time output streaming.
 * Uses Two-Phase Resolution for status and output updates.
 */
export const BashProcess = model<LensContext>("BashProcess", (t) => ({
	// Primary key
	id: t.id(),

	// Command info
	command: t.string(),
	cwd: t.string().optional(),

	// Mode and status
	mode: t.string(), // 'active' | 'background'
	status: t.string(), // 'running' | 'completed' | 'error' | 'killed'

	// Timing
	startTime: t.int(),
	endTime: t.int().optional(),
	duration: t.int().optional(),

	// Result
	exitCode: t.int().optional(),

	// Live output
	stdout: t.string(),
	stderr: t.string(),
}))
.resolve({
	stdout: () => "",
	stderr: () => "",
})
.subscribe({
	stdout: ({ source, ctx }) => ({ emit, onCleanup }) => {
		const bash = source as { id: string };
		const channel = `bash:${bash.id}`;
		let cancelled = false;

		(async () => {
			for await (const { payload } of ctx.eventStream.subscribe(channel)) {
				if (cancelled) break;
				if (payload?.type === "bash-output" && payload.stream === "stdout") {
					emit.delta(payload.data);
				}
			}
		})();

		onCleanup(() => { cancelled = true; });
	},
	stderr: ({ source, ctx }) => ({ emit, onCleanup }) => {
		const bash = source as { id: string };
		const channel = `bash:${bash.id}`;
		let cancelled = false;

		(async () => {
			for await (const { payload } of ctx.eventStream.subscribe(channel)) {
				if (cancelled) break;
				if (payload?.type === "bash-output" && payload.stream === "stderr") {
					emit.delta(payload.data);
				}
			}
		})();

		onCleanup(() => { cancelled = true; });
	},
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
export const Agent = model<LensContext>("Agent", (t) => ({
	// Primary key
	id: t.id(), // e.g., 'coder', 'planner', 'reviewer'

	// Metadata
	name: t.string(),
	description: t.string(),

	// System prompt content
	systemPrompt: t.string(),

	// Source info
	isBuiltin: t.boolean(),
	filePath: t.string().optional(),

	// Associated rules
	defaultRuleIds: t.json().optional(), // string[]
}));

// =============================================================================
// Rule Entity
// =============================================================================

/**
 * Rule - Shared system prompt rules
 *
 * Rules add content to system prompts for all agents.
 * Can be enabled/disabled per session.
 */
export const Rule = model<LensContext>("Rule", (t) => ({
	// Primary key
	id: t.id(), // e.g., 'coding/typescript', 'style/concise'

	// Metadata
	name: t.string(),
	description: t.string(),

	// Content
	content: t.string(),

	// Source info
	isBuiltin: t.boolean(),
	filePath: t.string().optional(),

	// Glob patterns for auto-apply
	globs: t.json().optional(), // string[]

	// Auto-apply behavior
	alwaysApply: t.boolean(),
}));

// =============================================================================
// Provider Entity
// =============================================================================

/**
 * Provider - AI service provider
 *
 * Represents providers like Anthropic, OpenAI, etc.
 * isConfigured indicates if API key is set.
 */
export const Provider = model<LensContext>("Provider", (t) => ({
	// Primary key
	id: t.id(), // e.g., 'anthropic', 'openai', 'google'

	// Metadata
	name: t.string(),
	description: t.string(),

	// Status
	isConfigured: t.boolean(),
	isEnabled: t.boolean(),

	// Config schema fields (for UI)
	configFields: t.json().optional(), // ConfigField[]

	// Relations
	models: t.many(() => Model),
	credentials: t.many(() => Credential),
}))
.resolve({
	models: async ({ source, ctx }) => {
		const provider = source as { id: string };
		return ctx.db.model.findMany({
			where: { providerId: provider.id },
		});
	},
	credentials: async ({ source, ctx }) => {
		const provider = source as { id: string };
		return ctx.db.credential.findMany({
			where: { providerId: provider.id },
		});
	},
});

// =============================================================================
// Model Entity
// =============================================================================

/**
 * Model - AI model from a provider
 *
 * Models have capabilities, context limits, and pricing.
 */
export const Model = model<LensContext>("Model", (t) => ({
	// Primary key
	id: t.id(), // e.g., 'claude-sonnet-4-20250514'

	// Provider
	providerId: t.string(),

	// Metadata
	name: t.string(),
	description: t.string().optional(),

	// Capabilities
	contextLength: t.int().optional(),
	maxOutputTokens: t.int().optional(),
	supportsVision: t.boolean().optional(),
	supportsTools: t.boolean().optional(),
	supportsStreaming: t.boolean().optional(),

	// Pricing (per 1M tokens)
	inputPrice: t.float().optional(),
	outputPrice: t.float().optional(),

	// Status
	isAvailable: t.boolean(),
	isDefault: t.boolean().optional(),

	// Relations
	provider: t.one(() => Provider),
}))
.resolve({
	provider: async ({ source, ctx }) => {
		const m = source as { providerId: string };
		return ctx.db.provider.findUnique({ where: { id: m.providerId } });
	},
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
export const Tool = model<LensContext>("Tool", (t) => ({
	// Primary key
	id: t.id(), // e.g., 'Read', 'Write', 'Bash', 'mcp__server__tool'

	// Metadata
	name: t.string(),
	description: t.string(),
	category: t.string(), // 'filesystem' | 'shell' | 'search' | 'interaction' | 'todo' | 'mcp'

	// Capabilities
	isAsync: t.boolean(),
	isDangerous: t.boolean().optional(),
	requiresConfirmation: t.boolean().optional(),

	// Source
	source: t.string(), // 'builtin' | 'mcp' | 'plugin'
	mcpServerId: t.string().optional(),

	// Status
	isEnabled: t.boolean(),
	enabledByDefault: t.boolean(),

	// Relations
	mcpServer: t.one(() => MCPServer).optional(),
}))
.resolve({
	mcpServer: async ({ source, ctx }) => {
		const tool = source as { mcpServerId?: string };
		if (!tool.mcpServerId) return null;
		return ctx.db.mcpServer.findUnique({ where: { id: tool.mcpServerId } });
	},
});

// =============================================================================
// MCPServer Entity
// =============================================================================

/**
 * MCPServer - Model Context Protocol server
 *
 * Live status field for connection state.
 * Uses Two-Phase Resolution for real-time status updates.
 */
export const MCPServer = model<LensContext>("MCPServer", (t) => ({
	// Primary key
	id: t.id(), // Server identifier

	// Config
	name: t.string(),
	description: t.string().optional(),
	transportType: t.string(), // 'http' | 'sse' | 'stdio'

	// Live status
	status: t.string(),

	// Stats
	toolCount: t.int(),
	resourceCount: t.int().optional(),
	promptCount: t.int().optional(),

	// Error info
	error: t.string().optional(),

	// Timestamps
	connectedAt: t.int().optional(),
	lastActivity: t.int().optional(),

	// Enabled state
	enabled: t.boolean(),

	// Relations
	tools: t.many(() => Tool),
}))
.resolve({
	status: () => "disconnected",
	tools: async ({ source, ctx }) => {
		const server = source as { id: string };
		return ctx.db.tool.findMany({
			where: { mcpServerId: server.id },
		});
	},
})
.subscribe({
	status: ({ source, ctx }) => ({ emit, onCleanup }) => {
		const server = source as { id: string };
		const channel = "mcp-events";
		let cancelled = false;

		(async () => {
			for await (const { payload } of ctx.eventStream.subscribe(channel)) {
				if (cancelled) break;
				if (payload?.serverId === server.id && payload?.type === "mcp-status-changed") {
					emit(payload.status);
				}
			}
		})();

		onCleanup(() => { cancelled = true; });
	},
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
export const Credential = model<LensContext>("Credential", (t) => ({
	// Primary key
	id: t.id(),

	// Provider
	providerId: t.string(),

	// Display
	label: t.string().optional(),
	maskedApiKey: t.string(), // e.g., 'sk-...abc123'

	// Scope
	scope: t.string(), // 'global' | 'project'

	// Status
	status: t.string(), // 'active' | 'expired' | 'revoked' | 'invalid'
	isDefault: t.boolean(),

	// Timestamps
	createdAt: t.int(),
	lastUsedAt: t.int().optional(),
	expiresAt: t.int().optional(),

	// Relations
	provider: t.one(() => Provider),
}))
.resolve({
	provider: async ({ source, ctx }) => {
		const cred = source as { providerId: string };
		return ctx.db.provider.findUnique({ where: { id: cred.providerId } });
	},
});

// =============================================================================
// File Entity
// =============================================================================

/**
 * File - Uploaded file reference
 *
 * Stores metadata for uploaded files (images, documents, etc.)
 */
export const File = model<LensContext>("File", (t) => ({
	// Primary key
	id: t.id(), // File content ID

	// Metadata
	relativePath: t.string(),
	mediaType: t.string(),
	size: t.int(),

	// Timestamps
	uploadedAt: t.int(),

	// Session association (optional)
	sessionId: t.string().optional(),
}));

// =============================================================================
// AskRequest Entity
// =============================================================================

/**
 * AskRequest - User confirmation request
 *
 * For tools that require user approval before execution.
 * Live status field for pending/answered state.
 */
export const AskRequest = model<LensContext>("AskRequest", (t) => ({
	// Primary key
	id: t.id(), // Question ID

	// Session
	sessionId: t.string(),

	// Request type
	type: t.string(), // 'tool-approval' | 'question' | 'confirmation'

	// Questions
	questions: t.json(), // Question[]

	// Live status
	status: t.string(),

	// Answers (populated after user responds)
	answers: t.json().optional(), // Record<string, string | string[]>

	// Timestamps
	createdAt: t.int(),
	answeredAt: t.int().optional(),
}))
.resolve({
	status: () => "pending",
})
.subscribe({
	status: ({ source, ctx }) => ({ emit, onCleanup }) => {
		const ask = source as { id: string; sessionId: string };
		const channel = getSessionChannel(ask.sessionId);
		let cancelled = false;

		(async () => {
			for await (const { payload } of ctx.eventStream.subscribe(channel)) {
				if (cancelled) break;
				if (payload?.type === "ask-answered" && payload.questionId === ask.id) {
					emit("answered");
				}
			}
		})();

		onCleanup(() => { cancelled = true; });
	},
});

