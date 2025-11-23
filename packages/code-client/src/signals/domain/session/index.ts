/**
 * Session Domain Signals
 * Manages chat sessions and messages
 */

import type { ProviderId, Session, SessionMessage } from "@sylphx/code-core";
import { zen, computed } from "@sylphx/zen";
import { useZen } from "../../react-bridge.js";
import { eventBus } from "../../../lib/event-bus.js";
import { getLensClientGlobal as getLensClient } from "../../../lens-client-global.js";
import type { API } from "@sylphx/code-api";

// Core session signals
export const currentSessionId = zen<string | null>(null);
export const currentSession = zen<Session | null>(null);
export const isStreaming = zen(false);
export const streamingMessageId = zen<string | null>(null);

// Message management
export const messages = zen<SessionMessage[]>([]);
export const messageLimit = 100;

// Session list
export const recentSessions = zen<Session[]>([]);
export const sessionsLoading = zen(false);
export const sessionsError = zen<string | null>(null);

// Current session loading state
export const currentSessionLoading = zen(false);
export const currentSessionError = zen<Error | null>(null);
export const serverSession = zen<Session | null>(null);

// Computed signals
export const hasCurrentSession = computed(() => currentSessionId.value !== null);
export const currentSessionTitle = computed(() => currentSession.value?.title || "New Chat");
export const messageCount = computed(() => messages.value.length);
export const lastMessage = computed(() => {
	const msgs = messages.value;
	return msgs[msgs.length - 1] || null;
});
export const hasMessages = computed(() => messages.value.length > 0);

// Setter functions for backwards compatibility
export const setCurrentSessionId = (value: string | null) => { (currentSessionId as any).value = value };
export const setCurrentSession = (value: Session | null) => { (currentSession as any).value = value };
export const setIsStreaming = (value: boolean) => { (isStreaming as any).value = value };
export const setStreamingMessageId = (value: string | null) => { (streamingMessageId as any).value = value };
export const setMessages = (value: SessionMessage[]) => { (messages as any).value = value };
export const setRecentSessions = (value: Session[]) => { (recentSessions as any).value = value };
export const setSessionsLoading = (value: boolean) => { (sessionsLoading as any).value = value };
export const setSessionsError = (value: string | null) => { (sessionsError as any).value = value };
export const setCurrentSessionLoading = (value: boolean) => { (currentSessionLoading as any).value = value };
export const setCurrentSessionError = (value: Error | null) => { (currentSessionError as any).value = value };
export const setServerSession = (value: Session | null) => { (serverSession as any).value = value };

// Actions
export const getCurrentSessionId = () => currentSessionId.value;
export const getIsStreaming = () => isStreaming.value;
export const getCurrentSessionLoading = () => currentSessionLoading.value;
export const getCurrentSessionError = () => currentSessionError.value;
export const getServerSession = () => serverSession.value;

export const updateCurrentSession = (session: Session | null) => {
	(currentSession as any).value = session;
	if (session) {
		(currentSessionId as any).value = session.id;
	}
};

export const updateStreamingStatus = (streaming: boolean) => { (isStreaming as any).value = streaming };
export const updateStreamingMessageId = (messageId: string | null) => {
	(streamingMessageId as any).value = messageId;
};

export const addMessage = (message: SessionMessage) => {
	const msgs = messages.value;
	(messages as any).value = [...msgs, message];
};

export const addMessages = (newMessages: SessionMessage[]) => {
	const msgs = messages.value;
	const allMessages = [...msgs, ...newMessages];

	// Keep only last N messages
	(messages as any).value = allMessages.slice(-messageLimit);
};

export const updateMessage = (messageId: string, updates: Partial<SessionMessage>) => {
	const msgs = messages.value;
	(messages as any).value = msgs.map((msg) => (msg.id === messageId ? { ...msg, ...updates} : msg));
};

export const clearMessages = () => { (messages as any).value = [] };

export const updateRecentSessions = (sessions: Session[]) => { (recentSessions as any).value = sessions };
export const updateSessionsLoading = (loading: boolean) => { (sessionsLoading as any).value = loading };

// Session CRUD operations (async, server-side)
export const createSession = async (
	provider: ProviderId,
	model: string,
	agentId?: string,
	enabledRuleIds?: string[],
) => {
	const client = getLensClient<API>();
	const session = await client.session.create.mutate({
		provider,
		model,
		agentId,
		enabledRuleIds,
	});

	// Set as current session (UI state only)
	setCurrentSessionId(session.id);

	// Emit event for other stores to react
	eventBus.emit("session:created", {
		sessionId: session.id,
		enabledRuleIds: session.enabledRuleIds || [],
	});

	return session.id;
};

