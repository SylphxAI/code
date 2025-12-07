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
import type { Session, Todo } from "@sylphx/code-core";
import type { Observer } from "@trpc/server/observable";
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
 * Create session status manager
 * Maintains state and emits session-updated events (model-level)
 *
 * @param observer - tRPC observer to emit events
 * @param sessionId - Session ID
 * @param session - Full session model
 * @param appContext - App context for event stream publishing
 * @returns Manager instance with callbacks and cleanup function
 */
export declare function createSessionStatusManager(observer: Observer<StreamEvent, unknown>, sessionId: string, session: Session, appContext: AppContext): SessionStatusManager;
//# sourceMappingURL=session-status-manager.d.ts.map