/**
 * useMessages Hook
 * Fetches messages for the current session using lens-react hooks
 * and converts them to SessionMessage format with steps and parts
 *
 * ARCHITECTURE: lens-react v5 API
 * - client.xxx.useQuery({ input }) → React hook { data, loading, error, refetch }
 *
 * POLLING: When streamingExpected is true, polls every 100ms
 * to get updated message content during streaming.
 */

import { useLensClient } from "@sylphx/code-client";
import type { SessionMessage, MessageStep, MessagePart } from "@sylphx/code-core";
import { useMemo, useEffect, useRef } from "react";
import { useStreamingExpected } from "../../ui-state.js";

/**
 * Convert server Part to client MessagePart format
 *
 * Server returns MessagePart fields directly (not wrapped in content field):
 * - { type: "text", content: "Hello", status: "completed" }
 * - { type: "tool", toolId: "...", name: "...", status: "..." }
 */
function convertPart(part: Record<string, unknown>): MessagePart {
	switch (part.type) {
		case "text":
			return {
				type: "text",
				content: (part.content as string) || "",
				status: (part.status as "active" | "completed") || "completed",
			};
		case "reasoning":
			return {
				type: "reasoning",
				content: (part.content as string) || "",
				status: (part.status as "active" | "completed") || "completed",
				duration: part.duration as number | undefined,
				startTime: part.startTime as number | undefined,
			};
		case "tool":
			return {
				type: "tool",
				toolId: (part.toolId as string) || "",
				name: (part.name as string) || "",
				mcpServerId: part.mcpServerId as string | undefined,
				status: (part.status as "active" | "completed" | "error" | "abort") || "completed",
				input: part.input,
				result: part.result,
				error: part.error as string | undefined,
				duration: part.duration as number | undefined,
				startTime: part.startTime as number | undefined,
			};
		case "file-ref":
			return {
				type: "file-ref",
				fileContentId: (part.fileContentId as string) || "",
				relativePath: (part.relativePath as string) || "",
				size: (part.size as number) || 0,
				mediaType: (part.mediaType as string) || "application/octet-stream",
				status: "completed",
			};
		case "file":
			return {
				type: "file",
				relativePath: (part.relativePath as string) || "",
				size: (part.size as number) || 0,
				mediaType: (part.mediaType as string) || "application/octet-stream",
				base64: (part.base64 as string) || "",
				status: "completed",
			};
		case "system-message":
			return {
				type: "system-message",
				content: (part.content as string) || "",
				messageType: (part.messageType as string) || "",
				timestamp: (part.timestamp as number) || Date.now(),
				status: "completed",
			};
		case "error":
			return {
				type: "error",
				error: (part.error as string) || "Unknown error",
				status: "completed",
			};
		default:
			return {
				type: "text",
				content: JSON.stringify(part),
				status: "completed",
			};
	}
}

export function useMessages(sessionId: string | null | undefined) {
	const client = useLensClient();
	const streamingExpected = useStreamingExpected();
	const pollingRef = useRef<NodeJS.Timeout | null>(null);

	// Use lens-react query hook
	const messagesQuery = client.listMessages.useQuery({
		input: { sessionId: sessionId || "" },
		skip: !sessionId,
	});

	// Poll while streaming is expected (for inProcess transport)
	useEffect(() => {
		if (streamingExpected && sessionId) {
			// Start polling
			pollingRef.current = setInterval(() => {
				messagesQuery.refetch?.();
			}, 100);
		} else {
			// Stop polling and do one final refetch
			if (pollingRef.current) {
				clearInterval(pollingRef.current);
				pollingRef.current = null;
				// Final refetch to get completed message
				messagesQuery.refetch?.();
			}
		}

		return () => {
			if (pollingRef.current) {
				clearInterval(pollingRef.current);
				pollingRef.current = null;
			}
		};
	}, [streamingExpected, sessionId, messagesQuery.refetch]);

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
