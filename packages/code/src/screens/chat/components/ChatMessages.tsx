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
import { indicators } from "../../../utils/colors.js";
import { useThemeColors } from "../../../theme.js";

interface ChatMessagesProps {
	hasSession: boolean;
	messages?: SessionMessage[];
	attachmentTokens: Map<string, number>;
	hideMessageTitles?: boolean;
	hideMessageUsage?: boolean;
}

function ChatMessagesInternal({
	hasSession,
	messages = [],
	attachmentTokens,
	hideMessageTitles = true,
	hideMessageUsage = true,
}: ChatMessagesProps) {
	const colors = useThemeColors();

	if (!hasSession) {
		return (
			<Box paddingY={1} flexDirection="column" paddingX={1}>
				<Box paddingBottom={1}>
					<Text color={colors.success}>{indicators.assistant} </Text>
					<Text bold>WELCOME</Text>
				</Box>
				<Box paddingBottom={1} marginLeft={3}>
					<Text color={colors.textDim}>Start chatting by typing a message below.</Text>
				</Box>
				<Box paddingBottom={1} marginLeft={3}>
					<Text color={colors.textDim}>Useful commands:</Text>
				</Box>
				<Box paddingLeft={2} paddingBottom={1} marginLeft={3}>
					<Text color={colors.primary}>/provider</Text>
					<Text color={colors.textDim}> - Manage AI providers</Text>
				</Box>
				<Box paddingLeft={2} paddingBottom={1} marginLeft={3}>
					<Text color={colors.primary}>/help</Text>
					<Text color={colors.textDim}> - Show all available commands</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexGrow={1} flexDirection="column">
			<MessageList
				messages={messages}
				attachmentTokens={attachmentTokens}
				hideMessageTitles={hideMessageTitles}
				hideMessageUsage={hideMessageUsage}
			/>
		</Box>
	);
}

// Export without memo - useColors hook handles reactivity for theme changes
export const ChatMessages = ChatMessagesInternal;
