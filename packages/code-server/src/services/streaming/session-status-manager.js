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
import { emitSessionUpdated } from "./event-emitter.js";
/**
 * Determine status text based on current activity
 * Priority: in_progress todo > tool name > default "Thinking..."
 */
function determineStatusText(todos, currentToolName) {
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
export function createSessionStatusManager(observer, sessionId, session, appContext) {
    // Internal state
    let currentTool = null;
    let currentTokens = session.totalTokens || 0;
    let baseContextTokens = session.baseContextTokens || 0;
    let startTime = Date.now();
    let todos = session.todos;
    let isActive = true;
    let updateInterval;
    let sessionTitle = session.title;
    /**
     * Emit session-updated event (model-level)
     * Publishes to both tRPC observable and EventStream
     */
    function emitStatus() {
        const statusText = determineStatusText(todos, currentTool ?? undefined);
        const duration = Date.now() - startTime;
        const status = {
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
        // Publish session entity to session:${id} channel (Lens format)
        // useLensSessionSubscription receives session entity directly
        appContext.eventStream.publish(`session:${sessionId}`, sessionUpdate);
    }
    /**
     * Callbacks for stream-orchestrator to invoke
     */
    const callbacks = {
        onToolCall: (toolName) => {
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
        onTokenUpdate: (tokens) => {
            currentTokens = tokens;
            emitStatus();
        },
        onTodoUpdate: (newTodos) => {
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
    const updateSessionMetadata = (updates) => {
        if (updates.title !== undefined)
            sessionTitle = updates.title;
        if (updates.totalTokens !== undefined)
            currentTokens = updates.totalTokens;
        if (updates.baseContextTokens !== undefined)
            baseContextTokens = updates.baseContextTokens;
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
//# sourceMappingURL=session-status-manager.js.map