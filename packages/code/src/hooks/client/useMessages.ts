/**
 * useMessages Hook
 * Fetches messages for the current session using lens-react hooks
 * and converts them to SessionMessage format with steps and parts
 *
 * ARCHITECTURE: lens-react hooks pattern
 * ======================================
 * Uses client.listMessages({ input }) as a React hook - returns { data, loading, error }.
 * Lens handles caching, refetching, and real-time updates automatically.
 */

import { useLensClient } from "@sylphx/code-client";
import type { SessionMessage, MessageStep, MessagePart } from "@sylphx/code-core";
import { useMemo } from "react";

/**
 * Convert server Part to client MessagePart format
 */
function convertPart(part: { type: string; content: unknown }): MessagePart {
	const content = part.content as Record<string, unknown>;

	switch (part.type) {
		case "text":
			return {
				type: "text",
				content: (content.content as string) || "",
				status: (content.status as "active" | "completed") || "completed",
			};
		case "tool-call":
			return {
				type: "tool-call",
				toolCallId: (content.toolCallId as string) || "",
				toolName: (content.toolName as string) || "",
				args: (content.args as Record<string, unknown>) || {},
				status: (content.status as "active" | "completed") || "completed",
			};
		case "tool-result":
			return {
				type: "tool-result",
				toolCallId: (content.toolCallId as string) || "",
				toolName: (content.toolName as string) || "",
				result: (content.result as Record<string, unknown>) || {},
				status: "completed",
			};
		case "file-ref":
			return {
				type: "file-ref",
				fileContentId: (content.fileContentId as string) || "",
				relativePath: (content.relativePath as string) || "",
				size: (content.size as number) || 0,
				mediaType: (content.mediaType as string) || "application/octet-stream",
				status: "completed",
			};
		case "error":
			return {
				type: "error",
				error: (content.error as string) || "Unknown error",
				status: "completed",
			};
		default:
			return {
				type: "text",
				content: JSON.stringify(content),
				status: "completed",
			};
	}
}

export function useMessages(sessionId: string | null | undefined) {
	const client = useLensClient();

	// Use lens-react hook - automatically handles fetching, caching, real-time updates
	const messagesQuery = client.listMessages({
		input: { sessionId: sessionId || "" },
		skip: !sessionId,
	});

	// Convert raw messages to SessionMessage format
	const messages = useMemo((): SessionMessage[] => {
		if (!messagesQuery.data) return [];

		// The server returns messages with nested steps and parts via includes
		// If not nested, we return simplified format
		return (messagesQuery.data as any[]).map((msg): SessionMessage => {
			const steps: MessageStep[] = (msg.steps || []).map((step: any): MessageStep => ({
				id: step.id,
				stepIndex: step.stepIndex,
				parts: (step.parts || []).map(convertPart),
				status: step.status || "completed",
			}));

			// If no steps, create a synthetic step from message content
			if (steps.length === 0 && msg.content) {
				steps.push({
					id: `${msg.id}-step-0`,
					stepIndex: 0,
					parts: [{
						type: "text",
						content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
						status: "completed",
					}],
					status: "completed",
				});
			}

			return {
				id: msg.id,
				role: msg.role as "user" | "assistant" | "system",
				steps,
				timestamp: msg.timestamp,
				status: msg.status || "completed",
			};
		});
	}, [messagesQuery.data]);

	return {
		messages,
		isLoading: messagesQuery.loading,
		error: messagesQuery.error,
		refetch: messagesQuery.refetch,
	};
}
