/**
 * Streaming Service
 * Backend service for AI streaming - used by tRPC subscription
 *
 * Architecture:
 * - Loads session data from database
 * - Builds message context for AI
 * - Streams AI response
 * - Saves results to database
 * - Emits events to subscription observer
 *
 * This service is called by message.streamResponse subscription procedure
 */

// Re-export main streaming function
export { streamAIResponse } from "./streaming/stream-orchestrator.js";
// Re-export types
export type { StreamAIResponseOptions, StreamEvent } from "./streaming/types.js";
