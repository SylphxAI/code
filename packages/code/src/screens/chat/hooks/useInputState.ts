/**
 * Input State Hook
 * Manages input field state using Zen signals
 */

import {
	useLensClient,
	useInput,
	setInput as setInputSignal,
	useCursor,
	setCursor as setCursorSignal,
	useNormalizedCursor,
	useMessageHistory,
	setMessageHistory as setMessageHistorySignal,
	useHistoryIndex,
	setHistoryIndex as setHistoryIndexSignal,
	useTempInput,
	setTempInput as setTempInputSignal,
	type MessageHistoryEntry,
} from "@sylphx/code-client";
import type { FileAttachment } from "@sylphx/code-core";
import { useEffect } from "react";

// Re-export type for backwards compatibility
export type { MessageHistoryEntry };

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
	const client = useLensClient();
	const input = useInput();
	const cursor = useCursor();
	const normalizedCursor = useNormalizedCursor();
	const messageHistory = useMessageHistory();
	const historyIndex = useHistoryIndex();
	const tempInput = useTempInput();

	// Load message history via Lens on mount (backend handles database access)
	// Lens flat namespace: client.getRecentUserMessages()
	useEffect(() => {
		const loadHistory = async () => {
			try {
				const result = await client.getRecentUserMessages({
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
				setMessageHistorySignal(entries.reverse());
			} catch (error) {
				console.error("Failed to load message history:", error);
			}
		};
		loadHistory();
	}, [client]); // Load when client is ready

	// Wrapper for setMessageHistory to support functional updates
	const setMessageHistory = (
		value: MessageHistoryEntry[] | ((prev: MessageHistoryEntry[]) => MessageHistoryEntry[]),
	) => {
		if (typeof value === "function") {
			setMessageHistorySignal(value(messageHistory));
		} else {
			setMessageHistorySignal(value);
		}
	};

	return {
		input,
		setInput: setInputSignal,
		cursor,
		setCursor: setCursorSignal,
		normalizedCursor,
		messageHistory,
		setMessageHistory,
		historyIndex,
		setHistoryIndex: setHistoryIndexSignal,
		tempInput,
		setTempInput: setTempInputSignal,
	};
}
