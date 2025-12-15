/**
 * Session Store - Single Source of Truth (SSOT) for session state
 *
 * Architecture:
 * - One store per active session
 * - Typed setters with clear ownership (JSDoc)
 * - State is never copied - services read from store
 * - Store emits events, services don't emit directly
 *
 * Ownership Model:
 * - setTokens()    → token-tracking.service (only)
 * - setStatus()    → session-status-manager (only)
 * - setTitle()     → inline-action-dispatcher (only)
 * - setStreaming() → stream-orchestrator (only)
 *
 * Anyone can READ via getState(), getTokens(), etc.
 */

import type { SessionStatus, Todo } from "@sylphx/code-core";
import { createLogger } from "@sylphx/code-core";
import type { AppContext } from "../context.js";

const log = createLogger("session-store");

// ============================================================================
// Types
// ============================================================================

export interface SessionState {
	// Persistent state (saved to DB)
	totalTokens: number;
	baseContextTokens: number;
	title: string;
	todos: Todo[];

	// Transient state (in-memory only)
	status: SessionStatus;
	isStreaming: boolean;
	currentTool: string | null;
}

const DEFAULT_STATUS: SessionStatus = {
	text: "Ready",
	duration: 0,
	tokenUsage: 0,
	isActive: false,
};

// ============================================================================
// SessionStore Class
// ============================================================================

export class SessionStore {
	private state: SessionState;
	private readonly sessionId: string;
	private readonly appContext: AppContext;
	private streamStartTime: number | null = null;

	constructor(
		sessionId: string,
		appContext: AppContext,
		initialState?: Partial<SessionState>,
	) {
		this.sessionId = sessionId;
		this.appContext = appContext;
		this.state = {
			totalTokens: initialState?.totalTokens ?? 0,
			baseContextTokens: initialState?.baseContextTokens ?? 0,
			title: initialState?.title ?? "",
			todos: initialState?.todos ?? [],
			status: initialState?.status ?? DEFAULT_STATUS,
			isStreaming: initialState?.isStreaming ?? false,
			currentTool: initialState?.currentTool ?? null,
		};
	}

	// =========================================================================
	// Getters (Anyone can read)
	// =========================================================================

	getState(): Readonly<SessionState> {
		return this.state;
	}

	getTokens(): { total: number; base: number } {
		return {
			total: this.state.totalTokens,
			base: this.state.baseContextTokens,
		};
	}

	getStatus(): SessionStatus {
		return this.state.status;
	}

	getTitle(): string {
		return this.state.title;
	}

	getTodos(): Todo[] {
		return this.state.todos;
	}

	isStreaming(): boolean {
		return this.state.isStreaming;
	}

	// =========================================================================
	// Setters (Clear ownership via JSDoc)
	// =========================================================================

	/**
	 * Update token counts
	 * @owner token-tracking.service
	 */
	setTokens(totalTokens: number, baseContextTokens: number): void {
		this.state.totalTokens = totalTokens;
		this.state.baseContextTokens = baseContextTokens;

		this.emit("session-tokens-updated", {
			totalTokens,
			baseContextTokens,
		});
	}

	/**
	 * Update session status (text, duration, isActive)
	 * Only emits when text or isActive changes (not duration)
	 * Client calculates duration locally for smooth updates
	 * @owner session-status-manager
	 */
	setStatus(status: SessionStatus): void {
		const prev = this.state.status;
		this.state.status = status;

		// Only emit when meaningful fields change (not duration)
		// Duration changes every millisecond - client tracks it locally
		const textChanged = prev.text !== status.text;
		const activeChanged = prev.isActive !== status.isActive;
		const tokensChanged = prev.tokenUsage !== status.tokenUsage;

		if (textChanged || activeChanged || tokensChanged) {
			log("setStatus sessionId=%s status=%o (changed: text=%s active=%s tokens=%s)",
				this.sessionId, status, textChanged, activeChanged, tokensChanged);

			this.emit("session-status-updated", {
				status,
			});
		}
	}

	/**
	 * Update session title
	 * @owner inline-action-dispatcher
	 */
	setTitle(title: string): void {
		this.state.title = title;

		log("setTitle sessionId=%s title=%s", this.sessionId, title);

		this.emit("session-title-updated", {
			title,
		});
	}

	/**
	 * Update todos list
	 * @owner todo-tool
	 */
	setTodos(todos: Todo[]): void {
		this.state.todos = todos;

		log("setTodos sessionId=%s count=%d", this.sessionId, todos.length);

		// Note: todos are also published via session-updated for now
		// This keeps backward compatibility
	}

