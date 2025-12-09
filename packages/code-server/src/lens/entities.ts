/**
 * Lens Entity Definitions with Inline Resolvers
 *
 * Defines all data entities for Sylphx Code using Lens 2.6.0+ unified API.
 * Entity names are derived from export keys (e.g., `export const Session` → "Session")
 *
 * Architecture (lens-core 2.6.0+):
 * - entity() with builder pattern: entity<Context>("Name").define((t) => ({ ... }))
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

import { entity, t, createResolverFromEntity } from "@sylphx/lens-core";
import type { Resolvers } from "@sylphx/lens-core";
import type { LensContext } from "./context.js";

// =============================================================================
// Types
// =============================================================================

/**
 * SessionStatus - Live streaming status for session
 */
interface SessionStatus {
	text: string;
	duration: number;
	tokenUsage: number;
	isActive: boolean;
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

/**
 * Check if event payload is relevant for step updates
 */
function isStepEvent(payload: { type?: string }): boolean {
	if (!payload?.type) return false;
	return [
		"step-start",
		"step-complete",
		"text-delta",
		"text-end",
		"reasoning-delta",
		"reasoning-end",
		"tool-call",
		"tool-result",
		"tool-error",
	].includes(payload.type);
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
export const Session = entity<LensContext>("Session").define((t) => ({
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

	// Live streaming status - uses Two-Phase Field Resolution (ADR-002)
	// Phase 1: .resolve() returns initial value (null - status only exists during streaming)
	// Phase 2: .subscribe() returns publisher for live updates
	status: t
		.json<SessionStatus | null>()
		.resolve(() => null)
		.subscribe(({ parent, ctx }) => ({ emit, onCleanup }) => {
			// Phase 2: Publisher pattern - set up live subscription
			const session = parent as { id: string };
			const channel = getSessionChannel(session.id);
			let cancelled = false;

			// Subscribe to session-updated events
			(async () => {
				for await (const { payload } of ctx.eventStream.subscribe(channel)) {
					if (cancelled) break;
					if (payload?.type === "session-updated" && payload.session?.status) {
						emit(payload.session.status as SessionStatus);
					}
				}
			})();

			onCleanup(() => {
				cancelled = true;
			});
		}),

	// Message queue (for queuing during streaming)
	messageQueue: t.json().optional(), // QueuedMessage[]

	// Todo tracking
	nextTodoId: t.int(),

	// Timestamps (Unix ms) - match database column names
	created: t.int(),
	updated: t.int(),
	lastAccessedAt: t.int().optional(),
}));

// =============================================================================
// Message Entity
// =============================================================================

/**
 * Message - User or assistant message
 *
 * Container for conversation turns.
 * Steps field uses Two-Phase Resolution for live streaming updates.
 */
export const Message = entity<LensContext>("Message").define((t) => ({
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

	// Live steps - uses Two-Phase Field Resolution (ADR-002)
	// Architecture: Event-Carried State - no DB refetch, use event data directly
	steps: t
		.many(() => Step)
		.resolve(({ parent }) => {
			// Phase 1: Return initial steps from parent data (eager loaded)
			const message = parent as { steps?: any[] };
			return message.steps || [];
		})
		.subscribe(({ parent, ctx }) => ({ emit, onCleanup }) => {
			// Phase 2: Publisher pattern with delta emit (Lens 2.7.0+)
			// Uses event-carried state - no DB refetch needed
			const message = parent as { id: string; sessionId: string };
			const channel = getSessionChannel(message.sessionId);
			let cancelled = false;

			(async () => {
				for await (const { payload } of ctx.eventStream.subscribe(channel)) {
					if (cancelled) break;

					// Handle step-added: push new step to array
					if (payload?.type === "step-added" && payload.messageId === message.id) {
						emit.push(payload.step);
					}

					// Handle step-updated: patch existing step in array
					if (payload?.type === "step-updated" && payload.messageId === message.id) {
						emit.patch([
							{ op: "replace", path: `/${payload.stepIndex}`, value: payload.step },
						]);
					}

					// Handle part-content-delta: patch specific part content during streaming
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

			onCleanup(() => {
				cancelled = true;
			});
		}),
}));

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
export const Step = entity<LensContext>("Step").define((t) => ({
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

	// Parts - resolved from parent data
	// Updates are driven by parent Message.steps subscription
	parts: t.many(() => Part).resolve(({ parent }) => {
		const step = parent as { parts?: any[] };
		return step.parts || [];
	}),
}));

// =============================================================================
// Part Entity
// =============================================================================

/**
 * Part - Content part within a step (matches MessagePart type)
 *
 * Types: text, reasoning, tool, error, file, file-ref, system-message
 * This entity matches the MessagePart discriminated union from code-core.
 */
export const Part = entity("Part", {
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

// =============================================================================
// Create Resolvers from Entities
// =============================================================================

/**
 * Create entity resolvers array for Lens server
 *
 * Uses createResolverFromEntity() for entities with inline resolvers.
 * Plain entities (Part, StepUsage, Todo) don't need explicit resolvers.
 */
export function createResolvers(): Resolvers {
	return [
		createResolverFromEntity(Session),
		createResolverFromEntity(Message),
		createResolverFromEntity(Step),
		// Part, StepUsage, Todo don't have inline resolvers
	];
}
