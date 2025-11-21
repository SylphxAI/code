/**
 * ChatHeader Component
 * Displays app title and current chat session title
 */

import { Box, Text } from "ink";
import { useThemeColors, getColors } from "@sylphx/code-client";

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

	const colors = useThemeColors();

	return (
		<Box paddingX={1} paddingY={1}>
			<Text bold color={colors.primary}>SYLPHX CODE</Text>
			{title && (
				<>
					<Text color={colors.textDim}> › </Text>
					<Text color={colors.text}>{title}</Text>
				</>
			)}
		</Box>
	);
}
