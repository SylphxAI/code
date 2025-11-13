/**
 * Command Output Component
 *
 * Displays output from slash commands (like /context, /help, /notifications)
 * Shows in UI overlay instead of saving to chat history
 */

import { Box, Text } from "ink";
import { useCommandOutput, clearCommandOutput } from "@sylphx/code-client";
import { useInput } from "ink";

export function CommandOutput() {
	const commandOutput = useCommandOutput();

	// Handle ESC key to clear output
	useInput((input, key) => {
		if (key.escape && commandOutput) {
			clearCommandOutput();
		}
	});

	// Don't render if no output
	if (!commandOutput) {
		return null;
	}

	return (
		<Box flexDirection="column" paddingY={1}>
			<Box borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
				<Box flexDirection="column">
					<Text color="cyan" bold>
						Command Output
					</Text>
					<Box paddingTop={1}>
						<Text>{commandOutput}</Text>
					</Box>
					<Box paddingTop={1}>
						<Text color="gray" dimColor>
							Press ESC to close
						</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
