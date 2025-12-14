/**
 * Type Definitions for Streaming Service
 * All TypeScript types used across streaming modules
 */

import type { AIConfig, MessageRepository, ProviderId, SessionRepository, StreamEvent } from "@sylphx/code-core";
import type { AppContext } from "../../context.js";

// Re-export StreamEvent from code-core for backward compatibility
export type { StreamEvent } from "@sylphx/code-core";

/**
 * StreamPublisher - Unified event publishing interface
 *
 * Replaces tRPC Observer pattern with direct eventStream publishing.
 * All streaming events go through this interface to the Lens event stream.
 *
 * Architecture:
 * - emit(): Publishes event to session-stream channel
 * - complete(): Signals stream completion
 * - error(): Publishes error and signals stream failure
 */
export interface StreamPublisher {
	/** Publish an event to the stream */
	emit(event: StreamEvent): void;
	/** Signal successful stream completion */
	complete(): void;
	/** Signal stream error */
	error(err: unknown): void;
}

/**
 * Create a StreamPublisher that publishes to eventStream
 */
export function createStreamPublisher(
	appContext: AppContext,
	sessionId: string,
): StreamPublisher {
	const channel = `session-stream:${sessionId}`;

	return {
		emit: (event: StreamEvent) => {
			appContext.eventStream
				.publish(channel, event)
				.catch((err) => {
					console.error("[StreamPublisher] Event publish error:", err);
				});
		},
		complete: () => {
			appContext.eventStream
				.publish(channel, { type: "complete" as const })
				.catch((err) => {
					console.error("[StreamPublisher] Complete publish error:", err);
				});
		},
		error: (err: unknown) => {
			appContext.eventStream
				.publish(channel, {
					type: "error" as const,
					error: err instanceof Error ? err.message : String(err),
				})
				.catch((publishErr) => {
					console.error("[StreamPublisher] Error publish error:", publishErr);
				});
		},
	};
}

/**
 * Parsed content part from frontend (ChatGPT-style architecture)
 * Files uploaded immediately on paste/select, only fileId reference sent
 */
export type ParsedContentPart =
	| { type: "text"; content: string }
	| {
			type: "file";
			fileId: string; // Reference to uploaded file in object storage
			relativePath: string;
			size: number;
			mimeType: string;
	  };

/**
 * Options for streamAIResponse function
 */
export interface StreamAIResponseOptions {
	appContext: AppContext;
	sessionRepository: SessionRepository;
	messageRepository: MessageRepository;
	aiConfig: AIConfig;
	sessionId: string | null; // null = create new session
	agentId?: string; // Optional - override session agent
	provider?: ProviderId; // Required if sessionId is null
	model?: string; // Required if sessionId is null

	// User message content to add before streaming
	// - If provided: adds new user message with this content, then streams AI response
	// - If undefined/null: uses existing session messages only (e.g., after compact)
	userMessageContent?: ParsedContentPart[] | null;

	abortSignal?: AbortSignal;
}
