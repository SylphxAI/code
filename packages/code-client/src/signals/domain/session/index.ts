/**
 * Session Domain Signals
 * Manages chat sessions and messages
 */

import type { ProviderId, Session, SessionMessage } from "@sylphx/code-core";
import { createMemo, createSignal } from "solid-js";
import { useStore } from "@sylphx/zen-react";
import { eventBus } from "../../../lib/event-bus.js";
import { getTRPCClient } from "../../../trpc-provider.js";

// Core session signals
export const [currentSessionId, setCurrentSessionId] = createSignal<string | null>(null);
export const [currentSession, setCurrentSession] = createSignal<Session | null>(null);
export const [isStreaming, setIsStreaming] = createSignal(false);
export const [streamingMessageId, setStreamingMessageId] = createSignal<string | null>(null);

// Message management
export const [messages, setMessages] = createSignal<SessionMessage[]>([]);
export const messageLimit = 100;

// Session list
export const [recentSessions, setRecentSessions] = createSignal<Session[]>([]);
export const [sessionsLoading, setSessionsLoading] = createSignal(false);

// Computed signals
export const hasCurrentSession = createMemo(() => currentSessionId() !== null);
export const currentSessionTitle = createMemo(() => currentSession()?.title || "New Chat");
export const messageCount = createMemo(() => messages().length);
export const lastMessage = createMemo(() => {
	const msgs = messages();
	return msgs[msgs.length - 1] || null;
});
export const hasMessages = createMemo(() => messages().length > 0);

// Actions
export const getCurrentSessionId = () => currentSessionId();

export const updateCurrentSession = (session: Session | null) => {
	setCurrentSession(session);
	if (session) {
		setCurrentSessionId(session.id);
	}
};

export const updateStreamingStatus = (streaming: boolean) => setIsStreaming(streaming);
export const updateStreamingMessageId = (messageId: string | null) => setStreamingMessageId(messageId);

export const addMessage = (message: SessionMessage) => {
	const msgs = messages();
	setMessages([...msgs, message]);
};

export const addMessages = (newMessages: SessionMessage[]) => {
	const msgs = messages();
	const allMessages = [...msgs, ...newMessages];

	// Keep only last N messages
	setMessages(allMessages.slice(-messageLimit));
};

export const updateMessage = (messageId: string, updates: Partial<SessionMessage>) => {
	const msgs = messages();
	setMessages(msgs.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg)));
};

export const clearMessages = () => setMessages([]);

export const updateRecentSessions = (sessions: Session[]) => setRecentSessions(sessions);
export const updateSessionsLoading = (loading: boolean) => setSessionsLoading(loading);

// Session CRUD operations (async, server-side)
export const createSession = async (
	provider: ProviderId,
	model: string,
	agentId?: string,
	enabledRuleIds?: string[],
) => {
	const client = getTRPCClient();
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
	const client = getTRPCClient();
	await client.session.updateModel.mutate({ sessionId, model });
};

export const updateSessionProvider = async (
	sessionId: string,
	provider: ProviderId,
	model: string,
) => {
	const client = getTRPCClient();
	await client.session.updateProvider.mutate({ sessionId, provider, model });
};

export const updateSessionAgent = async (sessionId: string, agentId: string) => {
	const client = getTRPCClient();
	await client.session.updateAgent.mutate({ sessionId, agentId });
};

export const updateSessionTitle = async (sessionId: string, title: string) => {
	const client = getTRPCClient();
	await client.session.updateTitle.mutate({ sessionId, title });

	// Update local state if this is the current session
	const session = currentSession();
	if (session && session.id === sessionId) {
		updateCurrentSession({
			...session,
			title,
		});
	}
};

export const updateSessionRules = async (sessionId: string, enabledRuleIds: string[]) => {
	const client = getTRPCClient();
	await client.session.updateRules.mutate({ sessionId, enabledRuleIds });

	// Emit event for other stores to react (if current session)
	if (currentSessionId() === sessionId) {
		eventBus.emit("session:rulesUpdated", { sessionId, enabledRuleIds });
	}
};

export const deleteSession = async (sessionId: string) => {
	// Clear if it's the current session
	if (currentSessionId() === sessionId) {
		setCurrentSessionId(null);
	}

	// Delete from database via tRPC
	const client = getTRPCClient();
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
	const client = getTRPCClient();

	// Normalize content for tRPC wire format
	const wireContent =
		typeof params.content === "string"
			? [{ type: "text", content: params.content }]
			: params.content;

	// Persist via tRPC
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
export const useCurrentSessionId = () => useStore(currentSessionId);
export const useCurrentSession = () => useStore(currentSession);
export const useIsStreaming = () => useStore(isStreaming);
export const useMessages = () => useStore(messages);
export const useMessageCount = () => useStore(messageCount);
export const useLastMessage = () => useStore(lastMessage);
export const useHasCurrentSession = () => useStore(hasCurrentSession);
export const useCurrentSessionTitle = () => useStore(currentSessionTitle);

// Setup event listeners
eventBus.on("streaming:started", () => {
	updateStreamingStatus(true);
});

eventBus.on("streaming:completed", () => {
	updateStreamingStatus(false);
});
