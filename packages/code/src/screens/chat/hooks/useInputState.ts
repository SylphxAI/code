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

				console.log("[useInputState] Loaded messages from DB:", messages.length);
				console.log("[useInputState] First message:", messages[0]);

				// Convert DB messages to MessageHistoryEntry format
				const entries: MessageHistoryEntry[] = messages.map((msg: { text: string; files: Array<{ relativePath: string; base64: string; mediaType: string; size: number }> }) => {
					// Convert DB files to FileAttachment format
					const attachments: FileAttachment[] = msg.files.map((file) => ({
						// ASSUMPTION: DB files are permanent, no disk path needed
						path: "", // No temp path for DB-loaded files
						relativePath: file.relativePath,
						size: file.size,
						mimeType: file.mediaType,
						type: file.mediaType.startsWith("image/") ? "image" : "file",
						imageData: file.mediaType.startsWith("image/") ? file.base64 : undefined,
					}));

					console.log("[useInputState] Message text:", msg.text.substring(0, 50));
					console.log("[useInputState] Files:", msg.files.length);
					console.log("[useInputState] Attachments:", attachments.length);
					if (attachments.length > 0) {
						console.log("[useInputState] First attachment:", {
							relativePath: attachments[0].relativePath,
							type: attachments[0].type,
							hasImageData: !!attachments[0].imageData,
							imageDataLength: attachments[0].imageData?.length,
						});
					}

					return {
						text: msg.text,
						attachments,
					};
				});

				// Reverse to get oldest-first order (for bash-like navigation)
				setMessageHistory(entries.reverse());
				console.log("[useInputState] Total history entries:", entries.length);
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
