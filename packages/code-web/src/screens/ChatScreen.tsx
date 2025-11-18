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

export function ChatScreen() {
	const currentSessionValue = useZen(currentSession);
	const messagesValue = useZen(messages);
	const isStreamingValue = useZen(isStreaming);

	return (
		<div class="chat-screen">
			<div class="chat-header">
				<h2>Chat</h2>
				{currentSessionValue ? (
					<span class="session-info">Session: {currentSessionValue.id}</span>
				) : (
					<span class="session-info">No active session</span>
				)}
			</div>

			<div class="messages-container">
				{messagesValue.length === 0 ? (
					<div class="welcome-message">
						<h3>Welcome to Sylphx Code</h3>
						<p>Start chatting by typing a message below.</p>
						<p>Use / for commands, @ for files</p>
					</div>
				) : (
					messagesValue.map((msg) => (
						<div key={msg.id} class={`message message-${msg.role}`}>
							<div class="message-header">
								<strong>{msg.role === "user" ? "You" : "Assistant"}</strong>
								<span class="message-time">
									{new Date(msg.timestamp).toLocaleTimeString()}
								</span>
							</div>
							<div class="message-content">
								{msg.steps.map((step) =>
									step.parts
										.filter((part) => part.type === "text")
										.map((part) => (part.type === "text" ? part.content : ""))
										.join(""),
								).join("")}
							</div>
						</div>
					))
				)}
				{isStreamingValue && (
					<div class="streaming-indicator">
						<span>Assistant is typing...</span>
					</div>
				)}
			</div>

			<div class="input-container">
				<input
					type="text"
					placeholder="Type your message..."
					class="message-input"
					disabled={isStreamingValue}
				/>
				<button class="send-button" disabled={isStreamingValue}>
					Send
				</button>
			</div>
		</div>
	);
}
