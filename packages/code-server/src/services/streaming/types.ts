/**
 * Type Definitions for Streaming Service
 * All TypeScript types used across streaming modules
 */

import type {
	SessionRepository,
	MessageRepository,
	AIConfig,
	ProviderId,
	StreamEvent,
} from "@sylphx/code-core";
import type { AppContext } from "../../context.js";

// Re-export StreamEvent from code-core for backward compatibility
export type { StreamEvent } from "@sylphx/code-core";

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