	/**
	 * Update current tool being executed
	 * @owner session-status-manager
	 */
	setCurrentTool(toolName: string | null): void {
		this.state.currentTool = toolName;
		// No separate event - this affects status text
	}

	/**
	 * Start streaming - initializes stream state
	 * @owner stream-orchestrator
	 */
	startStreaming(): void {
		this.state.isStreaming = true;
		this.streamStartTime = Date.now();
		this.state.currentTool = null;

		log("startStreaming sessionId=%s", this.sessionId);

		this.setStatus({
			text: "Thinking...",
			duration: 0,
			tokenUsage: this.state.totalTokens,
			isActive: true,
		});
	}

	/**
	 * End streaming - finalizes stream state
	 * @owner stream-orchestrator
	 */
	endStreaming(): void {
		this.state.isStreaming = false;
		this.state.currentTool = null;

		const duration = this.streamStartTime ? Date.now() - this.streamStartTime : 0;
		this.streamStartTime = null;

		log("endStreaming sessionId=%s duration=%d", this.sessionId, duration);

		this.setStatus({
			text: "Complete",
			duration,
			tokenUsage: this.state.totalTokens,
			isActive: false,
		});
	}

	/**
	 * Get current stream duration (for status updates)
	 */
	getStreamDuration(): number {
		return this.streamStartTime ? Date.now() - this.streamStartTime : 0;
	}

	// =========================================================================
	// Composite Updates (for atomic multi-field updates)
	// =========================================================================

	/**
	 * Update status based on current state
	 * Computes status text from todos, currentTool, etc.
	 * @owner session-status-manager
	 */
	updateStatusFromState(): void {
		const statusText = this.computeStatusText();
		const duration = this.getStreamDuration();

		this.setStatus({
			text: statusText,
			duration,
			tokenUsage: this.state.totalTokens,
			isActive: this.state.isStreaming,
		});
	}

	/**
	 * Compute status text based on priority:
	 * 1. Not streaming → "Complete" or "Ready"
	 * 2. In-progress todo
	 * 3. Current tool
	 * 4. Default "Thinking..."
	 */
	private computeStatusText(): string {
		if (!this.state.isStreaming) {
			return this.state.status.text === "Complete" ? "Complete" : "Ready";
		}

		// Check for in_progress todo
		const inProgressTodo = this.state.todos.find((t) => t.status === "in_progress");
		if (inProgressTodo?.activeForm) {
			return inProgressTodo.activeForm;
		}

		// Check current tool
		if (this.state.currentTool) {
			return this.getToolStatusText(this.state.currentTool);
		}

		return "Thinking...";
	}

	/**
	 * Map tool name to readable status text
	 */
	private getToolStatusText(toolName: string): string {
		switch (toolName) {
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
				return `Using ${toolName}...`;
		}
	}

	// =========================================================================
	// Private Helpers
	// =========================================================================

	private emit(type: string, payload: Record<string, unknown>): void {
		const channel = `session-stream:${this.sessionId}`;
		this.appContext.eventStream.publish(channel, {
			type,
			sessionId: this.sessionId,
			...payload,
		});
	}
}

// ============================================================================
// Store Registry (One store per active session)
// ============================================================================

const sessionStores = new Map<string, SessionStore>();

/**
 * Get or create a SessionStore for the given session
 */
export function getSessionStore(
	sessionId: string,
	appContext: AppContext,
	initialState?: Partial<SessionState>,
): SessionStore {
	let store = sessionStores.get(sessionId);
	if (!store) {
		store = new SessionStore(sessionId, appContext, initialState);
		sessionStores.set(sessionId, store);
		log("getSessionStore CREATED sessionId=%s", sessionId);
	}
	return store;
}

/**
 * Create a new SessionStore (replaces existing if any)
 */
export function createSessionStore(
	sessionId: string,
	appContext: AppContext,
	initialState?: Partial<SessionState>,
): SessionStore {
	const store = new SessionStore(sessionId, appContext, initialState);
	sessionStores.set(sessionId, store);
	log("createSessionStore sessionId=%s", sessionId);
	return store;
}

/**
 * Delete a SessionStore when session ends
 */
export function deleteSessionStore(sessionId: string): void {
	sessionStores.delete(sessionId);
	log("deleteSessionStore sessionId=%s", sessionId);
}

/**
 * Check if a SessionStore exists
 */
export function hasSessionStore(sessionId: string): boolean {
	return sessionStores.has(sessionId);
}

/**
 * Get existing store (returns undefined if not exists)
 */
export function getExistingSessionStore(sessionId: string): SessionStore | undefined {
	return sessionStores.get(sessionId);
}
