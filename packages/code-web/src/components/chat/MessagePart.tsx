/**
 * MessagePart Component
 * Renders individual message parts based on type
 */

import { useState } from "preact/hooks";
import type { MessagePart as MessagePartType } from "@sylphx/code-core";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import styles from "../../styles/components/chat/messagepart.module.css";

interface MessagePartProps {
	part: MessagePartType;
}

export function MessagePart({ part }: MessagePartProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	switch (part.type) {
		case "text":
			return (
				<div class={styles.textPart}>
					<MarkdownRenderer content={part.content} />
				</div>
			);

		case "reasoning":
			return (
				<div class={styles.reasoningPart}>
					<button
						class={styles.reasoningToggle}
						onClick={() => setIsExpanded(!isExpanded)}
					>
						<span class={styles.toggleIcon}>
							{isExpanded ? "▼" : "▶"}
						</span>
						<span class={styles.reasoningLabel}>
							Extended Thinking
							{part.duration && (
								<span class={styles.duration}>
									{" "}
									({(part.duration / 1000).toFixed(1)}s)
								</span>
							)}
						</span>
					</button>
					{isExpanded && (
						<div class={styles.reasoningContent}>
							<MarkdownRenderer content={part.content} />
						</div>
					)}
				</div>
			);

		case "tool":
			return (
				<div class={styles.toolPart}>
					<div class={styles.toolHeader}>
						<span class={styles.toolIcon}>🔧</span>
						<span class={styles.toolName}>{part.name}</span>
						{part.status === "active" && (
							<span class={styles.toolStatus}>Running...</span>
						)}
						{part.status === "error" && (
							<span class={styles.toolStatusError}>Error</span>
						)}
						{part.duration && (
							<span class={styles.duration}>
								{(part.duration / 1000).toFixed(2)}s
							</span>
						)}
					</div>
					{part.error && (
						<div class={styles.toolError}>
							<strong>Error:</strong> {part.error}
						</div>
					)}
					{part.result && (
						<div class={styles.toolResult}>
							<pre>{JSON.stringify(part.result, null, 2)}</pre>
						</div>
					)}
				</div>
			);

		case "file":
		case "file-ref":
			return (
				<div class={styles.filePart}>
					<span class={styles.fileIcon}>📎</span>
					<span class={styles.fileName}>{part.relativePath}</span>
					<span class={styles.fileSize}>
						{formatFileSize(part.size)}
					</span>
				</div>
			);

		case "system-message":
			return (
				<div class={styles.systemMessagePart}>
					<span class={styles.systemIcon}>ℹ️</span>
					<span class={styles.systemContent}>{part.content}</span>
				</div>
			);

		case "error":
			return (
				<div class={styles.errorPart}>
					<span class={styles.errorIcon}>❌</span>
					<span class={styles.errorContent}>{part.error}</span>
				</div>
			);

		default:
			return null;
	}
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
