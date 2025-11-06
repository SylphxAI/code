/**
 * Session Types
 * Unified session and message types used across TUI and headless modes
 */

import type { ProviderId } from '../config/ai-config.js';
import type { Todo } from './todo.types.js';

/**
 * Message Part - unified type for all content parts
 *
 * ALL parts have status field to track their lifecycle state:
 * - 'active': Being generated/processed
 * - 'completed': Successfully finished
 * - 'error': Failed with error
 * - 'abort': User cancelled
 *
 * Design: No separate "StreamingPart" type needed
 * - Streaming parts ARE message parts
 * - Status field tracks state during and after streaming
 * - No conversion required between streaming/stored formats
 *
 * Multiple parts can be active simultaneously (parallel tool calls).
 */
export type MessagePart =
  | {
      type: 'text';
      content: string;
      status: 'active' | 'completed' | 'error' | 'abort';
    }
  | {
      type: 'reasoning';
      content: string;
      status: 'active' | 'completed' | 'error' | 'abort';
      duration?: number;
      startTime?: number;
    }
  | {
      type: 'tool';
      toolId: string;
      name: string;
      status: 'active' | 'completed' | 'error' | 'abort';
      args?: unknown;
      result?: unknown;
      error?: string;
      duration?: number;
      startTime?: number;
    }
  | {
      type: 'error';
      error: string;
      status: 'completed';  // Errors are immediately completed
    };

/**
 * Legacy type alias for backwards compatibility
 * @deprecated Use MessagePart directly
 */
export type StreamingPart = MessagePart;

/**
 * Message Step - represents one reasoning/generation cycle
 *
 * Design: Multi-step reasoning support
 * ====================================
 *
 * Why steps:
 * 1. Track per-step costs (usage, provider, model)
 * 2. Support multi-step tool execution (tool-calls → process results → continue)
 * 3. Enable future routing (different models for different steps)
 * 4. Better analytics (which step is slowest/most expensive)
 *
 * Step lifecycle:
 * - status: 'active' → generating this step
 * - status: 'completed' → step finished successfully
 * - status: 'error' → step failed
 * - status: 'abort' → user cancelled
 *
 * Step boundaries (when to start new step):
 * - finishReason === 'tool-calls' → automatic new step for processing tool results
 * - finishReason === 'stop' → end of message, no new step
 * - finishReason === 'length' → token limit, may continue in new step
 */
export interface MessageStep {
  id: string;              // Step ID (e.g., "step-0", "step-1")
  stepIndex: number;       // 0, 1, 2, ... (order)
  parts: MessagePart[];    // Content parts for this step

  // Per-step metadata
  usage?: TokenUsage;
  provider?: string;       // Future: may route different steps to different providers
  model?: string;          // Future: may use different models per step
  duration?: number;       // Step execution time (ms)
  finishReason?: 'stop' | 'tool-calls' | 'length' | 'error';
  status: 'active' | 'completed' | 'error' | 'abort';

  startTime?: number;      // Timestamp when step started
  endTime?: number;        // Timestamp when step ended
}

/**
 * File attachment
 */
