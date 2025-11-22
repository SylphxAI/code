/**
 * Session Status Manager
 * Subscribes to streaming events and emits session-status-updated
 *
 * Architecture: Pub-Sub pattern
 * - Provides callbacks for stream-orchestrator to call
 * - Maintains internal state (currentTool, tokenUsage, etc.)
 * - Emits session-status-updated when state changes
 * - Separation of concerns: Tool execution doesn't know about status
 */

import type { SessionStatus, Todo } from "@sylphx/code-core";
import type { Observer } from "@trpc/server/observable";
import { emitSessionStatusUpdated } from "./event-emitter.js";
import type { StreamEvent } from "./types.js";

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
 * Priority: in_progress todo > tool name > default "Thinking..."
 */
function determineStatusText(todos: Todo[] | undefined, currentToolName?: string): string {
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
 * Maintains state and emits session-status-updated events
 *
 * @param observer - tRPC observer to emit events
 * @param sessionId - Session ID
 * @param initialTodos - Initial todos from session
 * @returns Manager instance with callbacks and cleanup function
 */
export function createSessionStatusManager(
	observer: Observer<StreamEvent, unknown>,
	sessionId: string,
	initialTodos: Todo[] | undefined,
): SessionStatusManager {
	// Internal state
	let currentTool: string | null = null;
	let tokenUsage = 0;
	let startTime = Date.now();
	let todos = initialTodos;
	let isActive = true;
	let updateInterval: NodeJS.Timeout;

	/**
	 * Emit session-status-updated event
	 */
	function emitStatus() {
		const statusText = determineStatusText(todos, currentTool ?? undefined);
		const duration = Date.now() - startTime;

		const status: SessionStatus = {
			text: statusText,
			duration,
			tokenUsage,
			isActive,
		};

		console.log("[SessionStatusManager] Emitting status:", {
			sessionId,
			text: statusText,
			duration,
			tokenUsage,
			isActive,
			currentTool,
			todosCount: todos?.length || 0,
		});

		emitSessionStatusUpdated(observer, sessionId, status);
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
			tokenUsage = tokens;
			emitStatus();
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

	// Update duration every second (while active)
	updateInterval = setInterval(() => {
		if (isActive) {
			emitStatus();
		}
	}, 1000);

	/**
	 * Cleanup: Stop interval and emit final status
	 */
	function cleanup() {
		isActive = false;
		clearInterval(updateInterval);
		emitStatus(); // Final status with isActive: false
	}

	return { callbacks, cleanup };
}
