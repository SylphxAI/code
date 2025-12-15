/**
 * Session Status Manager
 * Manages session status updates via SessionStore (SSOT)
 *
 * Architecture:
 * - Uses SessionStore as Single Source of Truth
 * - Provides callbacks for stream-orchestrator to invoke
 * - Updates store.setCurrentTool() and store.setTodos()
 * - Store handles status computation and event emission
 *
 * @owner of SessionStore.setStatus(), SessionStore.setCurrentTool()
 */

import type { Session, Todo } from "@sylphx/code-core";
import { createLogger } from "@sylphx/code-core";
import type { AppContext } from "../../context.js";
import { getExistingSessionStore, type SessionStore } from "../session-store.js";

const log = createLogger("session-status-manager");

/**
 * Callbacks for stream-orchestrator to invoke
 */
export interface SessionStatusCallbacks {
	onToolCall: (toolName: string) => void;
	onToolResult: () => void;
	onToolError: () => void;
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
 * Create session status manager
 * Uses SessionStore for state management and event emission
 *
 * @param sessionId - Session ID
 * @param session - Full session model (for initial state)
 * @param appContext - App context
 * @returns Manager instance with callbacks and cleanup function
 */
export function createSessionStatusManager(
	_publisher: unknown, // Kept for backward compatibility, no longer used
	sessionId: string,
	session: Session,
	appContext: AppContext,
): SessionStatusManager {
	// Get or log warning if store doesn't exist
	const store = getExistingSessionStore(sessionId);
	if (!store) {
		log("WARNING: SessionStore not found for session %s", sessionId);
	}

	/**
	 * Update status in store
	 */
	function updateStatus() {
		const currentStore = getExistingSessionStore(sessionId);
		if (currentStore) {
			currentStore.updateStatusFromState();
		}
	}

	/**
	 * Callbacks for stream-orchestrator to invoke
	 */
	const callbacks: SessionStatusCallbacks = {
		onToolCall: (toolName: string) => {
			log("onToolCall sessionId=%s tool=%s", sessionId, toolName);
			const currentStore = getExistingSessionStore(sessionId);
			if (currentStore) {
				currentStore.setCurrentTool(toolName);
				currentStore.updateStatusFromState();
			}
		},

		onToolResult: () => {
			log("onToolResult sessionId=%s", sessionId);
			const currentStore = getExistingSessionStore(sessionId);
			if (currentStore) {
				currentStore.setCurrentTool(null);
				currentStore.updateStatusFromState();
			}
		},

		onToolError: () => {
			log("onToolError sessionId=%s", sessionId);
			const currentStore = getExistingSessionStore(sessionId);
			if (currentStore) {
				currentStore.setCurrentTool(null);
				currentStore.updateStatusFromState();
			}
		},

		onTodoUpdate: (newTodos: Todo[]) => {
			log("onTodoUpdate sessionId=%s count=%d", sessionId, newTodos.length);
			const currentStore = getExistingSessionStore(sessionId);
			if (currentStore) {
				currentStore.setTodos(newTodos);
				currentStore.updateStatusFromState();
			}
		},

		onStreamEnd: () => {
			log("onStreamEnd sessionId=%s", sessionId);
			const currentStore = getExistingSessionStore(sessionId);
			if (currentStore) {
				currentStore.endStreaming();
			}
		},
	};

	// Emit initial status
	updateStatus();

	/**
	 * Cleanup: Ensure final status is emitted
	 */
	function cleanup() {
		log("cleanup sessionId=%s", sessionId);
		const currentStore = getExistingSessionStore(sessionId);
		if (currentStore) {
			currentStore.endStreaming();
		}
	}

	return { callbacks, cleanup };
}
