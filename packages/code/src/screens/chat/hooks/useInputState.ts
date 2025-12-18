/**
 * Input State Hook
 * Manages input field state using local state
 *
 * ARCHITECTURE: lens-react hooks pattern
 * - Queries: client.queryName({ input, skip }) → { data, loading, error, refetch }
 */

import { useLensClient } from "@sylphx/code-client";
import {
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
} from "../../../input-state.js";
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

	// Query hook for message history
	// Use .useQuery() for React hook pattern (not vanilla Promise call)
	const historyQuery = client.getRecentUserMessages.useQuery({
		args: { limit: 100 },
	});

	// Sync query data to global state
	useEffect(() => {
		if (!historyQuery.data) return;

		// Extract messages array from result
		const result = historyQuery.data;
		const messages = (Array.isArray(result) ? result : (result as any)?.messages || []) as Array<{
			text: string;
			files: Array<{ fileId: string; relativePath: string; mediaType: string; size: number }>;
		}>;

		// Convert DB messages to MessageHistoryEntry format (ChatGPT-style fileId architecture)
		// Filter out malformed entries (text must be a valid string)
		const entries: MessageHistoryEntry[] = messages
			.filter((msg: any) => msg && typeof msg.text === "string")
			.map(
				(msg: {
					text: string;
					files: Array<{ fileId: string; relativePath: string; mediaType: string; size: number }>;
				}) => {
					// Convert DB files to attachment format (with fileId, no content)
					const attachments = (msg.files || []).map((file) => ({
						fileId: file.fileId, // Reference to uploaded file in object storage
						relativePath: file.relativePath,
						size: file.size,
						mimeType: file.mediaType,
						type: (file.mediaType?.startsWith("image/") ? "image" : "file") as "file" | "image",
					}));

					return {
						input: msg.text,
						attachments,
					};
				},
			);

		// Reverse to get oldest-first order (for bash-like navigation)
		setMessageHistorySignal(entries.reverse());
	}, [historyQuery.data]);

	// Log errors
	useEffect(() => {
		if (historyQuery.error) {
			console.error("Failed to load message history:", historyQuery.error);
		}
	}, [historyQuery.error]);

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
