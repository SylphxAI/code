/**
 * Streaming Service
 * Backend service for AI streaming
 *
 * Architecture (V2 - Perfect):
 * - Direct eventStream publishing via StreamPublisher
 * - Returns Promise<StreamResult> for async/await
 * - Single event path: modules → StreamPublisher → eventStream
 * - No Observable/Observer pattern
 */

// Re-export main streaming function (V2)
export { streamAIResponseV2 } from "./streaming/stream-orchestrator-v2.js";
export type { StreamResult } from "./streaming/stream-orchestrator-v2.js";
// Re-export types
export type { StreamAIResponseOptions, StreamEvent } from "./streaming/types.js";
