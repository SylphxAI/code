/**
 * Session Status Manager
 * Manages session status and emits updates via eventStream
 *
 * Architecture: Pub-Sub pattern with direct eventStream publishing
 * - Provides callbacks for stream-orchestrator to call
 * - Maintains internal state (currentTool, tokenUsage, etc.)
 * - Publishes session-status-updated when state changes
 * - Separation of concerns: Tool execution doesn't know about status
 */

import type { Session, SessionStatus, Todo } from "@sylphx/code-core";
import { emitSessionUpdated } from "./event-emitter.js";
import type { StreamPublisher } from "./types.js";
import type { AppContext } from "../../context.js";

/**
 * Callbacks for stream-orchestrator to invoke
 * These are the "subscription" points
 */
export interface SessionStatusCallbacks {
	onToolCall: (toolName: string) => void;
	onToolResult: () => void;
	onToolError: () => void;
	onTokenUpdate: (tokenUsage: number) => void;
	onTodoUpdate: (todos: Todo[]) => void;
	onStreamEnd: () => void;
}

/**
 * Session Status Manager instance
 */
export interface SessionStatusManager {
	callbacks: SessionStatusCallbacks;
	cleanup: () => void;
}

/**
 * Determine status text based on current activity
 * Priority: completed > in_progress todo > tool name > default "Thinking..."
 */
function determineStatusText(
	todos: Todo[] | undefined,
	currentToolName: string | undefined,
	isActive: boolean,
): string {
	// 0. If stream has completed, show "Complete"
	if (!isActive) {
		return "Complete";
	}

	// 1. Check for in_progress todo
	if (todos) {
		const inProgressTodo = todos.find((t) => t.status === "in_progress");
		if (inProgressTodo && inProgressTodo.activeForm) {
			return inProgressTodo.activeForm;
		}
	}

	// 2. Use tool name if available
	if (currentToolName) {
		// Map tool names to readable status text
		switch (currentToolName) {
			case "Read":
			case "Glob":
			case "Grep":
				return "Reading files...";
			case "Write":
			case "Edit":
				return "Writing code...";
			case "Bash":
				return "Running command...";
			case "WebFetch":
			case "WebSearch":
				return "Searching web...";
			case "updateTodos":
				return "Updating tasks...";
			default:
				return `Using ${currentToolName}...`;
		}
	}

	// 3. Default
	return "Thinking...";
}

/**
 * Create session status manager
 * Maintains state and emits session-updated events
 *
 * @param publisher - StreamPublisher for emitting events
 * @param sessionId - Session ID
 * @param session - Full session model
 * @param appContext - App context for event stream publishing
 * @returns Manager instance with callbacks and cleanup function
 */
export function createSessionStatusManager(
	publisher: StreamPublisher,
	sessionId: string,
	session: Session,
	appContext: AppContext,
): SessionStatusManager {
	// Internal state
	let currentTool: string | null = null;
	let currentTokens = session.totalTokens || 0;
	let startTime = Date.now();
	let todos = session.todos;
	let isActive = true;
	// NOTE: title is NOT managed here - it's handled by inline-action-dispatcher
	// to avoid race conditions during title streaming

	// Debounce token updates (emit at most every 500ms)
	let lastTokenEmitTime = 0;
	let pendingTokenEmit: NodeJS.Timeout | null = null;
	const TOKEN_DEBOUNCE_MS = 500;

	/**
	 * Emit session-status-updated event
	 * Publishes via StreamPublisher and also directly to eventStream for field-level updates
	 */
	function emitStatus() {
		const statusText = determineStatusText(todos, currentTool ?? undefined, isActive);
		const duration = Date.now() - startTime;

		const status: SessionStatus = {
			text: statusText,
			duration,
			tokenUsage: currentTokens,
			isActive,
		};

		// Emit session status update via StreamPublisher
		// NOTE: title is NOT included - managed separately by inline-action-dispatcher
		// NOTE: totalTokens/baseContextTokens are NOT included - managed by token-tracking.service
		const sessionUpdate = {
			id: sessionId,
			status,
			updatedAt: Date.now(),
		};
		emitSessionUpdated(publisher, sessionId, sessionUpdate);

		// Also publish field-level event for Lens Live Query
		// getSession.subscribe() handles this via emit.set("status", ...)
		appContext.eventStream.publish(`session-stream:${sessionId}`, {
			type: "session-status-updated",
			sessionId,
			status,
		});
	}

	/**
	 * Callbacks for stream-orchestrator to invoke
	 */
	const callbacks: SessionStatusCallbacks = {
		onToolCall: (toolName: string) => {
			currentTool = toolName;
			emitStatus();
		},

		onToolResult: () => {
			currentTool = null;
			emitStatus();
		},

		onToolError: () => {
			currentTool = null;
			emitStatus();
		},

		onTokenUpdate: (tokens: number) => {
			currentTokens = tokens;
			// Debounce token updates - too frequent otherwise
			const now = Date.now();
			if (now - lastTokenEmitTime >= TOKEN_DEBOUNCE_MS) {
				lastTokenEmitTime = now;
				emitStatus();
			} else if (!pendingTokenEmit) {
				// Schedule a delayed emit to ensure final value is sent
				pendingTokenEmit = setTimeout(() => {
					pendingTokenEmit = null;
					lastTokenEmitTime = Date.now();
					emitStatus();
				}, TOKEN_DEBOUNCE_MS);
			}
		},

		onTodoUpdate: (newTodos: Todo[]) => {
			todos = newTodos;
			emitStatus();
		},

		onStreamEnd: () => {
			isActive = false;
			emitStatus();
		},
	};

	// Emit initial status
	emitStatus();

	// NOTE: Removed 1-second interval for duration updates
	// Client (StatusIndicator) tracks duration locally for smooth 100ms updates
	// Server only needs to emit on actual state changes (tool call, token update, etc.)

	/**
	 * Cleanup: Clear pending timers and emit final status
	 */
	function cleanup() {
		isActive = false;
		if (pendingTokenEmit) {
			clearTimeout(pendingTokenEmit);
			pendingTokenEmit = null;
		}
		emitStatus(); // Final status with isActive: false
	}

	return { callbacks, cleanup };
}
