/**
 * Lens Relation Definitions
 *
 * Defines relationships between entities for nested queries.
 * Relations enable .select() with nested fields on client.
 *
 * NOTE: Relations are defined here but require lens-server support.
 * Until supported, nested data is loaded via entity resolvers.
 *
 * Data Model:
 * - Session (1:N) → Message → Step → Part
 * - Session (1:N) → Todo
 * - Session (1:N) → AskRequest
 * - StepUsage (1:1) → Step
 * - Provider (1:N) → Model
 * - Provider (1:N) → Credential
 * - MCPServer (1:N) → Tool (MCP tools)
 * - Agent (M:N) → Rule (via defaultRuleIds)
 */

// =============================================================================
// Relation Type Definition
// =============================================================================

/**
 * Relation definition type (for future lens-server support)
 */
interface RelationDef {
	name: string;
	source: string;
	target: string;
	type: "one-to-one" | "one-to-many" | "many-to-many";
	sourceKey: string;
	targetKey: string;
}

/**
 * Helper to create relation metadata
 * Will be replaced with lens-core relation() when available
 */
function defineRelation(def: RelationDef): RelationDef {
	return def;
}

// =============================================================================
// Core Conversation Relations
// =============================================================================

/**
 * Session → Message (1:N)
 * A session contains many messages in conversation order.
 */
export const sessionMessages = defineRelation({
	name: "sessionMessages",
	source: "Session",
	target: "Message",
	type: "one-to-many",
	sourceKey: "id",
	targetKey: "sessionId",
});

/**
 * Message → Step (1:N)
 * A message contains many steps (LLM turns).
 * Assistant messages may have multiple steps due to tool loops.
 */
export const messageSteps = defineRelation({
	name: "messageSteps",
	source: "Message",
	target: "Step",
	type: "one-to-many",
	sourceKey: "id",
	targetKey: "messageId",
});

/**
 * Step → Part (1:N)
 * A step contains many parts (text, tool, reasoning, etc.)
 */
export const stepParts = defineRelation({
	name: "stepParts",
	source: "Step",
	target: "Part",
	type: "one-to-many",
	sourceKey: "id",
	targetKey: "stepId",
});

/**
 * Step → StepUsage (1:1)
 * Each assistant step has token usage data.
 */
export const stepUsage = defineRelation({
	name: "stepUsage",
	source: "Step",
	target: "StepUsage",
	type: "one-to-one",
	sourceKey: "id",
	targetKey: "stepId",
});

// =============================================================================
// Session Relations
// =============================================================================

/**
 * Session → Todo (1:N)
 * A session has many todos for task tracking.
 */
export const sessionTodos = defineRelation({
	name: "sessionTodos",
	source: "Session",
	target: "Todo",
	type: "one-to-many",
	sourceKey: "id",
	targetKey: "sessionId",
});

/**
 * Session → AskRequest (1:N)
 * A session can have pending ask requests.
 */
export const sessionAskRequests = defineRelation({
	name: "sessionAskRequests",
	source: "Session",
	target: "AskRequest",
	type: "one-to-many",
	sourceKey: "id",
	targetKey: "sessionId",
});

/**
 * Session → File (1:N)
 * Files can be associated with a session.
 */
export const sessionFiles = defineRelation({
	name: "sessionFiles",
	source: "Session",
	target: "File",
	type: "one-to-many",
	sourceKey: "id",
	targetKey: "sessionId",
});

// =============================================================================
// Config Relations
// =============================================================================

/**
 * Provider → Model (1:N)
 * A provider has many available models.
 */
export const providerModels = defineRelation({
	name: "providerModels",
	source: "Provider",
	target: "Model",
	type: "one-to-many",
	sourceKey: "id",
	targetKey: "providerId",
});

/**
 * Provider → Credential (1:N)
 * A provider can have multiple credentials.
 */
export const providerCredentials = defineRelation({
	name: "providerCredentials",
	source: "Provider",
	target: "Credential",
	type: "one-to-many",
	sourceKey: "id",
	targetKey: "providerId",
});

/**
 * MCPServer → Tool (1:N)
 * An MCP server provides many tools.
 */
export const mcpServerTools = defineRelation({
	name: "mcpServerTools",
	source: "MCPServer",
	target: "Tool",
	type: "one-to-many",
	sourceKey: "id",
	targetKey: "mcpServerId",
});

// =============================================================================
// Export All Relations
// =============================================================================

/**
 * All relation definitions for Lens server.
 *
 * Usage (when lens-server supports relations):
 * ```typescript
 * createApp({
 *   entities,
 *   relations,  // ← Enable nested queries
 *   queries,
 *   mutations,
 * })
 * ```
 *
 * Currently relations are handled via:
 * - Entity inline resolvers (Message.steps, Step.parts)
 * - Separate queries (listMessages, listTodos, etc.)
 */
export const relations = [
	// Core conversation
	sessionMessages,
	messageSteps,
	stepParts,
	stepUsage,
	// Session relations
	sessionTodos,
	sessionAskRequests,
	sessionFiles,
	// Config relations
	providerModels,
	providerCredentials,
	mcpServerTools,
];
