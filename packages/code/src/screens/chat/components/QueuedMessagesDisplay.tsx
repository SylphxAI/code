/**
 * Queued Messages Display
 * Shows messages queued while AI is responding
 */

import { Box, Text } from "ink";
import type { QueuedMessage } from "@sylphx/code-core";
import { useThemeColors, getColors } from "@sylphx/code-client";

interface QueuedMessagesDisplayProps {
	queuedMessages: QueuedMessage[];
}

export function QueuedMessagesDisplay({ queuedMessages }: QueuedMessagesDisplayProps) {
	const colors = useThemeColors();
	if (queuedMessages.length === 0) {
		return null;
	}

	return (
		<Box flexDirection="column" paddingLeft={2} paddingBottom={1}>
			<Text color={colors.textDim}>
				Queued: ({queuedMessages.length})
			</Text>
			{queuedMessages.map((msg, idx) => (
				<Box key={msg.id} paddingLeft={1}>
					<Text color={colors.textDim}>
						{idx + 1}. {msg.content.length > 50 ? `${msg.content.substring(0, 50)}...` : msg.content}
					</Text>
				</Box>
			))}
		</Box>
	);
}
