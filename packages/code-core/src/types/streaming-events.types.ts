/**
 * Streaming Event Types
 * Proper type definitions for streaming events with discriminated unions
 */

import type { Todo } from "./todo.types.js";
import type { TokenUsage } from "./session.types.js";

/**
 * System message in streaming context
 */
export interface StreamSystemMessage {
	type: string;
	content: string;
	timestamp: number;
}

/**
 * Tool input type - structured parameters for tool execution
 * Uses Record<string, unknown> for dynamic tool parameters
 */
export type ToolInput = Record<string, unknown>;

/**
 * Tool result type - discriminated union for success/error states
 * Prevents illegal states (success with error, or failure with result)
 */
export type ToolResult =
	| {
			success: true;
			output: unknown;
			duration?: number;
	  }
	| {
			success: false;
			error: string;
			duration?: number;
	  };

/**
 * Todo snapshot type - array of todos at a specific point in time
 */
export type TodoSnapshot = Todo[];

/**
 * Stream events emitted during AI response generation
 * Discriminated union ensures type safety for event handling
 */
export type StreamEvent =
	// Session-level events
	| {
			type: "session-created";
			sessionId: string;
			provider: string;
			model: string;
	  }
	| { type: "session-updated"; sessionId: string }
	| {
			type: "session-tokens-updated";
			sessionId: string;
			totalTokens: number;
			baseContextTokens: number;
	  }
	| { type: "session-title-updated-start"; sessionId: string }
	| { type: "session-title-updated-delta"; sessionId: string; text: string }
	| { type: "session-title-updated-end"; sessionId: string; title: string }

	// Message-level events
	| { type: "user-message-created"; messageId: string; content: string }
	| { type: "assistant-message-created"; messageId: string }
	| { type: "system-message-created"; messageId: string; content: string }
	| {
			type: "message-status-updated";
			messageId: string;
			status: "active" | "completed" | "error" | "abort";
			usage?: TokenUsage;
			finishReason?: string;
	  }

	// Step-level events
	| {
			type: "step-start";
			stepId: string;
			stepIndex: number;
			todoSnapshot: TodoSnapshot;
			systemMessages?: StreamSystemMessage[];
			provider?: string;
			model?: string;
	  }
	| {
			type: "step-complete";
			stepId: string;
			usage: TokenUsage;
			duration: number;
			finishReason: string;
	  }

	// Content streaming events (within a step)
	| { type: "text-start" }
	| { type: "text-delta"; text: string }
	| { type: "text-end" }
	| { type: "reasoning-start" }
	| { type: "reasoning-delta"; text: string }
	| { type: "reasoning-end"; duration: number }
	| { type: "tool-call"; toolCallId: string; toolName: string; input: ToolInput }
	| { type: "tool-input-start"; toolCallId: string }
	| { type: "tool-input-delta"; toolCallId: string; inputTextDelta: string }
	| { type: "tool-input-end"; toolCallId: string }
	| {
			type: "tool-result";
			toolCallId: string;
			toolName: string;
			result: unknown; // Tool results are dynamic, validated at runtime
			duration: number;
	  }
	| {
			type: "tool-error";
			toolCallId: string;
			toolName: string;
			error: string;
			duration: number;
	  }
	| { type: "file"; mediaType: string; base64: string }

	// Ask tool events (user input requests)
	| {
			type: "ask-question-start";
			sessionId: string;
			toolCallId: string;
			question: string;
			options: Array<{
				label: string;
				value?: string;
				description?: string;
				freeText?: boolean;
				placeholder?: string;
			}>;
			multiSelect?: boolean;
			preSelected?: string[];
	  }
	| {
			type: "ask-question-answered";
			sessionId: string;
			toolCallId: string;
			answer: string;
	  }

	// Error events
	| { type: "error"; error: string };
