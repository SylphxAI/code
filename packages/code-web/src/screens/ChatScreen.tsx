/**
 * Chat Screen (Preact)
 * Main chat interface using zen@3.47.0 signals
 */

import {
	currentSession,
	messages,
	isStreaming,
} from "@sylphx/code-client";
import { useZen } from "../hooks/useZen";
import { MessageList, ChatInput } from "../components/chat";
import styles from "../styles/components/chat/chatscreen.module.css";

export function ChatScreen() {
	const currentSessionValue = useZen(currentSession);
	const messagesValue = useZen(messages);
	const isStreamingValue = useZen(isStreaming);

	const handleSendMessage = async (content: string) => {
		if (!currentSessionValue) {
			console.error("No active session");
			return;
		}

		try {
			// TODO: Implement tRPC client for sending messages
			// await trpc.chat.sendMessage.mutate({
			//   sessionId: currentSessionValue.id,
			//   content,
			//   attachments: [],
			// });
			console.log("Send message:", content);
		} catch (error) {
			console.error("Failed to send message:", error);
		}
	};

	return (
		<div class={styles.chatScreen}>
			<div class={styles.chatHeader}>
				<h2>Chat</h2>
				{currentSessionValue ? (
					<span class={styles.sessionInfo}>
						Session: {currentSessionValue.id}
					</span>
				) : (
					<span class={styles.sessionInfo}>No active session</span>
				)}
			</div>

			<MessageList
				messages={messagesValue}
				isStreaming={isStreamingValue}
			/>

			<ChatInput
				onSend={handleSendMessage}
				isStreaming={isStreamingValue}
			/>
		</div>
	);
}
