/**
 * Command Autocomplete Component
 * Shows command suggestions when user types /command with arguments
 */

import { Box, Text } from "ink";
import { useThemeColors } from "@sylphx/code-client";
import type { Command } from "../commands/types.js";
import Spinner from "./Spinner.js";

interface CommandAutocompleteProps {
	commands: Command[];
	selectedCommandIndex: number;
	currentlyLoading: string | null;
	loadError: string | null;
}

export function CommandAutocomplete({
	commands,
	selectedCommandIndex,
	currentlyLoading,
	loadError,
}: CommandAutocompleteProps) {
	const colors = useThemeColors();

	if (currentlyLoading) {
		return (
			<Box marginTop={1}>
				<Spinner color={colors.warning} />
				<Text color={colors.textDim}> Loading options...</Text>
			</Box>
		);
	}

	if (loadError) {
		return (
			<Box flexDirection="column" marginTop={1}>
				<Box>
					<Text color={colors.error}>Failed to load options</Text>
				</Box>
				<Box marginTop={1}>
					<Text color={colors.textDim}>{loadError}</Text>
				</Box>
			</Box>
		);
	}

	if (commands.length === 0) {
		return null;
	}

	// Calculate visible window based on selection
	const maxVisible = 5;
	const totalCommands = commands.length;

	// Center the selection in the visible window
	let startIdx = Math.max(0, selectedCommandIndex - Math.floor(maxVisible / 2));
	const endIdx = Math.min(totalCommands, startIdx + maxVisible);

	// Adjust if we're at the end
	if (endIdx === totalCommands) {
		startIdx = Math.max(0, endIdx - maxVisible);
	}

	const visibleCommands = commands.slice(startIdx, endIdx);

	return (
		<Box flexDirection="column" marginTop={1}>
			{startIdx > 0 && (
				<Box>
					<Text color={colors.textDim}> ↑ {startIdx} more above</Text>
				</Box>
			)}
			{visibleCommands.map((cmd, idx) => {
				const actualIdx = startIdx + idx;
				return (
					<Box key={cmd.id}>
						<Text
							color={actualIdx === selectedCommandIndex ? colors.success : colors.textDim}
							bold={actualIdx === selectedCommandIndex}
						>
							{actualIdx === selectedCommandIndex ? "> " : "  "}
							{cmd.label}
						</Text>
						{cmd.description && <Text color={colors.textDim}> {cmd.description}</Text>}
					</Box>
				);
			})}
			{endIdx < totalCommands && (
				<Box>
					<Text color={colors.textDim}> ↓ {totalCommands - endIdx} more below</Text>
				</Box>
			)}
		</Box>
	);
}
