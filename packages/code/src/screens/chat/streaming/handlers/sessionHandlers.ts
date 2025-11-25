/**
 * Session Event Handlers
 * Handles session lifecycle and title events
 */

import {
	currentSession,
	getCurrentSessionId,
	setCurrentSessionId,
	setCurrentSession,
} from "@sylphx/code-client";
import { createLogger } from "@sylphx/code-core";
import type { StreamEvent } from "@sylphx/code-server";
import type { EventHandlerContext } from "../types.js";

// Create debug logger
const logSession = createLogger("subscription:session");

// ============================================================================
// Session Events
// ============================================================================

export function handleSessionCreated(
	event: Extract<StreamEvent, { type: "session-created" }>,
	context: EventHandlerContext,
) {
	context.addLog(`[Session] Created: ${event.sessionId}`);

	// Get current session state to preserve optimistic messages
	const currentSessionValue = currentSession.value;

	// RACE CONDITION FIX: If the session was already transitioned by subscriptionAdapter
	// (mutation completed before event arrived), just skip - messages already preserved
	if (currentSessionValue?.id === event.sessionId && currentSessionValue.messages.length > 0) {
		logSession("Session already transitioned with messages, skipping event handler");
		return;
	}

	// Check if there's a temporary session with optimistic messages
	const optimisticMessages = currentSessionValue?.id === "temp-session" ? currentSessionValue.messages : [];

	logSession("Creating session, preserving optimistic messages:", optimisticMessages.length);

	// IMMUTABLE UPDATE: Create new session with optimistic messages preserved
	setCurrentSessionId(event.sessionId);
	setCurrentSession( {
		id: event.sessionId,
		title: "",
		agentId: "coder",
		provider: event.provider,
		model: event.model,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		messages: optimisticMessages, // Preserve optimistic user message
		todos: [],
		enabledRuleIds: [],
	});

	logSession("Created session with optimistic messages:", event.sessionId);
}

export function handleSessionDeleted(
	event: Extract<StreamEvent, { type: "session-deleted" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();

	if (event.sessionId === currentSessionId) {
		setCurrentSessionId(null);
		setCurrentSession( null);
		context.addLog(`[Session] Deleted: ${event.sessionId}`);
	}
}

export function handleSessionModelUpdated(
	event: Extract<StreamEvent, { type: "session-model-updated" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();
	const currentSessionValue = currentSession.value;

	if (event.sessionId === currentSessionId && currentSessionValue) {
		setCurrentSession({
			...currentSessionValue,
			model: event.model,
		});
		context.addLog(`[Session] Model updated: ${event.model}`);
	}
}

export function handleSessionProviderUpdated(
	event: Extract<StreamEvent, { type: "session-provider-updated" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();
	const currentSessionValue = currentSession.value;

	if (event.sessionId === currentSessionId && currentSessionValue) {
		setCurrentSession({
			...currentSessionValue,
			provider: event.provider,
			model: event.model,
		});
		context.addLog(`[Session] Provider updated: ${event.provider}`);
	}
}

// ============================================================================
// Title Events
// ============================================================================

export function handleSessionTitleUpdatedStart(
	event: Extract<StreamEvent, { type: "session-title-updated-start" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();

	if (event.sessionId === currentSessionId) {
		context.setIsTitleStreaming(true);
		context.setStreamingTitle("");
	}
}

export function handleSessionTitleUpdatedDelta(
	event: Extract<StreamEvent, { type: "session-title-updated-delta" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();

	if (event.sessionId === currentSessionId) {
		context.setStreamingTitle((prev) => prev + event.text);
	}
}

export function handleSessionTitleUpdatedEnd(
	event: Extract<StreamEvent, { type: "session-title-updated-end" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();

	if (event.sessionId === currentSessionId) {
		context.setIsTitleStreaming(false);
		context.updateSessionTitle(event.sessionId, event.title);
	}
}

export function handleSessionTitleUpdated(
	event: Extract<StreamEvent, { type: "session-title-updated" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();

	if (event.sessionId === currentSessionId) {
		context.updateSessionTitle(event.sessionId, event.title);
	}
}

// ============================================================================
// Token Update Events
// ============================================================================

/**
 * Handle session tokens updated event
 * Server has calculated tokens and sent them in the event
 * Client directly uses event data (send data on needed principle)
 */
export function handleSessionTokensUpdated(
	event: Extract<StreamEvent, { type: "session-tokens-updated" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();
	const currentSessionValue = currentSession.value;

	// Only handle if this is the current session
	if (event.sessionId !== currentSessionId || !currentSessionValue) {
		return;
	}

	// ARCHITECTURE: Send data on needed - event contains actual token data
	// Client is pure UI - directly use data from server, no business logic
	// Multi-client sync: All clients receive same data simultaneously
	logSession("Session tokens updated from event:", {
		sessionId: event.sessionId,
		totalTokens: event.totalTokens,
		baseContextTokens: event.baseContextTokens,
		outputTokens: event.outputTokens,
	});

	// Update local state with data from event (no API call needed)
	setCurrentSession({
		...currentSessionValue,
		totalTokens: event.totalTokens,
		baseContextTokens: event.baseContextTokens,
	});

	// Update streaming output tokens for status indicator
	if (event.outputTokens !== undefined) {
		context.setStreamingOutputTokens(event.outputTokens);
		logSession("Output tokens updated:", event.outputTokens);
	}

	logSession("Session tokens updated successfully:", {
		total: event.totalTokens,
		base: event.baseContextTokens,
		output: event.outputTokens,
	});
}

// ============================================================================
// Session Status Events
// ============================================================================

/**
 * Handle session-updated event (model-level)
 * Receives partial session with changed fields, merges with existing state
 *
 * Model-level architecture:
 * - Server emits full/partial session model with all changed fields
 * - Client merges changes with existing session state
 * - Supports optimistic updates via V2 Effect System
 * - Update strategies (delta/patch/value) handle transmission optimization
 */
export function handleSessionUpdated(
	event: Extract<StreamEvent, { type: "session-updated" }>,
	context: EventHandlerContext,
) {
	const currentSessionId = getCurrentSessionId();
	const currentSessionValue = currentSession.value;

	logSession("handleSessionUpdated called", {
		eventSessionId: event.sessionId,
		currentSessionId,
		hasCurrentSession: !!currentSessionValue,
		hasEventSession: !!event.session,
		eventSessionKeys: event.session ? Object.keys(event.session) : [],
	});

	// Only handle if this is the current session
	if (event.sessionId !== currentSessionId || !currentSessionValue) {
		logSession("Skipping - session ID mismatch or no current session");
		return;
	}

	logSession("Session updated from event (model-level):", {
		sessionId: event.sessionId,
		partialSession: event.session,
	});

	// Merge partial session with existing session
	// Fields not included in event.session remain unchanged
	const updatedSession = {
		...currentSessionValue,
		...event.session,
		// Preserve arrays/objects if not in update
		messages: event.session.messages || currentSessionValue.messages,
		todos: event.session.todos || currentSessionValue.todos,
		enabledRuleIds: event.session.enabledRuleIds || currentSessionValue.enabledRuleIds,
	};

	// Update local state
	setCurrentSession(updatedSession);

	// Lens optimistic reconciliation is now automatic via useLensSessionSubscription
	// The subscription wrapper (wrapSubscriptionWithOptimistic) handles mergeBase() automatically

	logSession("Session updated successfully:", {
		sessionId: event.sessionId,
		title: updatedSession.title,
		status: updatedSession.status,
		totalTokens: updatedSession.totalTokens,
	});
}