export interface FileAttachment {
  path: string;
  relativePath: string;
  size?: number;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Message metadata - system information at message creation time
 *
 * IMPORTANT: This metadata is captured ONCE when the message is created and NEVER changes.
 * This is critical for prompt cache effectiveness - historical messages must remain immutable.
 *
 * Design decisions:
 * 1. Stored separately from content - not shown in UI, only sent to LLM
 * 2. Captured at creation time - never updated to preserve prompt cache
 * 3. Used to build system status context when constructing ModelMessage for LLM
 *
 * What goes in metadata vs top-level fields:
 * - metadata: Info for LLM but NOT shown in UI (cpu, memory, future: sessionId, requestId)
 * - usage/finishReason: Info for UI/monitoring but NOT sent to LLM
 * - timestamp: Shown in UI AND used to construct metadata for LLM
 * - content: Shown in UI AND sent to LLM
 */
export interface MessageMetadata {
  cpu?: string;         // CPU usage at creation time (e.g., "45.3% (8 cores)")
  memory?: string;      // Memory usage at creation time (e.g., "4.2GB/16.0GB")
  // Future: add more fields as needed (sessionId, requestId, modelVersion, etc.)
}

/**
 * Session message - Unified message type for both UI display and LLM consumption
 *
 * Design: Step-based multi-turn reasoning
 * ========================================
 *
 * NEW: Messages contain steps[] instead of direct content[]
 * Each step represents one reasoning/generation cycle with its own metadata
 *
 * UI Display (what user sees):
 * - steps[]: Array of MessageStep, each with parts[], usage, duration
 * - User messages: Always single step
 * - Assistant messages: May have multiple steps (tool calls → process → continue)
 * - timestamp: Display time
 * - attachments: Show file paths
 *
 * LLM Context (what AI sees):
 * - steps[].parts: Converted to ModelMessage format
 * - metadata: Injected as system status (cpu, memory) - NOT shown in UI
 * - timestamp: Used to construct system status time
 * - attachments: File contents read and injected
 * - todoSnapshot: Todo state at message creation, injected as context
 *
 * Why steps not content:
 * - Track per-step costs (usage, provider, model, duration)
 * - Support multi-step tool execution clearly
 * - Enable future routing (different models per step)
 * - Better analytics and debugging
 *
 * Why usage/finishReason still at message level:
 * - usage: Sum of all steps (for total cost tracking)
 * - finishReason: Final reason (from last step)
 * - Convenience for UI - don't need to traverse steps
 *
 * Why todoSnapshot at top-level (not in metadata):
 * - Structured data (Todo[]), not string context like cpu/memory
 * - Enables rewind feature - can restore todo state at any point in conversation
 * - May be used by UI for historical view
 * - Clearer separation: metadata = simple context, todoSnapshot = structured state
 */
export interface SessionMessage {
  id: string;              // Unique message ID from database
  role: 'user' | 'assistant';
  steps: MessageStep[];    // NEW: Step-based content (replaces content[])
  timestamp: number;
  status?: 'active' | 'completed' | 'error' | 'abort';  // Message lifecycle state (default: 'completed')
  metadata?: MessageMetadata;  // System info for LLM context (not shown in UI)
  todoSnapshot?: Todo[];   // Full todo state at message creation time (for rewind + LLM context)
  attachments?: FileAttachment[];
  usage?: TokenUsage;          // Total usage (sum of all steps) for UI/monitoring
  finishReason?: string;       // Final finish reason (from last step)
}

/**
 * Session metadata (lightweight)
 * Used for lists and selection UI - no messages or todos included
 *
 * Design: Data on demand
 * ======================
 * - SessionMetadata: Lightweight, for lists/selection (this type)
 * - Session: Full data with messages/todos (below)
 *
 * Why separate types:
 * - Avoids loading all messages when showing session list
 * - Efficient cursor-based pagination
 * - Clear API contracts (metadata vs full session)
 */
export interface SessionMetadata {
  id: string;
  title?: string;
  provider: ProviderId;
  model: string;
  agentId: string;
  created: number;
  updated: number;
  messageCount: number;
}

/**
 * Chat session
 *
 * Design: Per-session todo lists
 * ================================
 *
 * Why todos are scoped to sessions (not global):
 * 1. Context isolation - Each conversation has its own task context
 * 2. Prevents cross-contamination - New session won't see old todos
 * 3. LLM clarity - AI only sees tasks relevant to current conversation
 *
 * Before (global todos):
 * - Session A creates todos ["Build feature X", "Test feature X"]
 * - Session B starts, user says "hi"
 * - LLM sees Session A's todos and tries to complete them ❌
 *
 * After (per-session todos):
 * - Session A has its own todos
 * - Session B starts with empty todos ✅
 * - Each session manages independent task lists
 *
 * Implementation notes:
 * - nextTodoId is also per-session to avoid ID conflicts
 * - Todos are persisted with session to disk
 * - updateTodos tool requires sessionId parameter
 *
 * Design: Message status-based state
 * ===================================
 *
 * Streaming state is derived from message status, not stored separately:
 * - message.status: 'active' | 'completed' | 'error' | 'abort'
 * - part.status: 'active' | 'completed' | 'error' | 'abort'
 *
 * Session recovery:
 * 1. Find messages with status === 'active'
 * 2. Display their parts directly
 * 3. No separate streaming state needed
 *
 * Streaming lifecycle:
 * 1. User sends message → Create message with status='active'
 * 2. Parts arrive → Add/update parts in message
 * 3. User switches session → Message stays in DB with status='active'
 * 4. Streaming completes → Update message status='completed'
 * 5. User aborts (ESC) → Update message status='abort'
 *
 * Benefits:
 * - Single source of truth (message data)
 * - No conversion between streaming/persistent formats
 * - Recovery is just "display active messages"
 * - Archives naturally (status='archived')
 */
export interface Session {
  id: string;
  title?: string; // Auto-generated from first user message
  provider: ProviderId;
  model: string;
  agentId: string;         // Agent configuration for this session
  enabledRuleIds: string[]; // Enabled rules for this session (persisted to DB)
  messages: SessionMessage[];
  todos: Todo[];           // Per-session todo list (not global!)
  nextTodoId: number;      // Next todo ID for this session (starts at 1)

  // Note: Streaming state derived from message.status, not stored here
  // To check if streaming: messages.some(m => m.status === 'active')

  created: number;
  updated: number;
}
