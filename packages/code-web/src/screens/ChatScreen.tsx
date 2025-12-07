/**
 * Chat Screen (Preact)
 * Main chat interface using Lens client
 *
 * MIGRATED: zen signals → Lens queries (2025-01-24)
 * - Uses getClient() to access global Lens client
 * - Local state with polling for now (TODO: live queries)
 */

import { getClient, type Session, type Message } from "@sylphx/code-client";
import { useEffect, useState } from "preact/hooks";
import { MessageList, ChatInput } from "../components/chat";
import styles from "../styles/components/chat/chatscreen.module.css";

export function ChatScreen() {
	const [currentSession, setCurrentSession] = useState<Session | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);

	// Load session and messages
	useEffect(() => {
		const loadData = async () => {
			const client = getClient();
			if (!client) {
				console.warn("[ChatScreen] Lens client not initialized");
				return;
			}

			try {
				// Get recent sessions
				const sessionsResult = await client.getSessions.fetch({ input: { limit: 1 } });
				const sessions = (sessionsResult as any)?.data || sessionsResult || [];

				if (sessions.length > 0) {
					const session = sessions[0];
					setCurrentSession(session);
					setSessionId(session.id);
					setIsStreaming(session.streamingStatus === "streaming");

					// Load messages for this session
					const sessionResult = await client.getSession.fetch({ input: { id: session.id } });
					const fullSession = (sessionResult as any)?.data || sessionResult;
					if (fullSession?.messages) {
						setMessages(fullSession.messages);
					}
				}
			} catch (error) {
				console.error("[ChatScreen] Failed to load data:", error);
			}
		};

		loadData();
		// Poll for updates (TODO: replace with Lens live queries)
		const interval = setInterval(loadData, 2000);
		return () => clearInterval(interval);
	}, []);

	const handleSendMessage = async (content: string) => {
		const client = getClient();
		if (!client) {
			console.error("[ChatScreen] Lens client not initialized");
			return;
		}

		try {
			// Trigger streaming
			const result = await client.triggerStream.fetch({
				input: {
					sessionId: sessionId,
					content: [{ type: "text", content }],
				},
			});
			const newSessionId = (result as any)?.data?.sessionId || (result as any)?.sessionId;
			if (newSessionId && newSessionId !== sessionId) {
				setSessionId(newSessionId);
			}
			setIsStreaming(true);
		} catch (error) {
			console.error("[ChatScreen] Failed to send message:", error);
		}
	};

	return (
		<div class={styles.chatScreen}>
			<div class={styles.chatHeader}>
				<h2>Chat</h2>
				{currentSession ? (
					<span class={styles.sessionInfo}>
						Session: {currentSession.id}
					</span>
				) : (
					<span class={styles.sessionInfo}>No active session</span>
				)}
			</div>

			<MessageList
				messages={messages}
				isStreaming={isStreaming}
			/>

			<ChatInput
				onSend={handleSendMessage}
				isStreaming={isStreaming}
			/>
		</div>
	);
}
