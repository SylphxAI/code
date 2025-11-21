/**
 * Stream Event Handlers
 * Event handler pattern for processing tRPC subscription events
 *
 * Each event type has its own dedicated handler function.
 * This replaces the large switch statement with a cleaner, more maintainable approach.
 *
 * ARCHITECTURE: Direct zen signal updates (no AppStore wrapper)
 * - All session data managed by zen signals
 * - Immutable updates only (no Immer middleware)
 * - Clean, direct state mutations
 */

import type { StreamEvent } from "@sylphx/code-server";

export {
	handleAskQuestionAnswered,
	handleAskQuestionStart,
} from "./handlers/askHandlers.js";
export {
	handleFile,
	handleReasoningDelta,
	handleReasoningEnd,
	handleReasoningStart,
	handleTextDelta,
	handleTextEnd,
	handleTextStart,
} from "./handlers/contentHandlers.js";
export {
	handleError,
	handleMessageStatusUpdated,
} from "./handlers/errorHandlers.js";

export {
	handleAssistantMessageCreated,
	handleStepComplete,
	handleStepStart,
	handleSystemMessageCreated,
	handleUserMessageCreated,
} from "./handlers/messageHandlers.js";
// Export all handlers
export {
	handleSessionCreated,
	handleSessionDeleted,
	handleSessionModelUpdated,
	handleSessionProviderUpdated,
	handleSessionStatusUpdated,
	handleSessionTitleUpdated,
	handleSessionTitleUpdatedDelta,
	handleSessionTitleUpdatedEnd,
	handleSessionTitleUpdatedStart,
	handleSessionTokensUpdated,
} from "./handlers/sessionHandlers.js";

export {
	handleQueueClearedEvent,
	handleQueueMessageAddedEvent,
	handleQueueMessageRemovedEvent,
	handleQueueMessageUpdatedEvent,
} from "./handlers/queueHandlers.js";

export {
	handleToolCall,
	handleToolError,
	handleToolInputDelta,
	handleToolInputEnd,
	handleToolInputStart,
	handleToolResult,
} from "./handlers/toolHandlers.js";
// Export types
export type { EventHandler, EventHandlerContext } from "./types.js";
// Export utilities
export { updateActiveMessageContent } from "./utils.js";

import { handleAskQuestionAnswered, handleAskQuestionStart } from "./handlers/askHandlers.js";
import {
	handleFile,
	handleReasoningDelta,
	handleReasoningEnd,
	handleReasoningStart,
	handleTextDelta,
	handleTextEnd,
	handleTextStart,
} from "./handlers/contentHandlers.js";
import { handleError, handleMessageStatusUpdated } from "./handlers/errorHandlers.js";
import {
	handleAssistantMessageCreated,
	handleStepComplete,
	handleStepStart,
	handleSystemMessageCreated,
	handleUserMessageCreated,
} from "./handlers/messageHandlers.js";
// Import all handlers for registry
import {
	handleSessionCreated,
	handleSessionDeleted,
	handleSessionModelUpdated,
	handleSessionProviderUpdated,
	handleSessionStatusUpdated,
	handleSessionTitleUpdated,
	handleSessionTitleUpdatedDelta,
	handleSessionTitleUpdatedEnd,
	handleSessionTitleUpdatedStart,
	handleSessionTokensUpdated,
} from "./handlers/sessionHandlers.js";
import {
	handleQueueClearedEvent,
	handleQueueMessageAddedEvent,
	handleQueueMessageRemovedEvent,
	handleQueueMessageUpdatedEvent,
} from "./handlers/queueHandlers.js";
import {
	handleToolCall,
	handleToolError,
	handleToolInputDelta,
	handleToolInputEnd,
	handleToolInputStart,
	handleToolResult,
} from "./handlers/toolHandlers.js";

import type { EventHandler } from "./types.js";

// ============================================================================
// Event Handler Registry
// ============================================================================

/**
 * Registry mapping event types to their handlers
 * This replaces the large switch statement with a cleaner lookup pattern
 */
const eventHandlers: Record<StreamEvent["type"], EventHandler> = {
	// Session events
	"session-created": handleSessionCreated,
	"session-deleted": handleSessionDeleted,
	"session-model-updated": handleSessionModelUpdated,
	"session-provider-updated": handleSessionProviderUpdated,
	"session-status-updated": handleSessionStatusUpdated,
	"session-tokens-updated": handleSessionTokensUpdated,

	// Title events
	"session-title-updated-start": handleSessionTitleUpdatedStart,
	"session-title-updated-delta": handleSessionTitleUpdatedDelta,
	"session-title-updated-end": handleSessionTitleUpdatedEnd,
	"session-title-updated": handleSessionTitleUpdated,

	// Message events
	"user-message-created": handleUserMessageCreated,
	"assistant-message-created": handleAssistantMessageCreated,
	"system-message-created": handleSystemMessageCreated,
	"message-status-updated": handleMessageStatusUpdated,

	// Step events
	"step-start": handleStepStart,
	"step-complete": handleStepComplete,

	// Reasoning events
	"reasoning-start": handleReasoningStart,
	"reasoning-delta": handleReasoningDelta,
	"reasoning-end": handleReasoningEnd,

	// Text events
	"text-start": handleTextStart,
	"text-delta": handleTextDelta,
	"text-end": handleTextEnd,

	// Tool events
	"tool-call": handleToolCall,
	"tool-result": handleToolResult,
	"tool-error": handleToolError,
	"tool-input-start": handleToolInputStart,
	"tool-input-delta": handleToolInputDelta,
	"tool-input-end": handleToolInputEnd,

	// File events
	file: handleFile,

	// Ask tool events
	"ask-question-start": handleAskQuestionStart,
	"ask-question-answered": handleAskQuestionAnswered,

	// Queue events
	"queue-message-added": handleQueueMessageAddedEvent,
	"queue-message-updated": handleQueueMessageUpdatedEvent,
	"queue-message-removed": handleQueueMessageRemovedEvent,
	"queue-cleared": handleQueueClearedEvent,

	// Error events
	error: handleError,
};

/**
 * Process stream event using handler registry
 * Replaces the large switch statement with a clean lookup
 */
export function handleStreamEvent(
	event: StreamEvent,
	context: import("./types.js").EventHandlerContext,
): void {
	const handler = eventHandlers[event.type];

	if (handler) {
		handler(event, context);
	} else {
		console.warn("[handleStreamEvent] Unknown event type:", event.type);
	}
}
