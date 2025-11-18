/**
 * MessageItem Component
 * Individual message bubble with role-based styling
 */

import { useState } from "preact/hooks";
import { format } from "date-fns";
import type { SessionMessage } from "@sylphx/code-core";
import { MessagePart } from "./MessagePart";
import styles from "../../styles/components/chat/messageitem.module.css";

interface MessageItemProps {
	message: SessionMessage;
}

export function MessageItem({ message }: MessageItemProps) {
	const [showCopyButton, setShowCopyButton] = useState(false);

	const isUser = message.role === "user";
	const displayRole = isUser ? "You" : "Assistant";
	const timestamp = format(message.timestamp, "h:mm a");

	const handleCopy = () => {
		// Extract all text content from message steps
		const textContent = message.steps
			.flatMap((step) =>
				step.parts
					.filter((part) => part.type === "text")
					.map((part) => (part.type === "text" ? part.content : ""))
			)
			.join("\n");

		navigator.clipboard.writeText(textContent);
	};

	return (
		<div
			class={`${styles.messageItem} ${isUser ? styles.user : styles.assistant}`}
			onMouseEnter={() => setShowCopyButton(true)}
			onMouseLeave={() => setShowCopyButton(false)}
		>
			<div class={styles.messageHeader}>
				<div class={styles.avatar}>
					{isUser ? (
						<span class={styles.avatarIcon}>👤</span>
					) : (
						<span class={styles.avatarIcon}>🤖</span>
					)}
				</div>
				<div class={styles.headerInfo}>
					<span class={styles.role}>{displayRole}</span>
					<span class={styles.timestamp}>{timestamp}</span>
				</div>
				{showCopyButton && (
					<button
						class={styles.copyButton}
						onClick={handleCopy}
						title="Copy message"
					>
						📋
					</button>
				)}
			</div>

			<div class={styles.messageContent}>
				{message.steps.map((step) => (
					<div key={step.id} class={styles.step}>
						{step.parts.map((part, index) => (
							<MessagePart key={`${step.id}-${index}`} part={part} />
						))}
					</div>
				))}
			</div>

			{message.usage && (
				<div class={styles.metadata}>
					<span class={styles.tokenUsage}>
						{message.usage.totalTokens} tokens
					</span>
				</div>
			)}
		</div>
	);
}
