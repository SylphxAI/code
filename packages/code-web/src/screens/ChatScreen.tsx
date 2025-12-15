/**
 * Chat Screen
 *
 * Main chat interface with message list and input.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useLensClient } from "../lib/lens-client";
import { useState, useRef, useEffect } from "react";
import { MessageList } from "../components/chat/MessageList";
import { ChatInput } from "../components/chat/ChatInput";
import { ChatHeader } from "../components/chat/ChatHeader";

interface Session {
	id: string;
	title?: string;
}

interface Message {
	id: string;
	role: string;
	steps?: Array<{
		id: string;
		parts?: Array<{
			type: string;
			content?: string;
			name?: string;
			input?: unknown;
			result?: unknown;
			status?: string;
		}>;
	}>;
	timestamp?: number;
}

export function ChatScreen() {
	const { sessionId } = useParams();
	const navigate = useNavigate();
	const client = useLensClient();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);

	// Query session data (Live Query)
	const { data: sessionData } = client.getSession.useQuery({
		input: { id: sessionId || "" },
		skip: !sessionId,
	});
	const session = sessionData as Session | undefined;

	// Query messages for current session (Live Query)
	const { data: messagesData, loading: messagesLoading } = client.listMessages.useQuery({
		input: { sessionId: sessionId || "" },
		skip: !sessionId,
	});
	const messages = (messagesData as Message[] | undefined) || [];

	// Mutation hook - returns { mutate } function
	const { mutate: sendMessage } = client.sendMessage.useMutation();

	// Scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSend = async () => {
		if (!input.trim() || sending) return;

		const message = input.trim();
		setInput("");
		setSending(true);

		try {
			// Call mutation directly with input fields
			const result = await sendMessage({
				sessionId: sessionId || null,
				content: [{ type: "text", content: message }],
			});
			// If this was a new session, navigate to it
			if (!sessionId && result && typeof result === "object" && "session" in result) {
				const session = (result as { session: { id: string } }).session;
				navigate(`/chat/${session.id}`);
			}
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setSending(false);
		}
	};

	// Empty state for new chat
	if (!sessionId) {
		return (
			<div className="flex-1 flex flex-col">
				<ChatHeader title="New Chat" />
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center max-w-md px-4">
						<h2 className="text-2xl font-semibold text-[var(--color-text)] mb-4">
							Start a new conversation
						</h2>
						<p className="text-[var(--color-text-secondary)] mb-8">
							Ask me anything about your code. I can help with debugging, refactoring, documentation,
							and more.
						</p>
					</div>
				</div>
				<ChatInput value={input} onChange={setInput} onSend={handleSend} disabled={sending} />
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col">
			<ChatHeader title={session?.title || "Chat"} />

			{/* Messages */}
			<div className="flex-1 overflow-y-auto">
				{messagesLoading ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-[var(--color-text-dim)]">Loading messages...</div>
					</div>
				) : (
					<>
						<MessageList messages={messages} />
						<div ref={messagesEndRef} />
					</>
				)}
			</div>

			{/* Input */}
			<ChatInput
				value={input}
				onChange={setInput}
				onSend={handleSend}
				disabled={sending}
			/>
		</div>
	);
}
