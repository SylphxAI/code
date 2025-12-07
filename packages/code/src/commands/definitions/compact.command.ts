/**
 * Compact Command
 * Server-side session compaction with AI summarization
 * ARCHITECTURE: All logic on server, multi-client sync via lens live queries
 * UI FLOW: Uses normal message flow with status indicator (doesn't block input)
 */

import type { Command } from "../types.js";
import { setCompacting, setCompactAbortController } from "../../ui-state.js";
import { getCurrentSession, setCurrentSessionId, setCurrentSession } from "../../session-state.js";

export const compactCommand: Command = {
	id: "compact",
	label: "/compact",
	description: "Summarize current session and create a new session with the summary",
	execute: async (context) => {
		const currentSession = getCurrentSession();

		if (!currentSession) {
			return "No active session to compact.";
		}

		if (currentSession.messages.length === 0) {
			return "Current session has no messages to compact.";
		}

		// TODO: compactSession endpoint doesn't exist in CodeClient API yet
		// Need to implement this mutation on the server side first
		return "❌ Session compaction is not yet implemented. The compactSession endpoint needs to be added to the Lens API.";

		// // Set compacting status (shows indicator in UI)
		// setCompacting(true);

		// // Create abort controller for ESC cancellation
		// const abortController = new AbortController();
		// setCompactAbortController(abortController);

		// try {
		// 	// Use client from context (passed from React hook)
		// 	const client = context.client;

		// 	// Check if already aborted before starting
		// 	if (abortController.signal.aborted) {
		// 		setCompacting(false);
		// 		return "⚠️ Compaction cancelled.";
		// 	}

		// 	// TODO: This endpoint doesn't exist yet - needs to be implemented
		// 	// Lens flat namespace: client.compactSession.fetch({ input })
		// 	// const result = await client.compactSession.fetch({
		// 	// 	input: { sessionId: currentSession.id },
		// 	// }) as { success: boolean; error?: string; newSessionId?: string; messageCount?: number; oldSessionTitle?: string };

		// 	// // Clear compacting status
		// 	// setCompacting(false);

		// 	// if (!result.success) {
		// 	// 	return `❌ Failed to compact session: ${result.error}`;
		// 	// }

		// 	// const messageCount = result.messageCount || currentSession.messages.length;
		// 	// const sessionTitle = result.oldSessionTitle || currentSession.title || "Untitled session";

		// 	// // Fetch new session to get the system message (summary)
		// 	// // Lens flat namespace: client.getSession.fetch({ input })
		// 	// const newSession = await client.getSession.fetch({
		// 	// 	input: { id: result.newSessionId! },
		// 	// });

		// 	// if (!newSession) {
		// 	// 	return `❌ Failed to load new session`;
		// 	// }

		// 	// // Only include completed messages (system message)
		// 	// const completedMessages = newSession.messages.filter((m) => m.status === "completed");

		// 	// // Switch to new session with completed messages only
		// 	// setCurrentSessionId(result.newSessionId!);
		// 	// setCurrentSession({
		// 	// 	...newSession,
		// 	// 	messages: completedMessages,
		// 	// } as typeof currentSession);

		// 	// // Server auto-triggers AI streaming in background (business logic on server)
		// 	// // Lens live queries will automatically update the UI
		// 	// context.sendMessage(
		// 	// 	`✓ Compacted session "${sessionTitle}" (${messageCount} messages)\n✓ Created new session with AI-generated summary\n✓ Switched to new session\n✓ AI is processing the summary...`,
		// 	// );

		// 	// return;
		// } catch (error) {
		// 	// Clear compacting status on error
		// 	setCompacting(false);

		// 	// Check if it was aborted
		// 	if (error instanceof Error && error.name === "AbortError") {
		// 		return "⚠️ Compaction cancelled.";
		// 	}

		// 	const errorMsg = error instanceof Error ? error.message : String(error);
		// 	context.addLog(`[Compact] Error: ${errorMsg}`);
		// 	return `❌ Failed to compact session: ${errorMsg}`;
		// }
	},
};

export default compactCommand;
