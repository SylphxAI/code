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

import type { Session, SessionStatus, Todo } from "@sylphx/code-core";
import type { Observer } from "@trpc/server/observable";
import { emitSessionUpdated } from "./event-emitter.js";
import type { StreamEvent } from "./types.js";
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
 * Maintains state and emits session-updated events (model-level)
 *
 * @param observer - tRPC observer to emit events
 * @param sessionId - Session ID
 * @param session - Full session model
 * @param appContext - App context for event stream publishing
 * @returns Manager instance with callbacks and cleanup function
 */
export function createSessionStatusManager(
	observer: Observer<StreamEvent, unknown>,
	sessionId: string,
	session: Session,
	appContext: AppContext,
): SessionStatusManager {
	// Internal state
	let currentTool: string | null = null;
	let currentTokens = session.totalTokens || 0;
	let baseContextTokens = session.baseContextTokens || 0;
	let startTime = Date.now();
	let todos = session.todos;
	let isActive = true;
	let updateInterval: NodeJS.Timeout;
	let sessionTitle = session.title;

	/**
	 * Emit session-updated event (model-level)
	 * Only includes fields managed by status manager
	 */
	function emitStatus() {
		const statusText = determineStatusText(todos, currentTool ?? undefined);
		const duration = Date.now() - startTime;

		const status: SessionStatus = {
			text: statusText,
			duration,
			tokenUsage: currentTokens,
			isActive,
		};

		const sessionUpdate = {
			id: sessionId,
			title: sessionTitle,
			status,
			totalTokens: currentTokens,
			baseContextTokens,
			updatedAt: Date.now(),
		};

		// Emit to tRPC observable (mutation subscribers)
		emitSessionUpdated(observer, sessionId, sessionUpdate);

		// CRITICAL: Also publish to Lens EventStream for useEventStream hook
		// This enables optimistic reconciliation in handleSessionUpdated
		console.log("[session-status-manager] Publishing to EventStream:", {
			channel: `session:${sessionId}`,
			statusText: status.text,
			hasStatus: !!sessionUpdate.status,
			isActive,
		});
		appContext.eventStream.publish(`session:${sessionId}`, {
			type: "session-updated",
			sessionId,
			session: sessionUpdate,
		}).then(() => {
			console.log("[session-status-manager] EventStream publish SUCCESS");
		}).catch((err) => {
			console.error("[session-status-manager] Failed to publish to event stream:", err);
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

	/**
	 * Update session metadata (called when external updates occur)
	 */
	const updateSessionMetadata = (updates: {
		title?: string;
		totalTokens?: number;
		baseContextTokens?: number;
	}) => {
		if (updates.title !== undefined) sessionTitle = updates.title;
		if (updates.totalTokens !== undefined) currentTokens = updates.totalTokens;
		if (updates.baseContextTokens !== undefined) baseContextTokens = updates.baseContextTokens;
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
