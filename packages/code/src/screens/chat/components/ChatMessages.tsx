/**
 * ChatMessages Component
 * Displays welcome message or message list based on session state
 *
 * PERFORMANCE: Memoized to prevent re-renders when parent updates
 */

import type { SessionMessage } from "@sylphx/code-core";
import { Box, Text } from "ink";
import React from "react";
import { MessageList } from "../../../components/MessageList.js";

interface ChatMessagesProps {
	hasSession: boolean;
	messages?: SessionMessage[];
	attachmentTokens: Map<string, number>;
}

function ChatMessagesInternal({ hasSession, messages = [], attachmentTokens }: ChatMessagesProps) {
	if (!hasSession) {
		return (
			<Box paddingY={1} flexDirection="column">
				<Box paddingBottom={2}>
					<Text color="cyan">▌</Text>
					<Text bold color="white">
						{" "}
						WELCOME
					</Text>
				</Box>
				<Box paddingBottom={1}>
					<Text dimColor>Start chatting by typing a message below.</Text>
				</Box>
				<Box paddingBottom={1}>
					<Text dimColor>Useful commands:</Text>
				</Box>
				<Box paddingLeft={2} paddingBottom={1}>
					<Text color="cyan">/provider</Text>
					<Text dimColor> - Manage AI providers</Text>
				</Box>
				<Box paddingLeft={2} paddingBottom={1}>
					<Text color="cyan">/help</Text>
					<Text dimColor> - Show all available commands</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexGrow={1} flexDirection="column">
			<MessageList messages={messages} attachmentTokens={attachmentTokens} />
		</Box>
	);
}

// Memoize component to prevent re-renders when props haven't changed
export const ChatMessages = React.memo(ChatMessagesInternal, (prevProps, nextProps) => {
	return (
		prevProps.hasSession === nextProps.hasSession &&
		prevProps.messages === nextProps.messages &&
		prevProps.attachmentTokens === nextProps.attachmentTokens
	);
});
