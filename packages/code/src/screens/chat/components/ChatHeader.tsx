/**
 * ChatHeader Component
 * Displays app title and current chat session title
 */

import { Box, Text } from "ink";

interface ChatHeaderProps {
	currentSessionTitle?: string;
	isTitleStreaming: boolean;
	streamingTitle: string;
}

export function ChatHeader({
	currentSessionTitle,
	isTitleStreaming,
	streamingTitle,
}: ChatHeaderProps) {
	// Get title to display (streaming takes priority)
	const title = isTitleStreaming
		? streamingTitle || currentSessionTitle
		: currentSessionTitle;

	return (
		<Box paddingX={1} paddingY={1}>
			<Text bold color="cyan">SYLPHX CODE</Text>
			{title && (
				<>
					<Text dimColor> › </Text>
					<Text color="white">{title}</Text>
				</>
			)}
		</Box>
	);
}
