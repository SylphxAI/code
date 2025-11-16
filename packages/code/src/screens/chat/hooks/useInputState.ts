/**
 * Input State Hook
 * Manages input field state including message history
 */

import { getTRPCClient } from "@sylphx/code-client";
import type { FileAttachment } from "@sylphx/code-core";
import { useEffect, useMemo, useState } from "react";

/**
 * Message history entry with text and attachments
 */
export interface MessageHistoryEntry {
	text: string;
	attachments: FileAttachment[];
}

export interface InputState {
	input: string;
	setInput: (input: string) => void;
	cursor: number;
	setCursor: (cursor: number) => void;
	normalizedCursor: number;
	messageHistory: MessageHistoryEntry[];
	setMessageHistory: (
		history: MessageHistoryEntry[] | ((prev: MessageHistoryEntry[]) => MessageHistoryEntry[]),
	) => void;
	historyIndex: number;
	setHistoryIndex: (index: number) => void;
	tempInput: string;
	setTempInput: (input: string) => void;
}

export function useInputState(): InputState {
	const [input, setInput] = useState("");
	const [cursor, setCursor] = useState(0);
	const [messageHistory, setMessageHistory] = useState<MessageHistoryEntry[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [tempInput, setTempInput] = useState("");

	// Load message history via tRPC on mount (backend handles database access)
	useEffect(() => {
		const loadHistory = async () => {
			try {
				const client = getTRPCClient();
				const result = await client.message.getRecentUserMessages.query({
					limit: 100,
				});
				// Extract messages array from paginated result
				const messages = Array.isArray(result) ? result : result?.messages || [];

				// Convert DB messages to MessageHistoryEntry format (ChatGPT-style fileId architecture)
				const entries: MessageHistoryEntry[] = messages.map(
					(msg: {
						text: string;
						files: Array<{ fileId: string; relativePath: string; mediaType: string; size: number }>;
					}) => {
						// Convert DB files to FileAttachment format (with fileId, no content)
						const attachments: FileAttachment[] = msg.files.map((file) => ({
							fileId: file.fileId, // Reference to uploaded file in object storage
							relativePath: file.relativePath,
							size: file.size,
							mimeType: file.mediaType,
							type: file.mediaType.startsWith("image/") ? "image" : "file",
						}));

						return {
							text: msg.text,
							attachments,
						};
					},
				);

				// Reverse to get oldest-first order (for bash-like navigation)
				setMessageHistory(entries.reverse());
			} catch (error) {
				console.error("Failed to load message history:", error);
			}
		};
		loadHistory();
	}, []); // Only load once on mount

	const normalizedCursor = useMemo(
		() => Math.max(0, Math.min(cursor, input.length)),
		[cursor, input.length],
	);

	return {
		input,
		setInput,
		cursor,
		setCursor,
		normalizedCursor,
		messageHistory,
		setMessageHistory,
		historyIndex,
		setHistoryIndex,
		tempInput,
		setTempInput,
	};
}
