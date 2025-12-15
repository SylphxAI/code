/**
 * Message List Component
 *
 * Displays a list of chat messages with proper styling for user/assistant roles.
 */

import { MessageItem } from "./MessageItem";

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

interface MessageListProps {
	messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
	if (messages.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="text-[var(--color-text-dim)] text-center">
					<p>No messages yet</p>
					<p className="text-sm mt-1">Start a conversation below</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
			{messages.map((message) => (
				<MessageItem key={message.id} message={message} />
			))}
		</div>
	);
}
