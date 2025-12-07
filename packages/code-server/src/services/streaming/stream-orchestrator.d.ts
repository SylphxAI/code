/**
 * Stream Orchestrator
 * Main streamAIResponse function - coordinates all streaming modules
 */
import { type Observable } from "@trpc/server/observable";
import type { StreamAIResponseOptions, StreamEvent } from "./types.js";
/**
 * Stream AI response as Observable<StreamEvent>
 *
 * This function:
 * 1. Loads session from database
 * 2. Adds user message to session
 * 3. Builds message context for AI
 * 4. Streams AI response
 * 5. Emits events to observer
 * 6. Saves final result to database
 */
export declare function streamAIResponse(opts: StreamAIResponseOptions): Observable<StreamEvent, unknown>;
//# sourceMappingURL=stream-orchestrator.d.ts.map