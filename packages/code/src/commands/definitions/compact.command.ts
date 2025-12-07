/**
 * Compact Command
 * Server-side session compaction with AI summarization
 * ARCHITECTURE: All logic on server, multi-client sync via tRPC events
 * UI FLOW: Uses normal message flow with status indicator (doesn't block input)
 */

import type { Command } from "../types.js";

export const compactCommand: Command = {
	id: "compact",
	label: "/compact",
	description: "Summarize current session and create a new session with the summary",
	execute: async (context) => {
		const { setCompacting, setCompactAbortController } = await import(
			"@sylphx/code-client"
		);
		const { currentSession: currentSessionSignal } = await import("@sylphx/code-client");
		const { get } = await import("@sylphx/zen");

		const currentSession = currentSessionSignal();

		if (!currentSession) {
			return "No active session to compact.";
		}

		if (currentSession.messages.length === 0) {
			return "Current session has no messages to compact.";
		}

		// Set compacting status (shows indicator in UI)
		setCompacting(true);

		// Create abort controller for ESC cancellation
		const abortController = new AbortController();
		setCompactAbortController(abortController);

		try {
			// Use client from context (passed from React hook)
			const client = context.client;

			// Check if already aborted before starting
			if (abortController.signal.aborted) {
				setCompacting(false);
				return "⚠️ Compaction cancelled.";
			}

			// Lens flat namespace: client.compactSession.fetch({ input })
			const result = await client.compactSession.fetch({
				input: { sessionId: currentSession.id },
			}) as { success: boolean; error?: string; newSessionId?: string; messageCount?: number; oldSessionTitle?: string };

			// Clear compacting status
			setCompacting(false);

			if (!result.success) {
				return `❌ Failed to compact session: ${result.error}`;
			}

			const messageCount = result.messageCount || currentSession.messages.length;
			const sessionTitle = result.oldSessionTitle || currentSession.title || "Untitled session";

			// Fetch new session to get the system message (summary)
			// Filter out any active messages (those are being streamed and will come via event stream)
			// Lens flat namespace: client.getSession.fetch({ input })
			const newSession = await client.getSession.fetch({
				input: { id: result.newSessionId! },
			}) as { messages: Array<{ status: string }> } | null;

			if (!newSession) {
				return `❌ Failed to load new session`;
			}

			// Only include completed messages (system message)
			// Active messages are being streamed and will be added by event stream handlers
			const completedMessages = newSession.messages.filter((m) => m.status === "completed");

			// Switch to new session with completed messages only
			const { setCurrentSessionId, set, currentSession: currentSessionSignal2 } = await import("@sylphx/code-client");

			setCurrentSessionId(result.newSessionId!);
			set(currentSessionSignal2, {
				...newSession,
				messages: completedMessages, // Only completed messages (system message)
			});

			// Server auto-triggers AI streaming in background (business logic on server)
			// Events are delivered via event stream to all clients
			// useEventStream with replayLast:50 will catch streaming events (assistant message, reasoning, text)
			context.sendMessage(
				`✓ Compacted session "${sessionTitle}" (${messageCount} messages)\n✓ Created new session with AI-generated summary\n✓ Switched to new session\n✓ AI is processing the summary...`,
			);

			return;
		} catch (error) {
			// Clear compacting status on error
			setCompacting(false);

			// Check if it was aborted
			if (error instanceof Error && error.name === "AbortError") {
				return "⚠️ Compaction cancelled.";
			}

			const errorMsg = error instanceof Error ? error.message : String(error);
			context.addLog(`[Compact] Error: ${errorMsg}`);
			return `❌ Failed to compact session: ${errorMsg}`;
		}
	},
};

export default compactCommand;
