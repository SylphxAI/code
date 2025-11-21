/**
 * File Autocomplete Component
 * Shows file suggestions when user types @filename
 */

import { Box, Text } from "ink";
import Spinner from "./Spinner.js";
import { getColors } from "../utils/theme/index.js";

interface FileAutocompleteProps {
	files: Array<{ path: string; relativePath: string; size: number }>;
	selectedFileIndex: number;
	filesLoading: boolean;
}

export function FileAutocomplete({
	files,
	selectedFileIndex,
	filesLoading,
}: FileAutocompleteProps) {
	const colors = getColors();

	if (filesLoading) {
		return (
			<Box marginTop={1}>
				<Spinner color={colors.warning} />
				<Text color={colors.textDim}> Loading files...</Text>
			</Box>
		);
	}

	if (files.length === 0) {
		return null;
	}

	return (
		<Box flexDirection="column" marginTop={1}>
			<Box marginBottom={1}>
				<Text color={colors.textDim}>Files (↑↓ to select, Tab/Enter to attach):</Text>
			</Box>
			{files.map((file, idx) => (
				<Box key={file.path} marginLeft={2}>
					<Text
						color={idx === selectedFileIndex ? colors.success : colors.textDim}
						bold={idx === selectedFileIndex}
					>
						{idx === selectedFileIndex ? "> " : "  "}
						{file.relativePath}
					</Text>
				</Box>
			))}
		</Box>
	);
}