export const updateSessionModel = async (sessionId: string, model: string) => {
	const client = getLensClient<API>();
	await client.session.updateModel.mutate({ sessionId, model });
};

export const updateSessionProvider = async (
	sessionId: string,
	provider: ProviderId,
	model: string,
) => {
	const client = getLensClient<API>();
	await client.session.updateProvider.mutate({ sessionId, provider, model });
};

export const updateSessionAgent = async (sessionId: string, agentId: string) => {
	const client = getLensClient<API>();
	await client.session.updateAgent.mutate({ sessionId, agentId });
};

export const updateSessionTitle = async (sessionId: string, title: string) => {
	const client = getLensClient<API>();
	const updatedSession = await client.session.updateTitle.mutate({ sessionId, title });

	// Update local state if this is the current session
	const session = currentSession.value;
	if (session && session.id === sessionId) {
		updateCurrentSession(updatedSession);
	}
};

export const updateSessionRules = async (sessionId: string, enabledRuleIds: string[]) => {
	const client = getLensClient<API>();
	await client.session.updateRules.mutate({ sessionId, enabledRuleIds });

	// Emit event for other stores to react (if current session)
	if (currentSessionId.value === sessionId) {
		eventBus.emit("session:rulesUpdated", { sessionId, enabledRuleIds });
	}
};

export const deleteSession = async (sessionId: string) => {
	// Clear if it's the current session
	if (currentSessionId.value === sessionId) {
		(currentSessionId as any).value = null;
	}

	// Delete from database via Lens
	const client = getLensClient<API>();
	await client.session.delete.mutate({ sessionId });
};

// Message operations
export const addMessageAsync = async (params: {
	sessionId: string | null;
	role: "user" | "assistant";
	content: string | any[];
	attachments?: any[];
	usage?: any;
	finishReason?: string;
	metadata?: any;
	todoSnapshot?: any[];
	status?: "active" | "completed" | "error" | "abort";
	provider?: ProviderId;
	model?: string;
}) => {
	const client = getLensClient<API>();

	// Normalize content for wire format
	const wireContent =
		typeof params.content === "string"
			? [{ type: "text", content: params.content }]
			: params.content;

	// Persist via Lens
	const result = await client.message.add.mutate({
		sessionId: params.sessionId || undefined,
		provider: params.provider,
		model: params.model,
		role: params.role,
		content: wireContent,
		attachments: params.attachments,
		usage: params.usage,
		finishReason: params.finishReason,
		metadata: params.metadata,
		todoSnapshot: params.todoSnapshot,
		status: params.status,
	});

	return result.sessionId;
};

// Hooks for React components
export const useCurrentSessionId = () => useZen(currentSessionId);
export const useCurrentSession = () => useZen(currentSession);
export const useIsStreaming = () => useZen(isStreaming);
export const useMessages = () => useZen(messages);
export const useMessageCount = () => useZen(messageCount);
export const useLastMessage = () => useZen(lastMessage);
export const useHasCurrentSession = () => useZen(hasCurrentSession);
export const useCurrentSessionTitle = () => useZen(currentSessionTitle);
export const useRecentSessions = () => useZen(recentSessions);
export const useSessionsLoading = () => useZen(sessionsLoading);
export const useSessionsError = () => useZen(sessionsError);
export const useCurrentSessionLoading = () => useZen(currentSessionLoading);
export const useCurrentSessionError = () => useZen(currentSessionError);
export const useServerSession = () => useZen(serverSession);

// Load recent sessions from server via Lens
export const loadRecentSessions = async (limit = 20) => {
	updateSessionsLoading(true);
	(sessionsError as any).value = null;

	try {
		const client = getLensClient<API>();
		const sessions = await client.session.list.query({ limit });

		// Update signal
		updateRecentSessions(sessions);
	} catch (error) {
		console.error("[loadRecentSessions] Failed to load:", error);
		(sessionsError as any).value = error instanceof Error ? error.message : "Failed to load sessions";
	} finally {
		updateSessionsLoading(false);
	}
};

// Setup event listeners
eventBus.on("streaming:started", () => {
	updateStreamingStatus(true);
});

eventBus.on("streaming:completed", () => {
	updateStreamingStatus(false);
});
