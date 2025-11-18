/**
 * MessageList Component
 * Scrollable message container with auto-scroll
 */

import { useEffect, useRef } from "preact/hooks";
import type { SessionMessage } from "@sylphx/code-core";
import { MessageItem } from "./MessageItem";
import { StreamingIndicator } from "./StreamingIndicator";
import styles from "../../styles/components/chat/messagelist.module.css";

interface MessageListProps {
	messages: SessionMessage[];
	isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const shouldAutoScrollRef = useRef(true);

	// Auto-scroll to bottom when new messages arrive or streaming updates
	useEffect(() => {
		if (shouldAutoScrollRef.current && containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight;
		}
	}, [messages, isStreaming]);

	// Track if user has scrolled up (disable auto-scroll)
	const handleScroll = () => {
		if (!containerRef.current) return;

		const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
		const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
		shouldAutoScrollRef.current = isNearBottom;
	};

	if (messages.length === 0) {
		return (
			<div class={styles.welcomeContainer}>
				<div class={styles.welcomeMessage}>
					<h3>Welcome to Sylphx Code</h3>
					<p>Start chatting by typing a message below.</p>
					<p class={styles.welcomeHint}>
						Use <code>/</code> for commands, <code>@</code> for files
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			class={styles.container}
			onScroll={handleScroll}
		>
			<div class={styles.messageList}>
				{messages.map((message) => (
					<MessageItem key={message.id} message={message} />
				))}
				{isStreaming && <StreamingIndicator />}
			</div>
		</div>
	);
}
